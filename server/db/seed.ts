import bcrypt from "bcryptjs";
import { getDb, generateId } from "./index";
import burgerCraftData from "../../data/catalogs/burger-craft.json";
import { UserRole, OrderStatus, DeliveryType, PaymentMethod } from "../types";

export async function seedDatabase() {
  const db = getDb();
  if (db.stores.length > 0) {
    return; // already seeded
  }

  console.log("🌱 [Seed] Inicializando banco de dados multiempresa Quero Meu Delivery V2...");

  // 1. Criar Usuários
  const superAdminPasswordHash = await bcrypt.hash("Admin@Phoenix2026", 10);
  const ownerPasswordHash = await bcrypt.hash("BurgerCraft@2026", 10);
  const driverPasswordHash = await bcrypt.hash("Motoboy@2026", 10);
  const customerPasswordHash = await bcrypt.hash("Cliente@2026", 10);

  const superAdminId = generateId();
  const ownerId = generateId();
  const driverUserId = generateId();
  const customerUserId = generateId();

  db.users.push(
    {
      id: superAdminId,
      email: "admin@phoenixautomacoes.com",
      name: "Super Administrador Phoenix",
      phone: "5511999999999",
      passwordHash: superAdminPasswordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: ownerId,
      email: "dono@burgercraft.com.br",
      name: "Carlos Burger (Proprietário)",
      phone: "5511988887777",
      passwordHash: ownerPasswordHash,
      role: UserRole.OWNER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: driverUserId,
      email: "motoboy@burgercraft.com.br",
      name: "Rodrigo Motoboy",
      phone: "5511977776666",
      passwordHash: driverPasswordHash,
      role: UserRole.DRIVER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: customerUserId,
      email: "cliente@exemplo.com.br",
      name: "Mariana Silva",
      phone: "5511966665555",
      passwordHash: customerPasswordHash,
      role: UserRole.CUSTOMER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  );

  // 2. Criar Loja Burger Craft
  const storeId = generateId();
  const rawStore = burgerCraftData.store;

  const store = {
    id: storeId,
    name: rawStore.name,
    slug: rawStore.slug,
    description: rawStore.description,
    businessType: rawStore.business_type,
    logoUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=300&auto=format&fit=crop&q=80",
    coverUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80",
    primaryColor: rawStore.primary_color,
    whatsappNumber: rawStore.whatsapp_number,
    addressStreet: rawStore.address_street,
    addressNumber: rawStore.address_number,
    addressNeighborhood: rawStore.address_neighborhood,
    addressCity: rawStore.address_city,
    addressState: rawStore.address_state,
    addressZip: rawStore.address_zip,
    defaultDeliveryFeeCents: Math.round(rawStore.default_delivery_fee * 100),
    minOrderValueCents: Math.round(rawStore.min_order_value * 100),
    estimatedTimeMin: rawStore.estimated_time_min,
    estimatedTimeMax: rawStore.estimated_time_max,
    pixKey: rawStore.pix_key,
    pixKeyType: rawStore.pix_key_type,
    isOpen: true,
    autoAcceptOrders: true,
    autoOpenWhatsApp: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  db.stores.push(store);

  // Vincular Proprietário à Loja
  db.storeMembers.push({
    id: generateId(),
    storeId: storeId,
    userId: ownerId,
    role: UserRole.OWNER,
    createdAt: new Date(),
  });

  // 3. Cadastrar Motorista (Driver)
  const driverId = generateId();
  db.drivers.push({
    id: driverId,
    storeId: storeId,
    userId: driverUserId,
    vehicleType: "Moto (Honda CG 160)",
    licensePlate: "BRA-2E19",
    isOnline: true,
    isActive: true,
    createdAt: new Date(),
  });

  // 4. Cadastrar Horários de Funcionamento (Seg a Dom 18:00 - 23:45)
  for (let day = 0; day <= 6; day++) {
    db.storeHours.push({
      id: generateId(),
      storeId: storeId,
      dayOfWeek: day,
      openTime: "18:00",
      closeTime: "23:45",
      isClosed: false,
    });
  }

  // 5. Cadastrar Zonas de Entrega
  for (const zone of burgerCraftData.delivery_zones) {
    db.deliveryZones.push({
      id: generateId(),
      storeId: storeId,
      name: zone.name,
      zipPrefix: zone.zip_prefix,
      feeCents: Math.round(zone.fee * 100),
      estimatedMinMinutes: zone.estimated_min,
      estimatedMaxMinutes: zone.estimated_max,
      isActive: true,
      createdAt: new Date(),
    });
  }

  // 6. Cadastrar Cupons
  for (const cup of burgerCraftData.coupons) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + cup.expires_in_days);

    db.coupons.push({
      id: generateId(),
      storeId: storeId,
      code: cup.code,
      discountType: cup.discount_type,
      discountValue: cup.discount_type === "percentage" ? cup.discount_value : Math.round(cup.discount_value * 100),
      minOrderValueCents: Math.round(cup.min_order_value * 100),
      maxUses: cup.max_uses,
      usedCount: 0,
      expiresAt: expiresAt,
      isActive: true,
      createdAt: new Date(),
    });
  }

  // 7. Cadastrar Categorias
  const categoryMap = new Map<string, string>();
  for (const cat of burgerCraftData.categories) {
    const catId = generateId();
    categoryMap.set(cat.name, catId);
    db.categories.push({
      id: catId,
      storeId: storeId,
      name: cat.name,
      slug: cat.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-"),
      sortOrder: cat.sort_order,
      isActive: true,
      createdAt: new Date(),
    });
  }

  // 8. Cadastrar Produtos e Grupos de Opções
  for (let i = 0; i < burgerCraftData.products.length; i++) {
    const prod = burgerCraftData.products[i];
    const catId = categoryMap.get(prod.category) || db.categories[0].id;
    const productId = generateId();

    db.products.push({
      id: productId,
      storeId: storeId,
      categoryId: catId,
      name: prod.name,
      slug: prod.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-"),
      description: prod.description,
      priceCents: Math.round(prod.price * 100),
      promoPriceCents: (prod as any).promo_price ? Math.round((prod as any).promo_price * 100) : null,
      badge: prod.badge || null,
      imageUrl: prod.image_url,
      isAvailable: prod.is_available,
      sortOrder: i + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Grupos de Opções
    if (prod.option_groups && Array.isArray(prod.option_groups)) {
      for (let gIdx = 0; gIdx < prod.option_groups.length; gIdx++) {
        const grp = prod.option_groups[gIdx];
        const groupId = generateId();

        db.productOptionGroups.push({
          id: groupId,
          productId: productId,
          name: grp.name,
          isRequired: grp.is_required,
          minSelect: grp.min_select,
          maxSelect: grp.max_select,
          sortOrder: gIdx + 1,
          createdAt: new Date(),
        });

        for (let optIdx = 0; optIdx < grp.options.length; optIdx++) {
          const opt = grp.options[optIdx];
          db.productOptions.push({
            id: generateId(),
            groupId: groupId,
            name: opt.name,
            priceCents: Math.round(opt.price * 100),
            isAvailable: true,
            sortOrder: optIdx + 1,
            createdAt: new Date(),
          });
        }
      }
    }
  }

  // 9. Criar Pedidos Demonstrativos com Histórico de Estados
  const sampleOrderId = generateId();
  const trackingToken1 = generateId();
  const sampleOrder = {
    id: sampleOrderId,
    storeId: storeId,
    orderNumber: 101,
    trackingToken: trackingToken1,
    status: OrderStatus.PREPARING,
    deliveryType: DeliveryType.DELIVERY,
    customerName: "Mariana Silva",
    customerPhone: "5511966665555",
    customerEmail: "mariana.silva@exemplo.com.br",
    deliveryAddress: {
      zip: "01310-100",
      street: "Av. Paulista",
      number: "1500",
      complement: "Apto 84",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      reference: "Próximo ao MASP",
    },
    subtotalCents: 3790, // 3290 + 500 bacon
    deliveryFeeCents: 500,
    discountCents: 0,
    totalCents: 4290,
    paymentMethod: PaymentMethod.PIX,
    paymentStatus: "paid",
    changeForCents: null,
    notes: "Por favor caprichar no ponto da carne!",
    createdAt: new Date(Date.now() - 25 * 60 * 1000), // 25 min atrás
    updatedAt: new Date(Date.now() - 10 * 60 * 1000),
  };
  db.orders.push(sampleOrder);

  // Item do Pedido 101
  const orderItemId = generateId();
  db.orderItems.push({
    id: orderItemId,
    orderId: sampleOrderId,
    productId: db.products[0].id,
    productName: "X-Bacon Especial Ninja",
    unitPriceCents: 3290,
    quantity: 1,
    subtotalCents: 3790,
    notes: "Bacon bem crocante",
    createdAt: new Date(Date.now() - 25 * 60 * 1000),
  });

  db.orderItemOptions.push({
    id: generateId(),
    orderItemId: orderItemId,
    optionId: generateId(),
    groupName: "Adicionais Extras",
    optionName: "Bacon extra",
    priceCents: 500,
    createdAt: new Date(Date.now() - 25 * 60 * 1000),
  });

  db.orderStatusHistory.push(
    {
      id: generateId(),
      orderId: sampleOrderId,
      fromStatus: null,
      toStatus: OrderStatus.CONFIRMED,
      changedByUserId: ownerId,
      notes: "Pedido recebido e confirmado pela loja",
      createdAt: new Date(Date.now() - 24 * 60 * 1000),
    },
    {
      id: generateId(),
      orderId: sampleOrderId,
      fromStatus: OrderStatus.CONFIRMED,
      toStatus: OrderStatus.PREPARING,
      changedByUserId: ownerId,
      notes: "Iniciado preparo na grelha",
      createdAt: new Date(Date.now() - 18 * 60 * 1000),
    }
  );

  // Pedido 102 - Pronto para Entrega / Assigned
  const sampleOrderId2 = generateId();
  const trackingToken2 = generateId();
  db.orders.push({
    id: sampleOrderId2,
    storeId: storeId,
    orderNumber: 102,
    trackingToken: trackingToken2,
    status: OrderStatus.READY,
    deliveryType: DeliveryType.DELIVERY,
    customerName: "Lucas Mendes",
    customerPhone: "5511977771234",
    customerEmail: "lucas.mendes@email.com",
    deliveryAddress: {
      zip: "01410-000",
      street: "Rua Augusta",
      number: "2200",
      complement: "",
      neighborhood: "Cerqueira César",
      city: "São Paulo",
      state: "SP",
      reference: "Interfone 12",
    },
    subtotalCents: 4190,
    deliveryFeeCents: 600,
    discountCents: 500,
    totalCents: 4290,
    paymentMethod: PaymentMethod.CARD_DELIVERY,
    paymentStatus: "pending",
    couponCode: "CRAFT5",
    notes: "",
    createdAt: new Date(Date.now() - 40 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000),
  });

  // Driver location for tracking demo
  db.driverLocations.push({
    id: generateId(),
    driverId: driverId,
    orderId: sampleOrderId,
    latitude: -23.561414,
    longitude: -46.655881,
    speed: 38.5,
    heading: 95.0,
    createdAt: new Date(),
  });

  console.log(`✅ [Seed] Base populada com sucesso! Loja: ${store.name} (${store.slug}) com ${db.products.length} produtos.`);
}
