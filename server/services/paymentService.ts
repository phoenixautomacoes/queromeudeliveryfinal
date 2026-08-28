import QRCode from "qrcode";
import { formatCentsToBRL } from "./whatsappService";

export interface PaymentProviderResult {
  status: "pending" | "paid" | "failed";
  providerTransactionId?: string;
  pixCopyPaste?: string;
  pixQrCodeBase64?: string;
  checkoutUrl?: string;
  message?: string;
}

export class PaymentService {
  /**
   * Gera código Pix Copia e Cola (padrão EMV simplificado/compatível) e QR Code Base64
   */
  static async generatePixPayment(
    orderNumber: number,
    totalCents: number,
    pixKey: string,
    storeName: string,
    city: string = "SAO PAULO"
  ): Promise<{ pixCopyPaste: string; pixQrCodeBase64: string }> {
    const formattedAmount = (totalCents / 100).toFixed(2);
    const sanitizedKey = pixKey.trim();
    const sanitizedName = storeName.substring(0, 25).toUpperCase();
    const sanitizedCity = city.substring(0, 15).toUpperCase();

    // Payload Pix Padrão BR Code
    const pixPayload = `00020126360014br.gov.bcb.pix0114${sanitizedKey}520400005303986540${formattedAmount.length.toString().padStart(2, "0")}${formattedAmount}5802BR59${sanitizedName.length.toString().padStart(2, "0")}${sanitizedName}60${sanitizedCity.length.toString().padStart(2, "0")}${sanitizedCity}62070503***6304`;

    let qrCodeBase64 = "";
    try {
      qrCodeBase64 = await QRCode.toDataURL(pixPayload, {
        margin: 1,
        width: 300,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
    } catch (e) {
      console.error("Erro ao gerar QR Code Pix:", e);
    }

    return {
      pixCopyPaste: pixPayload,
      pixQrCodeBase64: qrCodeBase64,
    };
  }

  /**
   * Mercado Pago Adapter (Sandbox & Webhooks)
   */
  static async createMercadoPagoPreference(order: any, store: any): Promise<PaymentProviderResult> {
    const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!mpAccessToken || mpAccessToken.startsWith("TEST-your")) {
      // Mock / Sandbox adapter quando credenciais reais não estiverem configuradas
      return {
        status: "pending",
        providerTransactionId: `mp_mock_${order.orderNumber}_${Date.now()}`,
        checkoutUrl: `${process.env.APP_URL || ""}/tracking/${order.trackingToken}?sandbox=mp`,
        message: "Mercado Pago configurado em modo sandbox/mock.",
      };
    }

    // Chamada real ao Mercado Pago quando configurado
    try {
      const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mpAccessToken}`,
        },
        body: JSON.stringify({
          items: [
            {
              title: `Pedido #${order.orderNumber} - ${store.name}`,
              quantity: 1,
              currency_id: "BRL",
              unit_price: order.totalCents / 100,
            },
          ],
          external_reference: order.id,
          notification_url: `${process.env.APP_URL}/api/webhooks/mercadopago`,
        }),
      });

      const data = await response.json();
      return {
        status: "pending",
        providerTransactionId: data.id,
        checkoutUrl: data.init_point || data.sandbox_init_point,
      };
    } catch (err: any) {
      console.error("Erro na API Mercado Pago:", err);
      return {
        status: "failed",
        message: err.message,
      };
    }
  }
}
