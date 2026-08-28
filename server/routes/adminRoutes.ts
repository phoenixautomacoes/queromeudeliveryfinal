import { Router } from "express";
import { getDb, generateId } from "../db";
import { AuthenticatedRequest, requireAuth, requireRole } from "../middlewares/auth";
import { UserRole, OrderStatus, UpdateOrderStatusSchema } from "../types";
import { OrderService } from "../services/orderService";

const router = Router();

// Todas as rotas administrativas requerem autenticação e papel administrativo
router.use(requireAuth);
router.use(requireRole([UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.KITCHEN, UserRole.CASHIER]));

// Helper para obter a loja do usuário autenticado
function getAdminStoreId(req: AuthenticatedRequest): string {
  const db = getDb();
  if (req.user?.role === UserRole.SUPER_ADMIN && req.query.storeId) {
    return req.query.storeId as string;
  }
  const member = db.storeMembers.find(m => m.userId === req.user?.id);
  if (member) {
    return member.storeId;
  }
  // Fallback para primeira loja cadastrada se super admin
  if (db.stores.length > 0) {
    return db.stores[0].id;
  }
  throw new Error("Nenhuma loja vinculada encontrada.");
}

// 1. Métricas do Dashboard
router.get("/metrics", (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const storeId = getAdminStoreId(req);

  const orders = db.orders.filter(o => o.storeId === storeId);
  const validOrders = orders.filter(
    o => o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.REFUNDED
  );

  const totalRevenueCents = validOrders.reduce((sum, o) => sum + o.totalCents, 0);
  const totalOrdersCount = validOrders.length;
  const averageTicketCents = totalOrdersCount > 0 ? Math.round(totalRevenueCents / totalOrdersCount) : 0;

  const statusBreakdown: Record<string, number> = {};
  for (const o of orders) {
    statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
  }

  const deliveryTypeBreakdown = {
    delivery: validOrders.filter(o => o.deliveryType === "delivery").length,
    pickup: validOrders.filter(o => o.deliveryType === "pickup").length,
  };

  const paymentMethodBreakdown: Record<string, number> = {};
  for (const o of validOrders) {
    paymentMethodBreakdown[o.paymentMethod] = (paymentMethodBreakdown[o.paymentMethod] || 0) + 1;
  }

  res.json({
    totalRevenueCents,
    totalOrdersCount,
    averageTicketCents,
    statusBreakdown,
    deliveryTypeBreakdown,
    paymentMethodBreakdown,
    cancelledOrdersCount: orders.filter(o => o.status === OrderStatus.CANCELLED).length,
  });
});

// 2. Listagem de Pedidos com Filtros
router.get("/orders", (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const storeId = getAdminStoreId(req);
  const statusFilter = req.query.status as string;

  let storeOrders = db.orders
    .filter(o => o.storeId === storeId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (statusFilter && statusFilter !== "all") {
    storeOrders = storeOrders.filter(o => o.status === statusFilter);
  }

  const enrichedOrders = storeOrders.map(order => {
    const items = db.orderItems
      .filter(i => i.orderId === order.id)
      .map(item => {
        const options = db.orderItemOptions.filter(opt => opt.orderItemId === item.id);
        return { ...item, options };
      });

    const history = db.orderStatusHistory
      .filter(h => h.orderId === order.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const driverAssignment = db.driverAssignments.find(a => a.orderId === order.id);
    let driverName: string | null = null;
    if (driverAssignment) {
      const driver = db.drivers.find(d => d.id === driverAssignment.driverId);
      if (driver) {
        const driverUser = db.users.find(u => u.id === driver.userId);
        driverName = driverUser?.name || "Motoboy";
      }
    }

    return {
      ...order,
      items,
      history,
      driverName,
    };
  });

  res.json(enrichedOrders);
});

// 3. Atualizar Status do Pedido
router.patch("/orders/:id/status", async (req: AuthenticatedRequest, res) => {
  const parseResult = UpdateOrderStatusSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: parseResult.error.format() });
  }

  const orderId = req.params.id;
  const { status, driverId, notes } = parseResult.data;

  try {
    const updated = await OrderService.transitionStatus(
      orderId,
      status,
      req.user.id,
      notes,
      driverId
    );
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: "STATUS_TRANSITION_FAILED", message: err.message });
  }
});

