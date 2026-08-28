import { Router } from "express";
import { getDb, generateId } from "../db";
import { AuthenticatedRequest, requireAuth, requireRole } from "../middlewares/auth";
import { UserRole, OrderStatus, DriverLocationSchema } from "../types";
import { OrderService } from "../services/orderService";

const router = Router();

router.use(requireAuth);
router.use(requireRole([UserRole.DRIVER, UserRole.SUPER_ADMIN, UserRole.OWNER]));

// 1. Entregas Atribuídas ao Motoboy Logado
router.get("/assigned-orders", (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const driver = db.drivers.find(d => d.userId === req.user.id);
  if (!driver && req.user.role !== UserRole.SUPER_ADMIN) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Cadastro de motorista não encontrado." });
  }

  const driverId = driver ? driver.id : null;
  const assignments = db.driverAssignments.filter(a => !driverId || a.driverId === driverId);
  const assignedOrderIds = assignments.map(a => a.orderId);

  const orders = db.orders
    .filter(o => assignedOrderIds.includes(o.id) && o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED)
    .map(order => {
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

  res.json({ driver, orders });
});

// 2. Atualizar Status da Entrega pelo Motoboy
router.post("/orders/:id/status", async (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const orderId = req.params.id;
  const { status, notes } = req.body;

  const allowedStatuses = [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "INVALID_STATUS", message: "Status não permitido para o motorista." });
  }

  try {
    const updated = await OrderService.transitionStatus(orderId, status, req.user.id, notes);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: "STATUS_FAILED", message: err.message });
  }
});

// 3. Enviar Telemetria / Localização GPS
router.post("/location", (req: AuthenticatedRequest, res) => {
  const parseResult = DriverLocationSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: parseResult.error.format() });
  }

  const { latitude, longitude, speed, heading } = parseResult.data;
  const { orderId } = req.body;
  const db = getDb();

  const driver = db.drivers.find(d => d.userId === req.user.id);
  if (!driver) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Motorista não identificado." });
  }

  const locRecord = {
    id: generateId(),
    driverId: driver.id,
    orderId: orderId || null,
    latitude,
    longitude,
    speed: speed || 0,
    heading: heading || 0,
    createdAt: new Date(),
  };

  db.driverLocations.push(locRecord);
  res.json({ success: true, location: locRecord });
});

export default router;
