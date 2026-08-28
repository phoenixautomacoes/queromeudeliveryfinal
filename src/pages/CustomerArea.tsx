import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { ArrowLeft, Clock, ShoppingBag, MapPin, Trash2, Shield, LogOut, CheckCircle2, Loader2 } from "lucide-react";

interface CustomerAreaProps {
  onNavigate: (view: string, params?: any) => void;
}

export const CustomerArea: React.FC<CustomerAreaProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const { addItem } = useCart();
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [oRes, aRes] = await Promise.all([
        fetch("/api/customer/orders", { credentials: "include" }),
        fetch("/api/customer/addresses", { credentials: "include" }),
      ]);
      if (oRes.ok) setOrders(await oRes.json());
      if (aRes.ok) setAddresses(await aRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteAccount = async () => {
    if (!confirm("Tem certeza que deseja excluir sua conta? Esta ação é irreversível conforme a LGPD.")) {
      return;
    }
    await fetch("/api/customer/account", { method: "DELETE", credentials: "include" });
    await logout();
    onNavigate("store");
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 pb-16 font-sans">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <button
            onClick={() => onNavigate("store")}
            className="flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Cardápio</span>
          </button>
          <button
            onClick={() => {
              logout();
              onNavigate("store");
            }}
            className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair da Conta</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6 mt-4">
        {/* Card do Usuário */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-400 font-bold uppercase">Minha Conta</span>
            <h2 className="text-xl font-black text-stone-900">{user?.name}</h2>
            <p className="text-xs text-stone-500">{user?.email} • {user?.phone}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-stone-900 text-white flex items-center justify-center font-black text-lg">
            {user?.name.substring(0, 1)}
          </div>
        </div>

        {/* Histórico de Pedidos */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-stone-900 text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-stone-600" />
            <span>Meus Pedidos Anteriores ({orders.length})</span>
          </h3>

          {loading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-xs text-stone-500 text-center py-6">Você ainda não realizou nenhum pedido nesta loja.</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {orders.map(order => (
                <div key={order.id} className="py-4 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-stone-900">Pedido #{order.orderNumber}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 uppercase">
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      {new Date(order.createdAt).toLocaleDateString("pt-BR")} às {new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <div className="text-xs text-stone-600 mt-2 space-y-0.5">
                      {order.items.map((it: any) => (
                        <p key={it.id}>• {it.quantity}x {it.productName}</p>
                      ))}
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2">
                    <span className="font-black text-sm text-stone-900">
                      {(order.totalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                    <button
                      onClick={() => onNavigate("tracking", { token: order.trackingToken })}
                      className="px-3 py-1.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl"
                    >
                      Rastrear
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Privacidade e LGPD */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <h3 className="font-extrabold text-stone-900 text-sm">Privacidade e Dados (LGPD)</h3>
          </div>
          <p className="text-xs text-stone-500 leading-relaxed">
            Seus dados são protegidos com isolamento lógico e utilizados estritamente para o processamento de pedidos e comunicação com a loja.
          </p>
          <button
            onClick={handleDeleteAccount}
            className="text-xs text-rose-600 hover:text-rose-800 font-bold underline"
          >
            Excluir minha conta e anonimizar meus dados
          </button>
        </div>
      </main>
    </div>
  );
};
