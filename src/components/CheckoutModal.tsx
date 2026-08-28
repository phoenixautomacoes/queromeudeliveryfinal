import React, { useState } from "react";
import { StoreInfo, DeliveryZone } from "../types";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { X, Bike, Store, ShieldCheck, QrCode, Banknote, CreditCard, Loader2 } from "lucide-react";

interface CheckoutModalProps {
  store: StoreInfo;
  deliveryZones: DeliveryZone[];
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (orderData: any) => void;
  primaryColor?: string;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  store,
  isOpen,
  onClose,
  onOrderSuccess,
  primaryColor = "#FF6B00",
}) => {
  const { user } = useAuth();
  const { items, deliveryType, coupon, clearCart } = useCart();

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [notes, setNotes] = useState("");

  // Endereço
  const [zip, setZip] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState(store.addressCity || "São Paulo");
  const [reference, setReference] = useState("");

  // Pagamento
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "cash" | "card_delivery" | "online_mercado_pago">("pix");
  const [changeFor, setChangeFor] = useState<string>("");

  // Termos
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [whatsappConsent, setWhatsappConsent] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Por favor, informe seu nome completo.");
      return;
    }

    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      setErrorMessage("Por favor, informe um WhatsApp válido com DDD.");
      return;
    }

    if (deliveryType === "delivery") {
      if (!zip || !street || !number || !neighborhood) {
        setErrorMessage("Por favor, preencha todos os campos obrigatórios do endereço de entrega.");
        return;
      }
    }

    if (!termsAccepted) {
      setErrorMessage("É necessário aceitar os termos de uso para concluir o pedido.");
      return;
    }

    setLoading(true);

    const idempotencyKey = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const payload = {
      storeSlug: store.slug,
      deliveryType,
      customer: {
        name: name.trim(),
        phone: phone.replace(/\D/g, ""),
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      address:
        deliveryType === "delivery"
          ? {
              zip: zip.trim(),
              street: street.trim(),
              number: number.trim(),
              complement: complement.trim() || undefined,
              neighborhood: neighborhood.trim(),
              city: city.trim(),
              state: "SP",
              reference: reference.trim() || undefined,
            }
          : undefined,
      paymentMethod,
      changeFor: paymentMethod === "cash" && changeFor ? parseFloat(changeFor) : undefined,
      couponCode: coupon ? coupon.code : undefined,
      items: items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        notes: item.notes || undefined,
        optionIds: item.selectedOptions.map(o => o.optionId),
      })),
      termsAccepted: true,
      whatsappConsent,
    };

    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Falha ao processar pedido.");
      }

      clearCart();
      onClose();
      onOrderSuccess(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        id="modal-checkout-form"
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div>
            <h3 className="font-extrabold text-stone-900 text-lg">Finalizar Pedido</h3>
            <p className="text-xs text-stone-500">
              {deliveryType === "delivery" ? "Entrega no seu endereço" : "Retirada no balcão"} • {store.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white text-stone-600 flex items-center justify-center border border-stone-200 hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmitOrder} className="overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
              {errorMessage}
            </div>
          )}

          {/* 1. Dados do Cliente */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider">
              1. Seus Dados de Contato
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nome Completo *</label>
                <input
                  id="checkout-name"
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Carlos Silva"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">WhatsApp com DDD *</label>
                <input
                  id="checkout-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Ex: (11) 99999-9999"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">E-mail (Opcional)</label>
              <input
                id="checkout-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Para receber o comprovante por e-mail"
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
              />
            </div>
          </div>

          {/* 2. Endereço de Entrega (se Delivery) */}
          {deliveryType === "delivery" && (
            <div className="border-t border-stone-100 pt-4 space-y-3">
              <h4 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5 text-stone-600" />
                2. Endereço de Entrega
              </h4>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-stone-700 mb-1">CEP *</label>
                  <input
                    id="checkout-zip"
                    type="text"
                    required
                    value={zip}
                    onChange={e => setZip(e.target.value)}
                    placeholder="01310-100"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">Rua / Avenida *</label>
                  <input
                    id="checkout-street"
                    type="text"
                    required
                    value={street}
                    onChange={e => setStreet(e.target.value)}
                    placeholder="Av. Paulista"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Número *</label>
                  <input
                    id="checkout-number"
                    type="text"
                    required
                    value={number}
                    onChange={e => setNumber(e.target.value)}
                    placeholder="1000"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">Complemento / Apto</label>
                  <input
                    id="checkout-complement"
                    type="text"
                    value={complement}
                    onChange={e => setComplement(e.target.value)}
                    placeholder="Apto 42, Bloco B"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Bairro *</label>
                  <input
                    id="checkout-neighborhood"
                    type="text"
                    required
                    value={neighborhood}
                    onChange={e => setNeighborhood(e.target.value)}
                    placeholder="Bela Vista"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Ponto de Referência</label>
                  <input
                    id="checkout-reference"
                    type="text"
                    value={reference}
                    onChange={e => setReference(e.target.value)}
                    placeholder="Próximo ao metrô"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. Forma de Pagamento */}
          <div className="border-t border-stone-100 pt-4 space-y-3">
            <h4 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider">
              3. Forma de Pagamento
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                onClick={() => setPaymentMethod("pix")}
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  paymentMethod === "pix"
                    ? "bg-stone-900 text-white border-stone-900 font-bold"
                    : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                }`}
              >
                <QrCode className="w-4 h-4" />
                <div className="text-xs">
                  <span className="block font-bold">PIX (Chave Oficial)</span>
                  <span className={`text-[10px] ${paymentMethod === "pix" ? "text-stone-300" : "text-stone-400"}`}>
                    QR Code e Copia e Cola
                  </span>
                </div>
              </label>

              <label
                onClick={() => setPaymentMethod("card_delivery")}
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  paymentMethod === "card_delivery"
                    ? "bg-stone-900 text-white border-stone-900 font-bold"
                    : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <div className="text-xs">
                  <span className="block font-bold">Cartão na Entrega</span>
                  <span className={`text-[10px] ${paymentMethod === "card_delivery" ? "text-stone-300" : "text-stone-400"}`}>
                    Débito, Crédito ou VR
                  </span>
                </div>
              </label>

              <label
                onClick={() => setPaymentMethod("cash")}
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  paymentMethod === "cash"
                    ? "bg-stone-900 text-white border-stone-900 font-bold"
                    : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                }`}
              >
                <Banknote className="w-4 h-4" />
                <div className="text-xs">
                  <span className="block font-bold">Dinheiro na Entrega</span>
                  <span className={`text-[10px] ${paymentMethod === "cash" ? "text-stone-300" : "text-stone-400"}`}>
                    Com ou sem troco
                  </span>
                </div>
              </label>
            </div>

            {paymentMethod === "cash" && (
              <div className="mt-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Precisa de troco para quanto? (Deixe em branco se tiver o valor exato)
                </label>
                <input
                  id="checkout-change"
                  type="number"
                  step="0.01"
                  value={changeFor}
                  onChange={e => setChangeFor(e.target.value)}
                  placeholder="Ex: 50.00"
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-900 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* 4. Termos e LGPD */}
          <div className="border-t border-stone-100 pt-3 space-y-2 text-xs text-stone-600">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                id="checkbox-terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={e => setTermsAccepted(e.target.checked)}
                className="mt-0.5 rounded border-stone-300 text-rose-600 focus:ring-rose-500"
              />
              <span>
                Li e aceito os <strong>Termos de Uso</strong> e a <strong>Política de Privacidade</strong> em conformidade com a LGPD.
              </span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                id="checkbox-whatsapp-consent"
                type="checkbox"
                checked={whatsappConsent}
                onChange={e => setWhatsappConsent(e.target.checked)}
                className="mt-0.5 rounded border-stone-300 text-rose-600 focus:ring-rose-500"
              />
              <span>Desejo receber atualizações do status do meu pedido pelo WhatsApp.</span>
            </label>
          </div>

          {/* Botão de Envio */}
          <div className="pt-2">
            <button
              id="btn-confirm-order-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando Pedido no Servidor...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirmar e Enviar Pedido</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
