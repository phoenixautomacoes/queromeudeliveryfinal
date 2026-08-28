import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Bike, Navigation, CheckCircle2, Phone, MapPin, ArrowLeft, RefreshCw, Loader2, MessageCircle } from "lucide-react";

interface DriverPortalProps {
  onNavigate: (view: string) => void;
}

export const DriverPortal: React.FC<DriverPortalProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const [driverData, setDriverData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadAssigned = async () => {
    try {
      const res = await fetch("/api/driver/assigned-orders", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDriverData(data);
      }
    } catch (e) {
      console.error("Erro ao carregar entregas:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssigned();
    const interval = setInterval(loadAssigned, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/driver/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });
      if (res.ok) {
        loadAssigned();
      }
    } catch (e) {
      console.error("Erro ao atualizar status:", e);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-600" />
      </div>
    );
  }

  const orders = driverData?.orders || [];

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 pb-16 font-sans">
      {/* Topo */}
      <header className="bg-stone-900 text-white p-4 sticky top-0 z-20 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => onNavigate("store")} className="text-stone-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">App do Entregador</span>
              <h1 className="font-extrabold text-sm">{user?.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={loadAssigned} className="p-2 bg-stone-800 rounded-lg text-stone-300">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={logout} className="text-xs bg-rose-600 text-white font-bold px-3 py-1.5 rounded-lg">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-stone-900 text-base">Entregas Pendentes ({orders.length})</h2>
          <span className="text-xs text-stone-500 font-medium">GPS Ativo</span>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-stone-200 shadow-xs">
            <Bike className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <h3 className="font-bold text-stone-800 text-sm">Nenhuma entrega atribuída no momento</h3>
            <p className="text-xs text-stone-400 mt-1">Aguarde o despacho da cozinha/caixa.</p>
          </div>
        ) : (
          orders.map((order: any) => {
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${order.deliveryAddressStreet}, ${order.deliveryAddressNumber}, ${order.deliveryAddressNeighborhood}, ${order.deliveryAddressCity}`
            )}`;
            const waUrl = `https://wa.me/55${order.customerPhone}?text=Olá ${order.customerName}, sou o entregador do seu pedido #${order.orderNumber}!`;

            return (
              <div key={order.id} className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-black text-lg text-stone-900">Pedido #{order.orderNumber}</span>
                    <h3 className="font-bold text-sm text-stone-800">{order.customerName}</h3>
                    <p className="text-xs text-stone-500">{order.customerPhone}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-base text-stone-900">
                      {(order.totalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                    <span className="block text-[10px] text-stone-400 uppercase font-bold">
                      {order.paymentMethod}
                    </span>
                  </div>
                </div>

                {/* Endereço */}
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1">
                  <div className="flex items-start gap-1.5 font-bold text-stone-900">
                    <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>
                      {order.deliveryAddressStreet}, {order.deliveryAddressNumber}
                      {order.deliveryAddressComplement ? ` - ${order.deliveryAddressComplement}` : ""}
                    </span>
                  </div>
                  <p className="text-stone-600 pl-5">
                    {order.deliveryAddressNeighborhood} - {order.deliveryAddressCity}
                  </p>
                </div>

                {/* Ações de Navegação e Contato */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Abrir no GPS</span>
                  </a>

                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>

                {/* Ações de Transição de Status */}
                <div className="pt-2 border-t border-stone-100 flex gap-2">
                  {order.status !== "out_for_delivery" && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, "out_for_delivery")}
                      disabled={updatingId === order.id}
                      className="flex-1 py-2.5 bg-stone-900 text-white font-bold text-xs rounded-xl"
                    >
                      Iniciar Rota
                    </button>
                  )}

                  <button
                    onClick={() => handleUpdateStatus(order.id, "delivered")}
                    disabled={updatingId === order.id}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Entrega</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
};
