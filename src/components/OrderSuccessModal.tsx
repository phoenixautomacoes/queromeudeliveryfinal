import React, { useState } from "react";
import { CheckCircle2, MessageCircle, Copy, Check, ExternalLink, ArrowRight } from "lucide-react";

interface OrderSuccessModalProps {
  orderData: any;
  onClose: () => void;
  onNavigateToTracking: (token: string) => void;
  primaryColor?: string;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  orderData,
  onClose,
  onNavigateToTracking,
  primaryColor = "#FF6B00",
}) => {
  if (!orderData) return null;

  const [copied, setCopied] = useState(false);
  const { order, pix, whatsappUrl } = orderData;

  const handleCopyPix = () => {
    if (pix?.qrCode) {
      navigator.clipboard.writeText(pix.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const formattedTotal = (order.totalCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        id="modal-order-success"
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 text-center animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Ícone de Sucesso */}
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>

        <h3 className="font-black text-2xl text-stone-900">Pedido #{order.orderNumber} Recebido!</h3>
        <p className="text-xs text-stone-500 mt-1">
          Recebemos seu pedido com sucesso no valor de <strong>{formattedTotal}</strong>.
        </p>

        {/* Informações do Pix se aplicável */}
        {pix && order.paymentStatus === "pending" && (
          <div className="mt-4 p-4 bg-stone-50 rounded-2xl border border-stone-200 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800">Pagamento via PIX</span>
              <span className="text-[11px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Aguardando Pagamento
              </span>
            </div>

            {/* QR Code Imagem */}
            {pix.qrCodeBase64 && (
              <div className="flex justify-center py-2">
                <img
                  src={pix.qrCodeBase64}
                  alt="QR Code Pix"
                  className="w-40 h-40 border border-stone-300 rounded-xl p-1 bg-white"
                />
              </div>
            )}

            {/* Pix Copia e Cola */}
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Pix Copia e Cola:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={pix.qrCode}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-[10px] text-stone-600 font-mono select-all focus:outline-none"
                />
                <button
                  id="btn-copy-pix"
                  onClick={handleCopyPix}
                  className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-black transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copiado" : "Copiar"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Botão de Enviar no WhatsApp */}
        <div className="mt-5 space-y-2.5">
          {whatsappUrl && (
            <a
              id="btn-open-whatsapp-order"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-transform active:scale-98"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Abrir Pedido no WhatsApp da Loja</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          )}

          {/* Botão de Rastreamento */}
          <button
            id="btn-go-to-tracking"
            onClick={() => {
              onClose();
              onNavigateToTracking(order.trackingToken);
            }}
            className="w-full py-3 px-4 rounded-xl text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-transform active:scale-98"
            style={{ backgroundColor: primaryColor }}
          >
            <span>Acompanhar Pedido ao Vivo</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-stone-500 hover:text-stone-800 text-xs font-semibold"
          >
            Voltar ao Cardápio
          </button>
        </div>
      </div>
    </div>
  );
};
