import React, { useState } from "react";
import { StoreInfo, DeliveryZone } from "../types";
import { useCart } from "../context/CartContext";
import { X, Trash2, Plus, Minus, Tag, AlertCircle, ShoppingBag, ArrowRight, Bike, Store } from "lucide-react";

interface CartDrawerProps {
  store: StoreInfo;
  deliveryZones: DeliveryZone[];
  onProceedToCheckout: () => void;
  primaryColor?: string;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  store,
  deliveryZones,
  onProceedToCheckout,
  primaryColor = "#FF6B00",
}) => {
  const {
    items,
    removeItem,
    updateQuantity,
    deliveryType,
    setDeliveryType,
    selectedZone,
    setSelectedZone,
    coupon,
    applyCoupon,
    removeCoupon,
    subtotalCents,
    deliveryFeeCents,
    discountCents,
    totalCents,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  if (!isCartOpen) return null;

  const minOrderMet = subtotalCents >= store.minOrderValueCents;

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setCouponLoading(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/public/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeSlug: store.slug,
          code: couponCodeInput.trim(),
          subtotalCents,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Cupom inválido.");
      }

      applyCoupon({
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountCents: data.discountCents,
      });
      setCouponCodeInput("");
    } catch (err: any) {
      setCouponError(err.message);
    } finally {
      setCouponLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div
        id="cart-drawer-panel"
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
      >
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" style={{ color: primaryColor }} />
            <h3 className="font-extrabold text-stone-900 text-base">Seu Pedido</h3>
          </div>
          <button
            id="btn-close-cart-drawer"
            onClick={() => setIsCartOpen(false)}
            className="w-8 h-8 rounded-full bg-white text-stone-600 flex items-center justify-center border border-stone-200 hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo do Carrinho */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-3">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-stone-800 text-base">Sua sacola está vazia</h4>
            <p className="text-xs text-stone-500 mt-1 max-w-xs">
              Adicione hambúrgueres artesanais, combos e bebidas deliciosas do nosso cardápio.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {/* Seletor Delivery vs Retirada */}
            <div className="bg-stone-100 p-1 rounded-xl grid grid-cols-2 gap-1 text-xs font-bold">
              <button
                type="button"
                id="btn-select-delivery"
                onClick={() => setDeliveryType("delivery")}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  deliveryType === "delivery"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Receber (Delivery)</span>
              </button>
              <button
                type="button"
                id="btn-select-pickup"
                onClick={() => setDeliveryType("pickup")}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  deliveryType === "pickup"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Retirar no Local</span>
              </button>
            </div>

            {/* Lista de Itens */}
            <div className="divide-y divide-stone-100">
              {items.map(item => (
                <div key={item.id} className="py-3.5 flex gap-3 items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-stone-900 text-sm">{item.product.name}</h4>
                      <span className="font-extrabold text-stone-900 text-xs shrink-0">
                        {(item.subtotalCents / 100).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>

                    {/* Opções Selecionadas */}
                    {item.selectedOptions.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {item.selectedOptions.map((opt, idx) => (
                          <p key={idx} className="text-[11px] text-stone-500 font-normal">
                            + {opt.optionName}
                            {opt.priceCents > 0 && (
                              <span className="text-stone-700">
                                {" "}
                                (
                                {(opt.priceCents / 100).toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                                )
                              </span>
                            )}
                          </p>
                        ))}
                      </div>
                    )}

                    {item.notes && (
                      <p className="text-[11px] text-stone-500 italic mt-1 bg-stone-50 p-1.5 rounded-md">
                        Obs: {item.notes}
                      </p>
                    )}

                    {/* Controles de Quantidade */}
                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="flex items-center border border-stone-200 rounded-lg p-0.5 bg-stone-50">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-stone-600 hover:bg-stone-200 active:scale-95"
                          aria-label="Diminuir"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-black text-stone-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-stone-600 hover:bg-stone-200 active:scale-95"
                          aria-label="Aumentar"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-stone-400 hover:text-rose-600 p-1 transition-colors"
                        title="Remover item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Inserir Cupom */}
            <div className="border-t border-stone-100 pt-3">
              {coupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-extrabold text-xs text-emerald-900">{coupon.code}</span>
                      <span className="text-[11px] text-emerald-700 block">
                        Desconto de{" "}
                        {(discountCents / 100).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-emerald-800 hover:text-emerald-950 text-xs font-bold underline"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      id="input-cart-coupon"
                      type="text"
                      placeholder="CUPOM DE DESCONTO"
                      value={couponCodeInput}
                      onChange={e => setCouponCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold uppercase placeholder:font-normal focus:bg-white focus:outline-none focus:border-stone-400"
                    />
                    <button
                      type="button"
                      id="btn-apply-coupon"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCodeInput.trim()}
                      className="px-4 py-2 bg-stone-900 hover:bg-black disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all"
                    >
                      {couponLoading ? "..." : "Aplicar"}
                    </button>
                  </div>
                  {couponError && <p className="text-[11px] text-rose-600 font-medium">{couponError}</p>}
                </div>
              )}
            </div>

            {/* Aviso de Pedido Mínimo */}
            {!minOrderMet && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  O pedido mínimo é de{" "}
                  <strong>
                    {(store.minOrderValueCents / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </strong>
                  . Adicione mais itens para continuar.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Rodapé com Totais e Botão de Checkout */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 bg-white border-t border-stone-100 space-y-3">
            <div className="space-y-1.5 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-stone-900">
                  {(subtotalCents / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Taxa de Entrega ({deliveryType === "delivery" ? "Delivery" : "Retirada"})</span>
                <span className="font-semibold text-stone-900">
                  {deliveryType === "delivery"
                    ? (deliveryFeeCents / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    : "Sem taxa"}
                </span>
              </div>

              {discountCents > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Desconto ({coupon?.code})</span>
                  <span>
                    -{" "}
                    {(discountCents / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-base font-black text-stone-900 pt-2 border-t border-stone-100">
                <span>Total</span>
                <span>
                  {(totalCents / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>
            </div>

            <button
              id="btn-go-to-checkout"
              disabled={!minOrderMet}
              onClick={() => {
                setIsCartOpen(false);
                onProceedToCheckout();
              }}
              className="w-full py-3.5 px-4 rounded-xl text-white font-extrabold text-sm shadow-md flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-98"
              style={{ backgroundColor: primaryColor }}
            >
              <span>Avançar para o Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
