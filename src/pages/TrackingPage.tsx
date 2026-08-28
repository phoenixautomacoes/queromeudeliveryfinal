import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  ChefHat,
  Bike,
  PackageCheck,
  MapPin,
  MessageCircle,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Phone,
  Store,
} from "lucide-react";

interface TrackingPageProps {
  token: string;
  onNavigate: (view: string) => void;
}

export const TrackingPage: React.FC<TrackingPageProps> = ({ token: initialToken, onNavigate }) => {
  const [activeToken, setActiveToken] = useState<string>(initialToken || "");
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [trackingData, setTrackingData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Carregar tokens disponíveis caso o token atual não venha preenchido
  useEffect(() => {
    async function loadRecent() {
      try {
        const res = await fetch("/api/public/orders/recent-tokens");
        if (res.ok) {
          const list = await res.json();
          setAvailableOrders(list);
          if (!activeToken && list.length > 0) {
            setActiveToken(list[0].trackingToken);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadRecent();
  }, []);

  const fetchTracking = async (isManual = false) => {
    if (!activeToken) {
      setLoading(false);
      return;
    }
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`/api/public/orders/track/${activeToken}`);
      if (!res.ok) {
        throw new Error("Pedido não encontrado ou link expirado.");
      }
      const data = await res.json();
      setTrackingData(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Erro ao consultar rastreamento.");
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeToken) {
      setLoading(true);
      fetchTracking();
      const interval = setInterval(() => {
        fetchTracking();
      }, 8000); // Polling a cada 8s
      return () => clearInterval(interval);
    }
  }, [activeToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-stone-600" />
          <p className="text-sm font-bold text-stone-600">Localizando seu pedido...</p>
        </div>
      </div>
    );
  }

  if (error || !trackingData) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-3xl max-w-md w-full text-center shadow-md border border-stone-200">
          <h2 className="text-xl font-bold text-stone-900 mb-2">Pedido não encontrado</h2>
          <p className="text-xs text-stone-500 mb-4">{error}</p>
          <button
            onClick={() => onNavigate("store")}
            className="px-4 py-2.5 bg-stone-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Cardápio</span>
          </button>
        </div>
      </div>
    );
  }

  const { order, items, statusHistory, driver, latestLocation } = trackingData;

  const steps = [
    { key: "pending", label: "Recebido", icon: Clock, desc: "Aguardando confirmação" },
    { key: "preparing", label: "Em Preparo", icon: ChefHat, desc: "Cozinha preparando os itens" },
    {
      key: order.deliveryType === "delivery" ? "out_for_delivery" : "ready_for_pickup",
      label: order.deliveryType === "delivery" ? "Em Rota" : "Pronto para Retirada",
      icon: order.deliveryType === "delivery" ? Bike : Store,
      desc: order.deliveryType === "delivery" ? "Motoboy a caminho" : "Disponível no balcão",
    },
    { key: "delivered", label: "Concluído", icon: PackageCheck, desc: "Pedido entregue com sucesso" },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case "pending":
        return 0;
      case "confirmed":
      case "preparing":
        return 1;
      case "out_for_delivery":
      case "ready_for_pickup":
        return 2;
      case "delivered":
        return 3;
      case "cancelled":
        return -1;
      default:
        return 0;
    }
  };

  const currentStepIdx = getStepIndex(order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-stone-900 pb-16">
      {/* Barra de Topo */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => onNavigate("store")}
            className="flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Cardápio</span>
          </button>

          <div className="flex items-center gap-2">
            {availableOrders.length > 1 && (
              <select
                value={activeToken}
                onChange={e => setActiveToken(e.target.value)}
                className="text-xs font-bold bg-stone-100 border border-stone-300 rounded-lg px-2 py-1"
              >
                {availableOrders.map(o => (
                  <option key={o.id} value={o.trackingToken}>
                    #{o.orderNumber} ({o.customerName} - {o.status})
                  </option>
                ))}
              </select>
            )}
            <span className="text-xs font-black text-stone-900">Pedido #{order.orderNumber}</span>
            <button
              onClick={() => fetchTracking(true)}
              className={`p-1.5 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition-all ${
                refreshing ? "animate-spin" : ""
              }`}
              title="Atualizar Status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 mt-5 space-y-4">
        {/* Card de Status Principal */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs">
          <div className="text-center space-y-1 mb-6">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              Status Atual
            </span>
            <h2 className="text-2xl font-black text-stone-900">
              {isCancelled ? (
                <span className="text-rose-600">Pedido Cancelado</span>
              ) : currentStepIdx === 3 ? (
                <span className="text-emerald-600">Entregue com Sucesso! 🎉</span>
              ) : currentStepIdx === 2 ? (
                <span>{order.deliveryType === "delivery" ? "Saiu para Entrega 🛵" : "Pronto para Retirar 🛍️"}</span>
              ) : currentStepIdx === 1 ? (
                <span>Preparando seu Pedido 👨‍🍳</span>
              ) : (
                <span>Aguardando Confirmação ⏳</span>
              )}
            </h2>
            <p className="text-xs text-stone-500">
              Previsão de entrega: <strong>{order.estimatedDeliveryMin}–{order.estimatedDeliveryMax} min</strong>
            </p>
          </div>

          {/* Linha do Tempo / Stepper */}
          {!isCancelled && (
            <div className="relative flex justify-between items-start max-w-md mx-auto pt-2 pb-4">
              <div className="absolute top-5 left-6 right-6 h-0.5 bg-stone-200 -z-0" />
              <div
                className="absolute top-5 left-6 h-0.5 bg-stone-900 transition-all duration-500 -z-0"
                style={{ width: `${Math.min(100, Math.max(0, (currentStepIdx / 3) * 100))}%` }}
              />

              {steps.map((step, idx) => {
                const isPassed = currentStepIdx >= idx;
                const isCurrent = currentStepIdx === idx;
                const IconComponent = step.icon;

                return (
                  <div key={step.key} className="flex flex-col items-center relative z-10">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isCurrent
                          ? "bg-stone-900 text-white ring-4 ring-stone-900/20 scale-110 shadow-md"
                          : isPassed
                          ? "bg-stone-900 text-white"
                          : "bg-white text-stone-400 border-2 border-stone-200"
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-[11px] font-bold mt-2 text-center ${
                        isCurrent ? "text-stone-900" : isPassed ? "text-stone-700" : "text-stone-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Informações do Motoboy & Rota (se em entrega) */}
        {order.deliveryType === "delivery" && driver && (
          <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-800 font-bold">
                <Bike className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400">Entregador Designado</span>
                <h4 className="font-extrabold text-stone-900 text-sm">{driver.name}</h4>
                <p className="text-xs text-stone-500">
                  {driver.vehicleType} • Placa: {driver.licensePlate || "N/A"}
                </p>
              </div>
            </div>

            {driver.phone && (
              <a
                href={`tel:${driver.phone}`}
                className="p-2.5 bg-stone-100 hover:bg-stone-200 rounded-xl text-stone-700 transition-colors"
                title="Ligar para o motorista"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
          </div>
        )}

        {/* Resumo do Pedido e Itens */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
          <h3 className="font-extrabold text-stone-900 text-sm uppercase tracking-wider">
            Resumo dos Itens
          </h3>

          <div className="divide-y divide-stone-100">
            {items.map((item: any) => (
              <div key={item.id} className="py-2.5 flex justify-between text-xs">
                <div>
                  <span className="font-bold text-stone-900">
                    {item.quantity}x {item.productName}
                  </span>
                  {item.options && item.options.length > 0 && (
                    <div className="text-[11px] text-stone-500 space-y-0.5 mt-0.5">
                      {item.options.map((opt: any, i: number) => (
                        <p key={i}>+ {opt.optionName}</p>
                      ))}
                    </div>
                  )}
                </div>
                <span className="font-bold text-stone-900">
                  {(item.subtotalCents / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-stone-100 pt-3 space-y-1.5 text-xs text-stone-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{(order.subtotalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxa de Entrega</span>
              <span>{(order.deliveryFeeCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
            {order.discountCents > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Desconto</span>
                <span>- {(order.discountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-stone-900 pt-2 border-t border-stone-100">
              <span>Total Pago</span>
              <span>{(order.totalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
          </div>
        </div>

        {/* Endereço de Entrega */}
        {order.deliveryAddressStreet && (
          <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs flex items-start gap-3">
            <MapPin className="w-5 h-5 text-stone-500 mt-0.5 shrink-0" />
            <div className="text-xs text-stone-600">
              <span className="font-bold text-stone-900 block text-xs mb-0.5">Endereço de Entrega</span>
              <p>
                {order.deliveryAddressStreet}, {order.deliveryAddressNumber}{" "}
                {order.deliveryAddressComplement ? ` - ${order.deliveryAddressComplement}` : ""}
              </p>
              <p>
                {order.deliveryAddressNeighborhood}, {order.deliveryAddressCity} - CEP: {order.deliveryAddressZip}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
