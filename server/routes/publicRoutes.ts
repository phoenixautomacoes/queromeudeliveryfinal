import { Router, Response } from "express";
import { getDb } from "../db";
import { CreateOrderRequestSchema } from "../types";
import { OrderService } from "../services/orderService";
import { AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

// 1. Obter Cardápio e Dados Públicos da Loja
router.get("/store/:slug", async (req, res) => {
  const db = getDb();
  const slug = req.params.slug;
  const store = db.stores.find(s => s.slug === slug && s.isActive);

  if (!store) {
    return res.status(404).json({ error: "NOT_FOUND", message: "Loja não encontrada." });
  }

  const categories = db.categories
    .filter(c => c.storeId === store.id && c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const rawProducts = db.products
    .filter(p => p.storeId === store.id && p.isAvailable)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const productsWithOptionGroups = rawProducts.map(p => {
    const optionGroups = db.productOptionGroups
      .filter(g => g.productId === p.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(g => {
        const options = db.productOptions
          .filter(o => o.groupId === g.id && o.isAvailable)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(o => ({
            id: o.id,
            name: o.name,
            priceCents: o.priceCents,
          }));
        return {
          id: g.id,
          name: g.name,
          isRequired: g.isRequired,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          options,
        };
      });

    return {
      id: p.id,
      categoryId: p.categoryId,
      name: p.name,
      slug: p.slug,
      description: p.description,
      priceCents: p.priceCents,
      promoPriceCents: p.promoPriceCents,
      badge: p.badge,
      imageUrl: p.imageUrl,
      isAvailable: p.isAvailable,
      optionGroups,
    };
  });

  const deliveryZones = db.deliveryZones
    .filter(z => z.storeId === store.id && z.isActive)
    .map(z => ({
      id: z.id,
      name: z.name,
      zipPrefix: z.zipPrefix,
      feeCents: z.feeCents,
      estimatedMinMinutes: z.estimatedMinMinutes,
      estimatedMaxMinutes: z.estimatedMaxMinutes,
    }));

  const storeHours = db.storeHours.filter(h => h.storeId === store.id);

  res.json({
    store: {
      id: store.id,
      name: store.name,
      slug: store.slug,
      description: store.description,
      businessType: store.businessType,
      logoUrl: store.logoUrl,
      coverUrl: store.coverUrl,
      primaryColor: store.primaryColor,
      whatsappNumber: store.whatsappNumber,
      addressStreet: store.addressStreet,
      addressNumber: store.addressNumber,
      addressNeighborhood: store.addressNeighborhood,
      addressCity: store.addressCity,
      addressState: store.addressState,
      addressZip: store.addressZip,
      defaultDeliveryFeeCents: store.defaultDeliveryFeeCents,
      minOrderValueCents: store.minOrderValueCents,
      estimatedTimeMin: store.estimatedTimeMin,
      estimatedTimeMax: store.estimatedTimeMax,
      pixKey: store.pixKey,
      pixKeyType: store.pixKeyType,
      isOpen: store.isOpen,
      autoOpenWhatsApp: store.autoOpenWhatsApp,
    },
    categories,
    products: productsWithOptionGroups,
    deliveryZones,
    storeHours,
  });
});

// 2. Criação Atômica de Pedido
router.post("/orders", async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = CreateOrderRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Dados do pedido inválidos.",
      details: parseResult.error.format(),
    });
  }

  const idempotencyKey = req.headers["idempotency-key"] as string | undefined;

  try {
    const result = await OrderService.createOrder(
      parseResult.data.storeSlug,
      parseResult.data,
      idempotencyKey,
      req.user?.id
    );

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({
      error: "ORDER_CREATION_FAILED",
      message: err.message || "Erro ao criar pedido.",
    });
  }
});

// 3. Consulta Pública de Rastreamento por Token Opaco (UUIDv4)
router.get("/orders/recent-tokens", (req, res) => {
  const db = getDb();
  const recentOrders = db.orders.slice(-5).map(o => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    status: o.status,
    trackingToken: o.trackingToken,
  }));
  res.json(recentOrders);
});

router.get("/orders/track/:token", (req, res) => {
  const token = req.params.token;
  if (!token) {
    return res.status(400).json({ error: "INVALID_TOKEN", message: "Token de rastreamento obrigatório." });
  }

  const trackingData = OrderService.getOrderByTrackingToken(token);
  if (!trackingData) {
    return res.status(404).json({ error: "NOT_FOUND", message: "Pedido não encontrado ou token inválido." });
  }

  res.json(trackingData);
});

// 4. Validar Cupom de Desconto
router.post("/coupons/validate", (req, res) => {
  const { storeSlug, code, subtotalCents } = req.body;
  if (!storeSlug || !code) {
    return res.status(400).json({ error: "BAD_REQUEST", message: "Loja e código são obrigatórios." });
  }

  const db = getDb();
  const store = db.stores.find(s => s.slug === storeSlug && s.isActive);
  if (!store) {
    return res.status(404).json({ error: "STORE_NOT_FOUND", message: "Loja não encontrada." });
  }

  const coupon = db.coupons.find(
    c => c.storeId === store.id && c.code.toUpperCase() === code.trim().toUpperCase() && c.isActive
  );

  if (!coupon) {
    return res.status(404).json({ error: "INVALID_COUPON", message: "Cupom não encontrado ou expirado." });
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return res.status(400).json({ error: "EXPIRED_COUPON", message: "Este cupom já expirou." });
  }

  if (subtotalCents && subtotalCents < coupon.minOrderValueCents) {
    const minFormatted = (coupon.minOrderValueCents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    return res.status(400).json({
      error: "MIN_ORDER_NOT_MET",
      message: `Este cupom requer pedido mínimo de ${minFormatted}.`,
    });
  }

  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return res.status(400).json({ error: "MAX_USES_REACHED", message: "Cupom esgotado." });
  }

  let discountCents = 0;
  if (subtotalCents) {
    if (coupon.discountType === "percentage") {
      discountCents = Math.round((subtotalCents * coupon.discountValue) / 100);
    } else {
      discountCents = Math.min(coupon.discountValue, subtotalCents);
    }
  }

  res.json({
    valid: true,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountCents,
  });
});

export default router;
