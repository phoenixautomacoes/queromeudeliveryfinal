import { Router } from "express";
import crypto from "crypto";
import { getDb } from "../db";
import { OrderService } from "../services/orderService";
import { OrderStatus } from "../types";

const router = Router();

// 1. Webhook Mercado Pago
router.post("/mercadopago", async (req, res) => {
  const { type, data, action } = req.body;
  console.log(`🔔 [Webhook MP] Evento recebido: ${type || action}`);

  if (type === "payment" && data?.id) {
    // Processamento de pagamento confirmado
    const db = getDb();
    const externalRef = req.body.data?.external_reference;
    if (externalRef) {
      const order = db.orders.find(o => o.id === externalRef);
      if (order && order.paymentStatus !== "paid") {
        await OrderService.transitionStatus(
          order.id,
          OrderStatus.PAID,
          undefined,
          `Pagamento aprovado via Mercado Pago (ID: ${data.id})`
        );
      }
    }
  }

  res.status(200).json({ received: true });
});

// 2. Webhook n8n / Evolution API Callback
router.post("/n8n", (req, res) => {
  const signature = req.headers["x-webhook-signature"] as string;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

  if (webhookSecret && signature) {
    const computedSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (signature !== computedSig) {
      return res.status(401).json({ error: "INVALID_SIGNATURE" });
    }
  }

  console.log("🔔 [Webhook n8n] Retorno recebido com sucesso:", req.body?.eventType);
  res.json({ success: true });
});

export default router;
