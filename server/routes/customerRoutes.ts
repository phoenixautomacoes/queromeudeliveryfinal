import { Router } from "express";
import { getDb, generateId } from "../db";
import { AuthenticatedRequest, requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

// 1. Histórico de Pedidos do Cliente
router.get("/orders", (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const userOrders = db.orders
    .filter(o => o.customerId === req.user.id || (o.customerEmail && o.customerEmail.toLowerCase() === req.user.email.toLowerCase()))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const enriched = userOrders.map(order => {
    const items = db.orderItems
      .filter(i => i.orderId === order.id)
      .map(item => {
        const options = db.orderItemOptions.filter(opt => opt.orderItemId === item.id);
        return { ...item, options };
      });
    return {
      ...order,
      items,
    };
  });

  res.json(enriched);
});

// 2. Livro de Endereços
router.get("/addresses", (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const customer = db.customers.find(c => c.userId === req.user.id);
  if (!customer) return res.json([]);
  const addresses = db.customerAddresses.filter(a => a.customerId === customer.id);
  res.json(addresses);
});

router.post("/addresses", (req: AuthenticatedRequest, res) => {
  const db = getDb();
  let customer = db.customers.find(c => c.userId === req.user.id);
  if (!customer) {
    customer = {
      id: generateId(),
      storeId: db.stores[0]?.id || generateId(),
      userId: req.user.id,
      name: req.user.name,
      phone: req.user.phone || "",
      email: req.user.email,
      totalOrders: 0,
      totalSpentCents: 0,
      createdAt: new Date(),
    };
    db.customers.push(customer);
  }

  const { label, zip, street, number, complement, neighborhood, city, state, reference } = req.body;
  const newAddr = {
    id: generateId(),
    customerId: customer.id,
    label: label || "Casa",
    zip,
    street,
    number,
    complement: complement || "",
    neighborhood,
    city,
    state: state || "SP",
    reference: reference || "",
    isDefault: true,
    createdAt: new Date(),
  };

  db.customerAddresses.push(newAddr);
  res.status(201).json(newAddr);
});

// 3. Exclusão de Conta / LGPD
router.delete("/account", (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const userId = req.user.id;

  // Desativa usuário e anonimiza dados sensíveis
  const user = db.users.find(u => u.id === userId);
  if (user) {
    user.isActive = false;
    user.name = "Usuário Anonimizado";
    user.email = `anon_${userId}@deleted.local`;
    user.phone = null;
  }

  // Remove sessões
  db.sessions = db.sessions.filter(s => s.userId !== userId);

  res.json({ success: true, message: "Conta excluída e dados anonimizados conforme a LGPD." });
});

export default router;
