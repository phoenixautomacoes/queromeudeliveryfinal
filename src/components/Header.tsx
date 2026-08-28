import React from "react";
import { StoreInfo } from "../types";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { ShoppingBag, Clock, MapPin, User as UserIcon, Shield, Bike, Search } from "lucide-react";

interface HeaderProps {
  store: StoreInfo;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onOpenAuth: () => void;
  onNavigate: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  store,
  searchTerm,
  setSearchTerm,
  onOpenAuth,
  onNavigate,
}) => {
  const { totalItemsCount, totalCents, setIsCartOpen } = useCart();
  const { user } = useAuth();

  const formattedTotal = (totalCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      {/* Barra de Status e Info da Loja */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo e Nome */}
          <div
            id="store-header-brand"
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => onNavigate("store")}
          >
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={store.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover shadow-xs border border-stone-100"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-xs"
                style={{ backgroundColor: store.primaryColor || "#FF6B00" }}
              >
                {store.name.substring(0, 2).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg sm:text-xl text-stone-900 tracking-tight">
                  {store.name}
                </h1>
                {store.isOpen ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    Aberto
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                    Fechado
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 hidden sm:block">
                {store.businessType} • {store.estimatedTimeMin}–{store.estimatedTimeMax} min
              </p>
            </div>
          </div>

          {/* Ações e Navegação */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Atalho Painel Admin se autorizado */}
            {user && ["super_admin", "owner", "manager", "kitchen", "cashier"].includes(user.role) && (
              <button
                id="btn-nav-admin"
                onClick={() => onNavigate("admin")}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
              >
                <Shield className="w-4 h-4 text-rose-600" />
                Painel
              </button>
            )}

            {/* Atalho Motoboy */}
            {user && (user.role === "driver" || user.role === "super_admin") && (
              <button
                id="btn-nav-driver"
                onClick={() => onNavigate("driver")}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
              >
                <Bike className="w-4 h-4 text-emerald-600" />
                Entregas
              </button>
            )}

            {/* Botão Perfil / Login */}
            <button
              id="btn-nav-auth"
              onClick={user ? () => onNavigate("customer") : onOpenAuth}
              className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors flex items-center gap-1.5"
              title={user ? `Logado como ${user.name}` : "Fazer Login"}
            >
              <UserIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{user ? user.name.split(" ")[0] : "Entrar"}</span>
            </button>

            {/* Botão Carrinho com Badge */}
            <button
              id="btn-open-cart-header"
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-white font-bold text-sm shadow-sm transition-transform active:scale-95"
              style={{ backgroundColor: store.primaryColor || "#FF6B00" }}
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">{formattedTotal}</span>
              {totalItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-stone-900 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  {totalItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Barra de Busca de Produtos */}
        <div className="mt-3 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            id="input-product-search"
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar lanches, combos, bebidas, porções..."
            className="w-full pl-10 pr-4 py-2 bg-stone-100/80 hover:bg-stone-100 focus:bg-white text-sm text-stone-900 placeholder:text-stone-400 rounded-xl border border-transparent focus:border-stone-300 focus:outline-none transition-all"
          />
        </div>
      </div>
    </header>
  );
};
