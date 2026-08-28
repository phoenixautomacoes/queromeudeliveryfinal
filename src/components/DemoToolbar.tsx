import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Store,
  Shield,
  Bike,
  Navigation,
  User,
  Sparkles,
  ChevronUp,
  ChevronDown,
  LogIn,
  CheckCircle2,
  PlayCircle,
} from "lucide-react";

interface DemoToolbarProps {
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
}

export const DemoToolbar: React.FC<DemoToolbarProps> = ({ currentView, onNavigate }) => {
  const { user, login, logout } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Login rápido de 1 clique para demonstração
  const handleQuickLogin = async (role: "owner" | "driver" | "customer") => {
    setIsLoggingIn(true);
    try {
      if (role === "owner") {
        await login({ email: "dono@burgercraft.com.br", password: "BurgerCraft@2026" });
        onNavigate("admin");
      } else if (role === "driver") {
        await login({ email: "motoboy@burgercraft.com.br", password: "Motoboy@2026" });
        onNavigate("driver");
      } else if (role === "customer") {
        await login({ email: "cliente@exemplo.com.br", password: "Cliente@2026" });
        onNavigate("customer");
      }
    } catch (e) {
      console.error("Erro no login demonstrativo:", e);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-3 pointer-events-none">
      <div className="bg-stone-900/95 backdrop-blur-md text-white border border-stone-700/80 shadow-2xl rounded-2xl p-2.5 pointer-events-auto transition-all">
        {/* Cabeçalho do Toolbar */}
        <div className="flex items-center justify-between px-2 pb-1.5 border-b border-stone-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-black tracking-wide uppercase text-[10px] text-stone-300">
              Menu de Demonstração Interativa
            </span>
            {user && (
              <span className="text-[10px] bg-stone-800 text-rose-400 px-2 py-0.5 rounded-full font-bold">
                Logado: {user.name.split(" ")[0]} ({user.role})
              </span>
            )}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-stone-400 hover:text-white p-1 rounded transition-colors flex items-center gap-1 text-[10px] font-bold"
          >
            <span>{isExpanded ? "Ocultar" : "Mostrar Menus"}</span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Botões de Acesso Rápido */}
        {isExpanded && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-2">
            {/* 1. Cardápio / Loja */}
            <button
              id="demo-nav-store"
              onClick={() => onNavigate("store")}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition-all ${
                currentView === "store"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-stone-800 hover:bg-stone-700 text-stone-300"
              }`}
            >
              <Store className="w-4 h-4 mb-1" />
              <span>Cardápio</span>
            </button>

            {/* 2. Painel do Gestor (Admin) */}
            <button
              id="demo-nav-admin"
              onClick={() => handleQuickLogin("owner")}
              disabled={isLoggingIn}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition-all ${
                currentView === "admin"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-stone-800 hover:bg-stone-700 text-stone-300"
              }`}
            >
              <Shield className="w-4 h-4 mb-1 text-rose-400" />
              <span>Painel Gestor</span>
            </button>

            {/* 3. App do Motoboy */}
            <button
              id="demo-nav-driver"
              onClick={() => handleQuickLogin("driver")}
              disabled={isLoggingIn}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition-all ${
                currentView === "driver"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-stone-800 hover:bg-stone-700 text-stone-300"
              }`}
            >
              <Bike className="w-4 h-4 mb-1 text-emerald-400" />
              <span>App Motoboy</span>
            </button>

            {/* 4. Rastreamento em Tempo Real */}
            <button
              id="demo-nav-tracking"
              onClick={() => onNavigate("tracking")}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition-all ${
                currentView === "tracking"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-stone-800 hover:bg-stone-700 text-stone-300"
              }`}
            >
              <Navigation className="w-4 h-4 mb-1 text-blue-400" />
              <span>Rastreamento</span>
            </button>

            {/* 5. Área do Cliente */}
            <button
              id="demo-nav-customer"
              onClick={() => handleQuickLogin("customer")}
              disabled={isLoggingIn}
              className={`col-span-2 sm:col-span-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition-all ${
                currentView === "customer"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-stone-800 hover:bg-stone-700 text-stone-300"
              }`}
            >
              <User className="w-4 h-4 mb-1 text-purple-400" />
              <span>Minha Conta</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
