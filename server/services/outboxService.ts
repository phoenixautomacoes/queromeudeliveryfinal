import crypto from "crypto";
import { getDb, generateId } from "../db";

export class OutboxService {
  /**
   * Adiciona um evento à fila transacional da outbox
   */
  static async addEvent(storeId: string, eventType: string, payload: any): Promise<void> {
    const db = getDb();
    db.outboxEvents.push({
      id: generateId(),
      storeId,
      eventType,
      payload,
      status: "pending",
      retryCount: 0,
      createdAt: new Date(),
    });

    // Tenta despachar de forma não bloqueante
    setImmediate(() => {
      this.dispatchPendingEvents().catch(err => {
        console.error("Erro no worker da outbox:", err);
      });
    });
  }

  /**
   * Despacha eventos pendentes para o webhook n8n com assinatura HMAC SHA-256
   */
  static async dispatchPendingEvents(): Promise<void> {
    const db = getDb();
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET || "qmd-default-hmac-secret";

    const pendingEvents = db.outboxEvents.filter(e => e.status === "pending" && e.retryCount < 5);
    if (pendingEvents.length === 0) return;

    for (const event of pendingEvents) {
      if (!webhookUrl || webhookUrl.includes("yourdomain.com")) {
        // Modo local/desenvolvimento: registra como entregue sem falha
        event.status = "delivered";
        event.processedAt = new Date();
        continue;
      }

      try {
        const payloadString = JSON.stringify({
          eventId: event.id,
          storeId: event.storeId,
          eventType: event.eventType,
          timestamp: new Date().toISOString(),
          data: event.payload,
        });

        const signature = crypto
          .createHmac("sha256", webhookSecret)
          .update(payloadString)
          .digest("hex");

        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": event.eventType,
            "X-Webhook-Id": event.id,
          },
          body: payloadString,
        });

        if (response.ok) {
          event.status = "delivered";
          event.processedAt = new Date();
        } else {
          event.retryCount += 1;
          event.lastError = `HTTP ${response.status}: ${response.statusText}`;
          if (event.retryCount >= 5) {
            event.status = "failed";
          }
        }
      } catch (err: any) {
        event.retryCount += 1;
        event.lastError = err.message;
        if (event.retryCount >= 5) {
          event.status = "failed";
        }
      }
    }
  }
}
