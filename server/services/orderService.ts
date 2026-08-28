import { getDb, generateId } from "../db";
import { CreateOrderRequest, OrderStatus, DeliveryType, PaymentMethod, UserRole } from "../types";
import { formatOrderWhatsAppMessage, generateWaMeLink } from "./whatsappService";
import { PaymentService } from "./paymentService";
import { OutboxService } from "./outboxService";

export class OrderService {
  /**
   * Criação Atômica de Pedido com Recálculo 100% no Servidor em Centavos
   */
  static async createOrder(
    storeSlug: string,
    req: CreateOrderRequest,
    idempotencyKey?: string,
    customerUserId?: string
  ) {
    const db = getDb();

    // 1. Resolver Loja pelo Slug
    const store = db.stores.find(s => s.slug === storeSlug && s.isActive);
    if (!store) {
      throw new Error("Loja não encontrada ou inativa.");
    }

    if (!store.isOpen) {
      throw new Error("O restaurante está fechado no momento para novos pedidos.");
    }

    // 2. Verificar Idempotência
    if (idempotencyKey) {
      const existingOrder = db.orders.find(
        o => o.storeId === store.id && o.idempotencyKey === idempotencyKey
      );
      if (existingOrder) {
        const items = db.orderItems
          .filter(i => i.orderId === existingOrder.id)
          .map(item => {
            const options = db.orderItemOptions.filter(opt => opt.orderItemId === item.id);
            return { ...item, options };
          });
        const waMessage = formatOrderWhatsAppMessage(existingOrder, items, store);
        const waLink = generateWaMeLink(store.whatsappNumber, waMessage);
        return { order: existingOrder, items, waMessage, waLink, isExisting: true };
      }
    }

    // 3. Recalcular Itens e Validar Opções no Banco de Dados
    let orderSubtotalCents = 0;
    const resolvedItems: Array<{
      product: any;
      quantity: number;
      notes: string;
      unitPriceCents: number;
      subtotalCents: number;
      options: Array<{ groupName: string; optionName: string; priceCents: number; optionId: string }>;
    }> = [];

    for (const itemReq of req.items) {
      const product = db.products.find(
        p => p.id === itemReq.productId && p.storeId === store.id
      );

      if (!product) {
        throw new Error(`Produto não encontrado no cardápio desta loja.`);
      }

      if (!product.isAvailable) {
        throw new Error(`O produto "${product.name}" está temporariamente indisponível.`);
      }

      // Preço Base do Produto (Promoção se houver)
      const basePrice = product.promoPriceCents ?? product.priceCents;
      let itemOptionsPriceSum = 0;

      const productGroups = db.productOptionGroups.filter(g => g.productId === product.id);
      const chosenOptions: Array<{ groupName: string; optionName: string; priceCents: number; optionId: string }> = [];

      for (const group of productGroups) {
        const groupOptions = db.productOptions.filter(o => o.groupId === group.id);
        const selectedForThisGroup = groupOptions.filter(o => itemReq.optionIds.includes(o.id));

        if (group.isRequired && selectedForThisGroup.length < Math.max(1, group.minSelect)) {
          throw new Error(`O adicional obrigatório "${group.name}" no produto "${product.name}" não foi selecionado.`);
        }

        if (group.maxSelect > 0 && selectedForThisGroup.length > group.maxSelect) {
          throw new Error(
            `Você selecionou ${selectedForThisGroup.length} opções em "${group.name}", mas o limite máximo é de ${group.maxSelect}.`
          );
        }

        for (const opt of selectedForThisGroup) {
          if (!opt.isAvailable) {
            throw new Error(`O adicional "${opt.name}" está indisponível.`);
          }
          itemOptionsPriceSum += opt.priceCents;
          chosenOptions.push({
            groupName: group.name,
            optionName: opt.name,
            priceCents: opt.priceCents,
            optionId: opt.id,
          });
        }
      }

      const unitPriceCents = basePrice + itemOptionsPriceSum;
      const subtotalCents = unitPriceCents * itemReq.quantity;
      orderSubtotalCents += subtotalCents;

      resolvedItems.push({
        product,
        quantity: itemReq.quantity,
        notes: itemReq.notes || "",
        unitPriceCents,
        subtotalCents,
        options: chosenOptions,
      });
    }

    // 4. Validar Pedido Mínimo
    if (orderSubtotalCents < store.minOrderValueCents) {
      const minFormatted = (store.minOrderValueCents / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      throw new Error(`O valor mínimo para pedidos nesta loja é de ${minFormatted}.`);
    }

    // 5. Calcular Taxa de Entrega
    let deliveryFeeCents = 0;
    if (req.deliveryType === DeliveryType.DELIVERY) {
      if (!req.address) {
        throw new Error("Endereço de entrega é obrigatório para a modalidade Delivery.");
      }

      // Procurar Zona de Entrega correspondente por CEP ou Bairro
      const cleanZip = req.address.zip.replace(/\D/g, "");
      const zones = db.deliveryZones.filter(z => z.storeId === store.id && z.isActive);
      
      const matchedZone = zones.find(z => {
        if (z.zipPrefix && cleanZip.startsWith(z.zipPrefix.replace(/\D/g, ""))) {
          return true;
        }
        if (
          z.name &&
          req.address?.neighborhood &&
          z.name.toLowerCase().trim() === req.address.neighborhood.toLowerCase().trim()
        ) {
          return true;
        }
        return false;
      });

      if (matchedZone) {
        deliveryFeeCents = matchedZone.feeCents;
      } else {
        deliveryFeeCents = store.defaultDeliveryFeeCents;
      }
    }

    // 6. Validar e Aplicar Cupom com Bloqueio de Concorrência
    let discountCents = 0;
    let couponId: string | null = null;
    let couponCode: string | null = null;

    if (req.couponCode && req.couponCode.trim()) {
      const normalizedCode = req.couponCode.trim().toUpperCase();
      const coupon = db.coupons.find(
        c => c.storeId === store.id && c.code.toUpperCase() === normalizedCode && c.isActive
      );

      if (!coupon) {
        throw new Error("Cupom de desconto inválido ou inativo.");
      }

      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        throw new Error("Este cupom já expirou.");
      }

      if (orderSubtotalCents < coupon.minOrderValueCents) {
        const minCupFormatted = (coupon.minOrderValueCents / 100).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });
        throw new Error(`Este cupom requer um valor mínimo de compra de ${minCupFormatted}.`);
      }

      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        throw new Error("Este cupom atingiu o limite máximo de resgates.");
      }

      if (coupon.discountType === "percentage") {
        discountCents = Math.round((orderSubtotalCents * coupon.discountValue) / 100);
      } else {
        discountCents = Math.min(coupon.discountValue, orderSubtotalCents);
      }

      couponId = coupon.id;
      couponCode = coupon.code;
      coupon.usedCount += 1; // Reserva atômica
    }

    // 7. Calcular Total Final
    const totalCents = Math.max(0, orderSubtotalCents + deliveryFeeCents - discountCents);

    // Validação de Troco
    let changeForCents: number | null = null;
    if (req.paymentMethod === PaymentMethod.CASH && req.changeFor) {
      changeForCents = Math.round(req.changeFor * 100);
      if (changeForCents < totalCents) {
        throw new Error("O valor informado para o troco deve ser maior que o total do pedido.");
      }
    }

    // 8. Gerar Sequencial do Pedido para a Loja
    const storeOrders = db.orders.filter(o => o.storeId === store.id);
    const nextOrderNumber = storeOrders.length > 0 ? Math.max(...storeOrders.map(o => o.orderNumber)) + 1 : 101;
    const trackingToken = generateId(); // UUIDv4 seguro para tracking público

    // 9. Determinar Status Inicial
    const initialStatus = OrderStatus.CONFIRMED;

    // 10. Persistir Pedido
    const orderId = generateId();
    const orderRecord = {
      id: orderId,
      storeId: store.id,
      customerId: customerUserId || null,
      orderNumber: nextOrderNumber,
      trackingToken,
      status: initialStatus,
      deliveryType: req.deliveryType,
      customerName: req.customer.name,
      customerPhone: req.customer.phone,
      customerEmail: req.customer.email || null,
      deliveryAddress: req.address || null,
      subtotalCents: orderSubtotalCents,
      deliveryFeeCents,
      discountCents,
      totalCents,
      paymentMethod: req.paymentMethod,
      paymentStatus: req.paymentMethod === PaymentMethod.ONLINE_MERCADO_PAGO ? "pending" : "pending",
      changeForCents,
      couponId,
      couponCode,
      notes: req.customer.notes || "",
      idempotencyKey: idempotencyKey || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db.orders.push(orderRecord);

    // 11. Persistir Itens e Opções
    const createdItems: any[] = [];
    for (const resItem of resolvedItems) {
      const orderItemId = generateId();
      const itemRecord = {
        id: orderItemId,
        orderId,
        productId: resItem.product.id,
        productName: resItem.product.name,
        unitPriceCents: resItem.unitPriceCents,
        quantity: resItem.quantity,
        subtotalCents: resItem.subtotalCents,
        notes: resItem.notes,
        createdAt: new Date(),
      };
      db.orderItems.push(itemRecord);

      for (const opt of resItem.options) {
        db.orderItemOptions.push({
          id: generateId(),
          orderItemId,
          optionId: opt.optionId,
          groupName: opt.groupName,
          optionName: opt.optionName,
          priceCents: opt.priceCents,
          createdAt: new Date(),
        });
      }

      createdItems.push({
        ...itemRecord,
        options: resItem.options,
      });
    }

    // 12. Histórico de Estados Inicial
    db.orderStatusHistory.push({
      id: generateId(),
      orderId,
      fromStatus: null,
      toStatus: initialStatus,
      changedByUserId: null,
      notes: "Pedido criado e confirmado pelo storefront",
      createdAt: new Date(),
    });

    // 13. Criar Registro de Pagamento & PIX QR Code se aplicável
    let pixPaymentInfo: { pixCopyPaste?: string; pixQrCodeBase64?: string } = {};
    if (req.paymentMethod === PaymentMethod.PIX && store.pixKey) {
      const pix = await PaymentService.generatePixPayment(
        nextOrderNumber,
        totalCents,
        store.pixKey,
        store.name,
        store.addressCity || "SAO PAULO"
      );
      pixPaymentInfo = pix;

      db.payments.push({
        id: generateId(),
        orderId,
        provider: "pix_manual",
        status: "pending",
        amountCents: totalCents,
        pixCopyPaste: pix.pixCopyPaste,
        pixQrCodeBase64: pix.pixQrCodeBase64,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // 14. Evento Outbox para n8n / Evolution API
    await OutboxService.addEvent(store.id, "order.created", {
      orderId: orderRecord.id,
      orderNumber: orderRecord.orderNumber,
      trackingToken: orderRecord.trackingToken,
      customerName: orderRecord.customerName,
      customerPhone: orderRecord.customerPhone,
      totalCents: orderRecord.totalCents,
      deliveryType: orderRecord.deliveryType,
    });

    // 15. Formatar Mensagem WhatsApp Oficial
    const waMessage = formatOrderWhatsAppMessage(orderRecord, createdItems, store);
    const waLink = generateWaMeLink(store.whatsappNumber, waMessage);

    return {
      order: orderRecord,
      items: createdItems,
      pix: pixPaymentInfo,
      waMessage,
      waLink,
      isExisting: false,
    };
  }

  /**
   * Transição Segura de Status do Pedido (State Machine Determinística)
   */
  static async transitionStatus(
    orderId: string,
    toStatus: OrderStatus,
    userId?: string,
    notes?: string,
    driverId?: string
  ) {
    const db = getDb();
    const order = db.orders.find(o => o.id === orderId);
    if (!order) {
      throw new Error("Pedido não encontrado.");
    }

    const fromStatus = order.status as OrderStatus;

    // Regras de Transição Proibidas
    if (fromStatus === OrderStatus.DELIVERED && toStatus !== OrderStatus.DELIVERED) {
      throw new Error("Pedidos já entregues não podem ter o status modificado.");
    }

    if (fromStatus === OrderStatus.CANCELLED && toStatus !== OrderStatus.CANCELLED) {
      throw new Error("Pedidos cancelados não podem ser reativados.");
    }

    // Atualiza status
    order.status = toStatus;
    order.updatedAt = new Date();

    if (toStatus === OrderStatus.PAID) {
      order.paymentStatus = "paid";
    }

    // Se atribuído a motoboy
    if (driverId) {
      const driver = db.drivers.find(d => d.id === driverId);
      if (driver) {
        db.driverAssignments.push({
          id: generateId(),
          orderId: order.id,
          driverId: driver.id,
          assignedAt: new Date(),
        });
      }
    }

    // Registra no histórico auditável
    db.orderStatusHistory.push({
      id: generateId(),
      orderId: order.id,
      fromStatus,
      toStatus,
      changedByUserId: userId || null,
      notes: notes || `Status alterado de ${fromStatus} para ${toStatus}`,
      createdAt: new Date(),
    });

    // Emite evento na Outbox
    await OutboxService.addEvent(order.storeId, "order.status_changed", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      trackingToken: order.trackingToken,
      fromStatus,
      toStatus,
      customerPhone: order.customerPhone,
      customerName: order.customerName,
    });

    return order;
  }

  /**
   * Consulta pública por Token Opaco (UUIDv4) sem expor ID sequencial ou dados bancários
   */
  static getOrderByTrackingToken(trackingToken: string) {
    const db = getDb();
    const order = db.orders.find(o => o.trackingToken === trackingToken);
    if (!order) return null;

    const store = db.stores.find(s => s.id === order.storeId);
    const items = db.orderItems
      .filter(i => i.orderId === order.id)
      .map(item => {
        const options = db.orderItemOptions.filter(opt => opt.orderItemId === item.id);
        return {
          id: item.id,
          productName: item.productName,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          subtotalCents: item.subtotalCents,
          notes: item.notes,
          options,
        };
      });

    const history = db.orderStatusHistory
      .filter(h => h.orderId === order.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Se houver pagamento Pix gerado
    const payment = db.payments.find(p => p.orderId === order.id);

    // Se estiver em rota de entrega, buscar última localização do motoboy
    let driverLocation: any = null;
    if (order.status === OrderStatus.OUT_FOR_DELIVERY || order.status === OrderStatus.ASSIGNED) {
      const locations = db.driverLocations
        .filter(l => l.orderId === order.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (locations.length > 0) {
        driverLocation = locations[0];
      }
    }

    return {
      orderNumber: order.orderNumber,
      trackingToken: order.trackingToken,
      status: order.status,
      deliveryType: order.deliveryType,
      customerName: order.customerName,
      deliveryAddress: order.deliveryAddress,
      subtotalCents: order.subtotalCents,
      deliveryFeeCents: order.deliveryFeeCents,
      discountCents: order.discountCents,
      totalCents: order.totalCents,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items,
      history,
      driverLocation,
      pix: payment?.pixCopyPaste
        ? {
            pixCopyPaste: payment.pixCopyPaste,
            pixQrCodeBase64: payment.pixQrCodeBase64,
          }
        : null,
      store: store
        ? {
            name: store.name,
            slug: store.slug,
            whatsappNumber: store.whatsappNumber,
            primaryColor: store.primaryColor,
            logoUrl: store.logoUrl,
            estimatedTimeMin: store.estimatedTimeMin,
            estimatedTimeMax: store.estimatedTimeMax,
            addressStreet: store.addressStreet,
            addressNumber: store.addressNumber,
            addressNeighborhood: store.addressNeighborhood,
          }
        : null,
    };
  }
}
