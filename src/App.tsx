import React, { useState } from "react";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { StorefrontPage } from "./pages/StorefrontPage";
import { TrackingPage } from "./pages/TrackingPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { DriverPortal } from "./pages/DriverPortal";
import { CustomerArea } from "./pages/CustomerArea";
import { DemoToolbar } from "./components/DemoToolbar";

export function App() {
  const [currentView, setCurrentView] = useState<"store" | "tracking" | "admin" | "driver" | "customer">("store");
  const [trackingToken, setTrackingToken] = useState<string>("");

  const handleNavigate = (view: string, params?: any) => {
    if (view === "tracking" && params?.token) {
      setTrackingToken(params.token);
    }
    setCurrentView(view as any);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AuthProvider>
      <CartProvider>
        {currentView === "store" && (
          <StorefrontPage storeSlug="burger-craft" onNavigate={handleNavigate} />
        )}
        {currentView === "tracking" && (
          <TrackingPage token={trackingToken} onNavigate={handleNavigate} />
        )}
        {currentView === "admin" && (
          <AdminDashboard onNavigate={handleNavigate} />
        )}
        {currentView === "driver" && (
          <DriverPortal onNavigate={handleNavigate} />
        )}
        {currentView === "customer" && (
          <CustomerArea onNavigate={handleNavigate} />
        )}

        {/* Barra de Demonstração e Troca Rápida de Perfis */}
        <DemoToolbar currentView={currentView} onNavigate={handleNavigate} />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
