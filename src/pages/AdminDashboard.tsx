import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  MapPin,
  Tag,
  Settings,
  Activity,
  Printer,
  CheckCircle2,
  Clock,
  Bike,
  XCircle,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  LogOut,
  ChevronRight,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Volume2,
} from "lucide-react";

interface AdminDashboardProps {
  onNavigate: (view: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "overview" | "orders" | "catalog" | "zones" | "coupons" | "settings" | "outbox"
  >("overview");

  const [metrics, setMetrics] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<any | null>(null);
  const [outboxLogs, setOutboxLogs] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [printOrder, setPrintOrder] = useState<any | null>(null);

  // Formulário Produto
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [productForm, setProductForm] = useState<any>({
    name: "",
    categoryId: "",
    description: "",
    priceCents: 2500,
    promoPriceCents: "",
    badge: "",
    imageUrl: "",
    isAvailable: true,
  });

  // Formulário Categoria
  const [newCatName, setNewCatName] = useState("");

  // Formulário Cupom
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discountType: "fixed",
    discountValue: 1000,
    minOrderValueCents: 3000,
  });

  // Audio de Notificação
  const playAlertSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Ignorar se bloqueado pelo browser
    }
  };

  const loadData = async () => {
    try {
      const [mRes, oRes, cRes, pRes, cpRes, zRes, dRes, sRes, outRes] = await Promise.all([
        fetch("/api/admin/metrics", { credentials: "include" }),
        fetch(`/api/admin/orders?status=${statusFilter}`, { credentials: "include" }),
        fetch("/api/admin/categories", { credentials: "include" }),
        fetch("/api/admin/products", { credentials: "include" }),
        fetch("/api/admin/coupons", { credentials: "include" }),
        fetch("/api/admin/delivery-zones", { credentials: "include" }),
        fetch("/api/admin/drivers", { credentials: "include" }),
        fetch("/api/admin/store-settings", { credentials: "include" }),
        fetch("/api/admin/outbox-logs", { credentials: "include" }),
      ]);

      if (mRes.ok) setMetrics(await mRes.json());
      if (oRes.ok) setOrders(await oRes.json());
      if (cRes.ok) setCategories(await cRes.json());
      if (pRes.ok) setProducts(await pRes.json());
      if (cpRes.ok) setCoupons(await cpRes.json());
      if (zRes.ok) setDeliveryZones(await zRes.json());
      if (dRes.ok) setDrivers(await dRes.json());
      if (sRes.ok) setStoreSettings(await sRes.json());
      if (outRes.ok) setOutboxLogs(await outRes.json());
    } catch (e) {
      console.error("Erro ao carregar dados do admin:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Polling a cada 10s
    return () => clearInterval(interval);
  }, [statusFilter]);

  // Transição de Status de Pedido
  const handleUpdateStatus = async (orderId: string, status: string, driverId?: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, driverId }),
        credentials: "include",
      });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error("Erro ao atualizar status:", e);
    }
  };

  // Salvar Produto
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...productForm,
          priceCents: parseInt(productForm.priceCents, 10),
          promoPriceCents: productForm.promoPriceCents ? parseInt(productForm.promoPriceCents, 10) : null,
        }),
        credentials: "include",
      });
      if (res.ok) {
        setIsEditingProduct(false);
        setProductForm({ name: "", categoryId: "", description: "", priceCents: 2500, isAvailable: true });
        loadData();
      }
    } catch (e) {
      console.error("Erro ao salvar produto:", e);
    }
  };

  // Salvar Categoria
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName.trim() }),
      credentials: "include",
    });
    setNewCatName("");
    loadData();
  };

  // Salvar Cupom
  const handleCreateCoupon = async () => {
    if (!newCoupon.code.trim()) return;
    await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCoupon),
      credentials: "include",
    });
    setNewCoupon({ code: "", discountType: "fixed", discountValue: 1000, minOrderValueCents: 3000 });
    loadData();
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col md:flex-row text-stone-900 font-sans">
      {/* Sidebar Lateral */}
      <aside className="w-full md:w-64 bg-stone-900 text-stone-300 flex flex-col justify-between shrink-0 shadow-lg">
        <div>
          {/* Logo e Nome da Loja */}
          <div className="p-5 border-b border-stone-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                Painel Gestor V2
              </span>
              <h2 className="font-extrabold text-white text-base truncate">
                {storeSettings?.store?.name || "Quero Meu Delivery"}
              </h2>
            </div>
            <button
              onClick={playAlertSound}
              className="p-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-stone-300"
              title="Testar Som de Alerta"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {/* Menus de Navegação */}
          <nav className="p-3 space-y-1">
            <button
              id="admin-tab-overview"
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === "overview" ? "bg-rose-600 text-white shadow-xs" : "hover:bg-stone-800 text-stone-400"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Visão Geral & Métricas</span>
            </button>

            <button
              id="admin-tab-orders"
              onClick={() => setActiveTab("orders")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === "orders" ? "bg-rose-600 text-white shadow-xs" : "hover:bg-stone-800 text-stone-400"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4" />
                <span>Pedidos & Kanban</span>
              </div>
              {orders.filter(o => o.status === "pending").length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                  {orders.filter(o => o.status === "pending").length}
                </span>
              )}
            </button>

            <button
              id="admin-tab-catalog"
              onClick={() => setActiveTab("catalog")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === "catalog" ? "bg-rose-600 text-white shadow-xs" : "hover:bg-stone-800 text-stone-400"
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Cardápio & Produtos</span>
            </button>

            <button
              id="admin-tab-zones"
              onClick={() => setActiveTab("zones")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === "zones" ? "bg-rose-600 text-white shadow-xs" : "hover:bg-stone-800 text-stone-400"
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Taxas & Zonas de Entrega</span>
            </button>

            <button
              id="admin-tab-coupons"
              onClick={() => setActiveTab("coupons")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === "coupons" ? "bg-rose-600 text-white shadow-xs" : "hover:bg-stone-800 text-stone-400"
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Cupons de Desconto</span>
            </button>

            <button
              id="admin-tab-settings"
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === "settings" ? "bg-rose-600 text-white shadow-xs" : "hover:bg-stone-800 text-stone-400"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Configurações da Loja</span>
            </button>

            <button
              id="admin-tab-outbox"
              onClick={() => setActiveTab("outbox")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === "outbox" ? "bg-rose-600 text-white shadow-xs" : "hover:bg-stone-800 text-stone-400"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Notificações & Disparos</span>
            </button>
          </nav>
        </div>

        {/* Rodapé da Sidebar */}
        <div className="p-4 border-t border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center font-bold text-xs text-white">
              {user?.name.substring(0, 1)}
            </div>
            <div className="text-xs truncate">
              <span className="font-bold text-white block truncate">{user?.name}</span>
              <span className="text-[10px] text-stone-400 uppercase">{user?.role}</span>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              onNavigate("store");
            }}
            className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
            title="Sair do Painel"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Conteúdo Central */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Barra Superior */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">
              {activeTab === "overview" && "Visão Geral e Desempenho"}
              {activeTab === "orders" && "Central de Pedidos em Tempo Real"}
              {activeTab === "catalog" && "Gerenciamento de Cardápio"}
              {activeTab === "zones" && "Zonas e Taxas de Entrega"}
              {activeTab === "coupons" && "Cupons e Promoções"}
              {activeTab === "settings" && "Configurações da Loja"}
              {activeTab === "outbox" && "Notificações e Disparos Automáticos"}
            </h1>
            <p className="text-xs text-stone-500">
              {activeTab === "outbox"
                ? "Acompanhe os avisos e disparos automáticos enviados aos clientes e motoboys."
                : "Gerencie sua operação de delivery com agilidade e controle total."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate("store")}
              className="px-3 py-2 bg-white border border-stone-300 text-stone-700 text-xs font-bold rounded-xl hover:bg-stone-50 transition-colors shadow-xs"
            >
              Ver Loja Pública
            </button>
            <button
              onClick={loadData}
              className="p-2 bg-white border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 shadow-xs"
              title="Recarregar dados"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1. ABA: VISÃO GERAL */}
        {activeTab === "overview" && metrics && (
          <div className="space-y-6">
            {/* Cards de Métricas Rápidas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Faturamento Líquido</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-2xl font-black text-stone-900">
                  {(metrics.totalRevenueCents / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
                <span className="text-[11px] text-stone-400 block mt-1">Exclui pedidos cancelados</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Pedidos Válidos</span>
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-2xl font-black text-stone-900">{metrics.totalOrdersCount}</span>
                <span className="text-[11px] text-stone-400 block mt-1">
                  {metrics.cancelledOrdersCount} cancelados
                </span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Ticket Médio</span>
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-2xl font-black text-stone-900">
                  {(metrics.averageTicketCents / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
                <span className="text-[11px] text-stone-400 block mt-1">Por pedido finalizado</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Delivery vs Retirada</span>
                  <Bike className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-2xl font-black text-stone-900">
                  {metrics.deliveryTypeBreakdown.delivery} / {metrics.deliveryTypeBreakdown.pickup}
                </span>
                <span className="text-[11px] text-stone-400 block mt-1">Entregas x Balcão</span>
              </div>
            </div>

            {/* Pedidos Recentes */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
              <h3 className="font-extrabold text-stone-900 text-base mb-4">Últimos Pedidos Recebidos</h3>
              <div className="divide-y divide-stone-100">
                {orders.slice(0, 5).map(o => (
                  <div key={o.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-black text-stone-900">#{o.orderNumber}</span>
                      <span className="text-stone-500 ml-2">{o.customerName}</span>
                      <span className="text-stone-400 ml-2">({o.items.length} itens)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-stone-900">
                        {(o.totalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-stone-100 text-stone-700 uppercase">
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. ABA: PEDIDOS & KANBAN */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            {/* Filtros de Status */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: "all", label: "Todos os Pedidos" },
                { id: "pending", label: "Pendentes" },
                { id: "confirmed", label: "Confirmados" },
                { id: "preparing", label: "Em Preparo" },
                { id: "out_for_delivery", label: "Em Rota" },
                { id: "delivered", label: "Entregues" },
                { id: "cancelled", label: "Cancelados" },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    statusFilter === tab.id
                      ? "bg-stone-900 text-white"
                      : "bg-white text-stone-600 hover:bg-stone-50 border border-stone-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Lista de Pedidos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {orders.map(order => (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div>
                    {/* Cabeçalho do Pedido */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-lg text-stone-900">#{order.orderNumber}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              order.status === "pending"
                                ? "bg-amber-100 text-amber-800"
                                : order.status === "preparing"
                                ? "bg-blue-100 text-blue-800"
                                : order.status === "out_for_delivery"
                                ? "bg-purple-100 text-purple-800"
                                : order.status === "delivered"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-stone-100 text-stone-800"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-stone-700 mt-1">{order.customerName}</p>
                        <p className="text-[11px] text-stone-400">
                          {order.customerPhone} • {order.deliveryType === "delivery" ? "Delivery" : "Retirada"}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-base text-stone-900">
                          {(order.totalCents / 100).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                        <span className="block text-[10px] text-stone-400 uppercase font-bold">
                          {order.paymentMethod} • {order.paymentStatus}
                        </span>
                      </div>
                    </div>

                    {/* Itens do Pedido */}
                    <div className="mt-3 bg-stone-50 p-3 rounded-2xl border border-stone-100 space-y-1 text-xs">
                      {order.items.map((item: any) => (
                        <div key={item.id} className="flex justify-between">
                          <span>
                            <strong>{item.quantity}x</strong> {item.productName}
                          </span>
                          <span className="font-semibold text-stone-600">
                            {(item.subtotalCents / 100).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Endereço de Entrega */}
                    {order.deliveryAddressStreet && (
                      <p className="text-[11px] text-stone-500 mt-2">
                        📍 {order.deliveryAddressStreet}, {order.deliveryAddressNumber} (
                        {order.deliveryAddressNeighborhood})
                      </p>
                    )}
                  </div>

                  {/* Ações de Avanço de Status & Impressão */}
                  <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                    <button
                      onClick={() => setPrintOrder(order)}
                      className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir 80mm</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {order.status === "pending" && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, "preparing")}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                        >
                          Aceitar & Preparar
                        </button>
                      )}

                      {order.status === "preparing" && (
                        <button
                          onClick={() =>
                            handleUpdateStatus(
                              order.id,
                              order.deliveryType === "delivery" ? "out_for_delivery" : "delivered",
                              drivers[0]?.id
                            )
                          }
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl"
                        >
                          {order.deliveryType === "delivery" ? "Despachar Motoboy" : "Concluir Retirada"}
                        </button>
                      )}

                      {order.status === "out_for_delivery" && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, "delivered")}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                        >
                          Marcar como Entregue
                        </button>
                      )}

                      {order.status !== "delivered" && order.status !== "cancelled" && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, "cancelled")}
                          className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. ABA: CARDÁPIO & PRODUTOS */}
        {activeTab === "catalog" && (
          <div className="space-y-6">
            {/* Categorias */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
              <h3 className="font-extrabold text-stone-900 text-base mb-3">Categorias do Cardápio</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map(cat => (
                  <span
                    key={cat.id}
                    className="px-3 py-1.5 bg-stone-100 text-stone-800 text-xs font-bold rounded-xl border border-stone-200 flex items-center gap-2"
                  >
                    <span>{cat.name}</span>
                  </span>
                ))}
              </div>

              <div className="flex gap-2 max-w-sm">
                <input
                  type="text"
                  placeholder="Nova Categoria..."
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                />
                <button
                  onClick={handleCreateCategory}
                  className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl"
                >
                  Adicionar
                </button>
              </div>
            </div>

            {/* Produtos */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-stone-900 text-base">Produtos Cadastrados</h3>
                <button
                  onClick={() => {
                    setProductForm({
                      name: "",
                      categoryId: categories[0]?.id || "",
                      description: "",
                      priceCents: 2500,
                      isAvailable: true,
                    });
                    setIsEditingProduct(true);
                  }}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Produto</span>
                </button>
              </div>

              {isEditingProduct && (
                <form onSubmit={handleSaveProduct} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <h4 className="font-extrabold text-xs text-stone-900 uppercase">Novo / Editar Produto</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Nome do Produto *</label>
                      <input
                        type="text"
                        required
                        value={productForm.name}
                        onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                        className="w-full p-2 bg-white border border-stone-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Categoria *</label>
                      <select
                        value={productForm.categoryId}
                        onChange={e => setProductForm({ ...productForm, categoryId: e.target.value })}
                        className="w-full p-2 bg-white border border-stone-300 rounded-xl"
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Preço em Centavos (Ex: 2890 = R$ 28,90) *</label>
                      <input
                        type="number"
                        required
                        value={productForm.priceCents}
                        onChange={e => setProductForm({ ...productForm, priceCents: e.target.value })}
                        className="w-full p-2 bg-white border border-stone-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Preço Promo (Opcional)</label>
                      <input
                        type="number"
                        value={productForm.promoPriceCents || ""}
                        onChange={e => setProductForm({ ...productForm, promoPriceCents: e.target.value })}
                        className="w-full p-2 bg-white border border-stone-300 rounded-xl"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="font-bold text-stone-700 block mb-1">Descrição</label>
                      <textarea
                        rows={2}
                        value={productForm.description}
                        onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                        className="w-full p-2 bg-white border border-stone-300 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingProduct(false)}
                      className="px-3 py-1.5 bg-stone-200 text-stone-700 text-xs font-bold rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-stone-900 text-white text-xs font-bold rounded-xl"
                    >
                      Salvar Produto
                    </button>
                  </div>
                </form>
              )}

              <div className="divide-y divide-stone-100">
                {products.map(prod => (
                  <div key={prod.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-bold text-stone-900 text-sm">{prod.name}</h4>
                      <p className="text-stone-500">{prod.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-stone-900">
                        {(prod.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. ABA: CUPONS */}
        {activeTab === "coupons" && (
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-stone-900 text-base">Cupons de Desconto Ativos</h3>

            <div className="flex flex-wrap gap-2">
              {coupons.map(cp => (
                <div key={cp.id} className="p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs">
                  <span className="font-black text-stone-900 block">{cp.code}</span>
                  <span className="text-stone-500">
                    {cp.discountType === "percentage" ? `${cp.discountValue}% OFF` : `R$ ${(cp.discountValue / 100).toFixed(2)} OFF`}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-stone-100 flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="CÓDIGO (Ex: BURGER10)"
                value={newCoupon.code}
                onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
              />
              <button
                onClick={handleCreateCoupon}
                className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl"
              >
                Criar Cupom
              </button>
            </div>
          </div>
        )}

        {/* 5. ABA: NOTIFICAÇÕES & DISPAROS */}
        {activeTab === "outbox" && (
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
            <div>
              <h3 className="font-extrabold text-stone-900 text-base">Histórico de Notificações e Avisos de Pedidos</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Registro de mensagens automáticas de confirmação e atualizações de entrega enviadas em segundo plano.
              </p>
            </div>

            <div className="divide-y divide-stone-100 text-xs">
              {outboxLogs.length === 0 ? (
                <div className="py-8 text-center text-stone-400">
                  Nenhuma notificação enviada recentemente.
                </div>
              ) : (
                outboxLogs.map(log => {
                  const eventLabels: Record<string, string> = {
                    ORDER_CREATED: "Confirmação de Novo Pedido",
                    ORDER_STATUS_UPDATED: "Atualização de Status do Pedido",
                    ORDER_ACCEPTED: "Aviso de Pedido em Preparo",
                    ORDER_DISPATCHED: "Aviso de Saída para Entrega",
                    ORDER_DELIVERED: "Confirmação de Pedido Entregue",
                  };
                  const label = eventLabels[log.eventType] || log.eventType;

                  return (
                    <div key={log.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <div>
                          <span className="font-bold text-stone-900 block">{label}</span>
                          <span className="text-[11px] text-stone-400">
                            {new Date(log.createdAt || Date.now()).toLocaleTimeString("pt-BR")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          {log.status === "PROCESSED" || log.status === "SENT" || log.status === "PENDING"
                            ? "Enviado com Sucesso"
                            : log.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal de Impressão Térmica 80mm */}
      {printOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4">
            <div id="thermal-receipt" className="border border-stone-300 p-4 font-mono text-[11px] leading-tight text-stone-900 bg-white">
              <div className="text-center font-black text-xs uppercase mb-2">
                {storeSettings?.store?.name || "BURGER CRAFT"}
                <br />
                ================================
              </div>
              <div>
                PEDIDO: #{printOrder.orderNumber}
                <br />
                DATA: {new Date(printOrder.createdAt).toLocaleString("pt-BR")}
                <br />
                CLIENTE: {printOrder.customerName}
                <br />
                WHATSAPP: {printOrder.customerPhone}
                <br />
                --------------------------------
              </div>
              <div className="my-2">
                ITENS:
                <br />
                {printOrder.items.map((i: any) => (
                  <div key={i.id} className="flex justify-between">
                    <span>{i.quantity}x {i.productName}</span>
                    <span>{(i.subtotalCents / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-stone-400 pt-1 font-bold">
                TOTAL: R$ {(printOrder.totalCents / 100).toFixed(2)}
                <br />
                PAGAMENTO: {printOrder.paymentMethod.toUpperCase()}
              </div>
              {printOrder.deliveryAddressStreet && (
                <div className="border-t border-dashed border-stone-400 pt-1 text-[10px]">
                  ENTREGA:
                  <br />
                  {printOrder.deliveryAddressStreet}, {printOrder.deliveryAddressNumber}
                  <br />
                  {printOrder.deliveryAddressNeighborhood}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPrintOrder(null)}
                className="flex-1 py-2 bg-stone-200 text-stone-800 text-xs font-bold rounded-xl"
              >
                Fechar
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