// 4. Categorias CRUD
router.get("/categories", (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const storeId = getAdminStoreId(req);
  const categories = db.categories
    .filter(c => c.storeId === storeId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  res.json(categories);
});

router.post("/categories", (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const storeId = getAdminStoreId(req);
  const { name, sortOrder, isActive } = req.body;

  if (!name) return res.status(400).json({ error: "Nome obrigatório." });

  const catId = req.body.id || generateId();
  const existingIdx = db.categories.findIndex(c => c.id === catId);

  const catData = {
    id: catId,
    storeId,
    name,
    slug: name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-"),
    sortOrder: sortOrder || 0,
    isActive: isActive !== undefined ? isActive : true,
    createdAt: new Date(),
  };

  if (existingIdx >= 0) {
    db.categories[existingIdx] = { ...db.categories[existingIdx], ...catData };
  } else {
    db.categories.push(catData);
  }

  res.json(catData);
});

router.delete("/categories/:id", (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const id = req.params.id;
  db.categories = db.categories.filter(c => c.id !== id);
  res.json({ success: true });
});

// 5. Produtos e Grupos de Opções CRUD
router.get("/products", (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const storeId = getAdminStoreId(req);

  const prods = db.products
    .filter(p => p.storeId === storeId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(p => {
      const optionGroups = db.productOptionGroups
        .filter(g => g.productId === p.id)
        .map(g => {
          const options = db.productOptions.filter(o => o.groupId === g.id);
          return { ...g, options };
        });
      return { ...p, optionGroups };
    });

  res.json(prods);
});

router.post("/products", (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const storeId = getAdminStoreId(req);
  const { id, categoryId, name, description, priceCents, promoPriceCents, badge, imageUrl, isAvailable, sortOrder, optionGroups } = req.body;

  if (!name || priceCents === undefined || !categoryId) {
    return res.status(400).json({ error: "Nome, Categoria e Preço são obrigatórios." });
  }

  const prodId = id || generateId();
  const existingIdx = db.products.findIndex(p => p.id === prodId);

  const prodRecord = {
    id: prodId,
    storeId,
    categoryId,
    name,
    slug: name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-"),
    description: description || "",
    priceCents: parseInt(priceCents, 10),
    promoPriceCents: promoPriceCents ? parseInt(promoPriceCents, 10) : null,
    badge: badge || null,
    imageUrl: imageUrl || "",
    isAvailable: isAvailable !== undefined ? isAvailable : true,
    sortOrder: sortOrder || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (existingIdx >= 0) {
    db.products[existingIdx] = prodRecord;
  } else {
    db.products.push(prodRecord);
  }

  // Atualizar grupos de opções se enviados
  if (Array.isArray(optionGroups)) {
    // Remover antigos
    const oldGroups = db.productOptionGroups.filter(g => g.productId === prodId);
    for (const g of oldGroups) {
      db.productOptions = db.productOptions.filter(o => o.groupId !== g.id);
    }
    db.productOptionGroups = db.productOptionGroups.filter(g => g.productId !== prodId);

    // Inserir novos
    for (let gIdx = 0; gIdx < optionGroups.length; gIdx++) {
      const grp = optionGroups[gIdx];
      const groupId = generateId();
      db.productOptionGroups.push({
        id: groupId,
        productId: prodId,
        name: grp.name,
        isRequired: !!grp.isRequired,
        minSelect: grp.minSelect || 0,
        maxSelect: grp.maxSelect || 1,
        sortOrder: gIdx + 1,
        createdAt: new Date(),
      });

      if (Array.isArray(grp.options)) {
        for (let oIdx = 0; oIdx < grp.options.length; oIdx++) {
          const opt = grp.options[oIdx];
          db.productOptions.push({
            id: generateId(),
            groupId,
            name: opt.name,
            priceCents: opt.priceCents || 0,
            isAvailable: opt.isAvailable !== undefined ? opt.isAvailable : true,
            sortOrder: oIdx + 1,
            createdAt: new Date(),
          });
        }
      }
    }
  }

  res.json(prodRecord);
});

router.delete("/products/:id", (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const id = req.params.id;
  db.products = db.products.filter(p => p.id !== id);
  res.json({ success: true });
});

// 6. Cupons CRUD
router.get("/coupons", (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const storeId = getAdminStoreId(req);
  res.json(db.coupons.filter(c => c.storeId === storeId));
});

router.post("/coupons", (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const storeId = getAdminStoreId(req);
  const { code, discountType, discountValue, minOrderValueCents, maxUses, expiresAt, isActive } = req.body;

  if (!code || !discountType || discountValue === undefined) {
    return res.status(400).json({ error: "Código, tipo e valor são obrigatórios." });
  }

  const couponId = req.body.id || generateId();
  const existingIdx = db.coupons.findIndex(c => c.id === couponId);

  const couponRecord = {
    id: couponId,
    storeId,
    code: code.trim().toUpperCase(),
    discountType,
    discountValue: parseInt(discountValue, 10),
    minOrderValueCents: minOrderValueCents ? parseInt(minOrderValueCents, 10) : 0,
    maxUses: maxUses ? parseInt(maxUses, 10) : null,
    usedCount: 0,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    isActive: isActive !== undefined ? isActive : true,
    createdAt: new Date(),
  };

  if (existingIdx >= 0) {
    db.coupons[existingIdx] = { ...db.coupons[existingIdx], ...couponRecord };
  } else {
    db.coupons.push(couponRecord);
  }

  res.json(couponRecord);
});

// 7. Zonas de Entrega CRUD
router.get("/delivery-zones", (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const storeId = getAdminStoreId(req);
  res.json(db.deliveryZones.filter(z => z.storeId === storeId));
});

router.post("/delivery-zones", (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const storeId = getAdminStoreId(req);
  const { name, zipPrefix, feeCents, estimatedMinMinutes, estimatedMaxMinutes, isActive } = req.body;

  if (!name || feeCents === undefined) {
    return res.status(400).json({ error: "Nome e Taxa são obrigatórios." });
  }

  const zoneId = req.body.id || generateId();
  const existingIdx = db.deliveryZones.findIndex(z => z.id === zoneId);

  const zoneRecord = {
    id: zoneId,
    storeId,
    name,
    zipPrefix: zipPrefix || null,
    feeCents: parseInt(feeCents, 10),
    estimatedMinMinutes: estimatedMinMinutes ? parseInt(estimatedMinMinutes, 10) : 30,
    estimatedMaxMinutes: estimatedMaxMinutes ? parseInt(estimatedMaxMinutes, 10) : 50,
    isActive: isActive !== undefined ? isActive : true,
    createdAt: new Date(),
  };

  if (existingIdx >= 0) {
    db.deliveryZones[existingIdx] = { ...db.deliveryZones[existingIdx], ...zoneRecord };
  } else {
    db.deliveryZones.push(zoneRecord);
  }

  res.json(zoneRecord);
});

// 8. Configurações da Loja
router.get("/store-settings", (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const storeId = getAdminStoreId(req);
  const store = db.stores.find(s => s.id === storeId);
  const hours = db.storeHours.filter(h => h.storeId === storeId);
  res.json({ store, hours });
});

router.put("/store-settings", (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const storeId = getAdminStoreId(req);
  const storeIdx = db.stores.findIndex(s => s.id === storeId);
  if (storeIdx < 0) return res.status(404).json({ error: "Loja não encontrada." });

  const { store, hours } = req.body;

  if (store) {
    db.stores[storeIdx] = {
      ...db.stores[storeIdx],
      name: store.name || db.stores[storeIdx].name,
      description: store.description,
      primaryColor: store.primaryColor || db.stores[storeIdx].primaryColor,
      whatsappNumber: store.whatsappNumber || db.stores[storeIdx].whatsappNumber,
      defaultDeliveryFeeCents: store.defaultDeliveryFeeCents !== undefined ? store.defaultDeliveryFeeCents : db.stores[storeIdx].defaultDeliveryFeeCents,
      minOrderValueCents: store.minOrderValueCents !== undefined ? store.minOrderValueCents : db.stores[storeIdx].minOrderValueCents,
      estimatedTimeMin: store.estimatedTimeMin || db.stores[storeIdx].estimatedTimeMin,
      estimatedTimeMax: store.estimatedTimeMax || db.stores[storeIdx].estimatedTimeMax,
      pixKey: store.pixKey,
      pixKeyType: store.pixKeyType,
      isOpen: store.isOpen !== undefined ? store.isOpen : db.stores[storeIdx].isOpen,
      autoOpenWhatsApp: store.autoOpenWhatsApp !== undefined ? store.autoOpenWhatsApp : db.stores[storeIdx].autoOpenWhatsApp,
      addressStreet: store.addressStreet,
      addressNumber: store.addressNumber,
      addressNeighborhood: store.addressNeighborhood,
      addressCity: store.addressCity,
      updatedAt: new Date(),
    };
  }

  if (Array.isArray(hours)) {
    db.storeHours = db.storeHours.filter(h => h.storeId !== storeId);
    for (const h of hours) {
      db.storeHours.push({
        id: generateId(),
        storeId,
        dayOfWeek: h.dayOfWeek,
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: !!h.isClosed,
      });
    }
  }

  res.json({ success: true, store: db.stores[storeIdx] });
});

// 9. Motoboys (Drivers) CRUD
router.get("/drivers", (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const storeId = getAdminStoreId(req);
  const storeDrivers = db.drivers.filter(d => d.storeId === storeId);
  const driversList = storeDrivers.map(d => {
    const user = db.users.find(u => u.id === d.userId);
    return {
      id: d.id,
      name: user?.name || "Sem Nome",
      email: user?.email || "",
      phone: user?.phone || "",
      vehicleType: d.vehicleType,
      licensePlate: d.licensePlate,
      isOnline: d.isOnline,
      isActive: d.isActive,
    };
  });
  res.json(driversList);
});

// 10. Logs da Outbox & Auditoria
router.get("/outbox-logs", (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const storeId = getAdminStoreId(req);
  const logs = db.outboxEvents
    .filter(e => e.storeId === storeId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);
  res.json(logs);
});

export default router;
