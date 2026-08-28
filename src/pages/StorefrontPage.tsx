import React, { useState, useEffect } from "react";
import { StoreInfo, Category, Product, DeliveryZone } from "../types";
import { Header } from "../components/Header";
import { CategoryNav } from "../components/CategoryNav";
import { ProductCard } from "../components/ProductCard";
import { ProductModal } from "../components/ProductModal";
import { CartDrawer } from "../components/CartDrawer";
import { CheckoutModal } from "../components/CheckoutModal";
import { OrderSuccessModal } from "../components/OrderSuccessModal";
import { AuthModal } from "../components/AuthModal";
import { useCart } from "../context/CartContext";
import { MapPin, Clock, Info, ShieldCheck, Sparkles, Loader2 } from "lucide-react";

interface StorefrontPageProps {
  storeSlug?: string;
  onNavigate: (view: string, params?: any) => void;
}

export const StorefrontPage: React.FC<StorefrontPageProps> = ({
  storeSlug = "burger-craft",
  onNavigate,
}) => {
  const [storeData, setStoreData] = useState<{
    store: StoreInfo;
    categories: Category[];
    products: Product[];
    deliveryZones: DeliveryZone[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCategoryId, setActiveCategoryId] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderSuccessData, setOrderSuccessData] = useState<any | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const { addItem, totalItemsCount, totalCents, setIsCartOpen } = useCart();

  useEffect(() => {
    async function loadStore() {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/store/${storeSlug}`);
        if (!res.ok) {
          throw new Error("Não foi possível carregar a loja.");
        }
        const data = await res.json();
        setStoreData(data);
      } catch (err: any) {
        setError(err.message || "Erro de conexão.");
      } finally {
        setLoading(false);
      }
    }
    loadStore();
  }, [storeSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-stone-600" />
          <p className="text-sm font-bold text-stone-600">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  if (error || !storeData) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl max-w-md w-full text-center shadow-md border border-stone-200">
          <h2 className="text-xl font-bold text-stone-900 mb-2">Loja não encontrada</h2>
          <p className="text-xs text-stone-500 mb-4">{error || "Verifique o endereço e tente novamente."}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const { store, categories, products, deliveryZones } = storeData;

  // Filtragem de Produtos
  const filteredProducts = products.filter(prod => {
    const matchesCategory = activeCategoryId === "all" || prod.categoryId === activeCategoryId;
    const matchesSearch =
      searchTerm.trim() === "" ||
      prod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prod.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-stone-900 pb-28">
      {/* Header Sticky */}
      <Header
        store={store}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onOpenAuth={() => setIsAuthOpen(true)}
        onNavigate={onNavigate}
      />

      {/* Banner / Hero da Loja */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="relative rounded-3xl overflow-hidden bg-stone-900 text-white min-h-[160px] sm:min-h-[220px] flex flex-col justify-end p-6 sm:p-8 shadow-sm">
          {store.coverUrl && (
            <img
              src={store.coverUrl}
              alt={store.name}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-35"
            />
          )}
          <div className="relative z-10 space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md text-white border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Artesanal & Fresco Todo Dia
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">{store.name}</h2>
            <p className="text-xs sm:text-sm text-stone-200 line-clamp-2 leading-relaxed">
              {store.description}
            </p>

            <div className="flex flex-wrap gap-4 text-xs text-stone-300 pt-1 font-medium">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{store.estimatedTimeMin}–{store.estimatedTimeMax} min</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {store.addressNeighborhood}, {store.addressCity}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Segurança de Ponta a Ponta</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Navegação por Categorias */}
      <CategoryNav
        categories={categories}
        activeCategoryId={activeCategoryId}
        onSelectCategory={setActiveCategoryId}
        primaryColor={store.primaryColor}
      />

      {/* Grade de Produtos */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200/80">
            <Info className="w-8 h-8 text-stone-400 mx-auto mb-2" />
            <h3 className="font-bold text-stone-800 text-sm">Nenhum produto encontrado</h3>
            <p className="text-xs text-stone-500 mt-1">
              Tente buscar por outro termo ou selecione outra categoria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={prod => setSelectedProduct(prod)}
                primaryColor={store.primaryColor}
              />
            ))}
          </div>
        )}
      </main>

      {/* Barra Fixa Flutuante do Carrinho no Mobile */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-30">
          <button
            id="btn-floating-cart"
            onClick={() => setIsCartOpen(true)}
            className="w-full py-3.5 px-5 rounded-2xl text-white font-extrabold text-sm shadow-xl flex items-center justify-between transition-transform active:scale-98 animate-in slide-in-from-bottom-4 duration-200"
            style={{ backgroundColor: store.primaryColor || "#FF6B00" }}
          >
            <div className="flex items-center gap-2">
              <span className="bg-white text-stone-900 text-xs font-black px-2 py-0.5 rounded-full">
                {totalItemsCount}
              </span>
              <span>Ver Sacola</span>
            </div>
            <span>
              {(totalCents / 100).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </button>
        </div>
      )}

      {/* Modal de Detalhe do Produto e Opções */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(prod, qty, opts, notes) => addItem(prod, qty, opts, notes)}
        primaryColor={store.primaryColor}
      />

      {/* Drawer Lateral do Carrinho */}
      <CartDrawer
        store={store}
        deliveryZones={deliveryZones}
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
        primaryColor={store.primaryColor}
      />

      {/* Modal Completo de Checkout */}
      <CheckoutModal
        store={store}
        deliveryZones={deliveryZones}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={data => setOrderSuccessData(data)}
        primaryColor={store.primaryColor}
      />

      {/* Modal de Sucesso com Pix & WhatsApp */}
      <OrderSuccessModal
        orderData={orderSuccessData}
        onClose={() => setOrderSuccessData(null)}
        onNavigateToTracking={token => onNavigate("tracking", { token })}
        primaryColor={store.primaryColor}
      />

      {/* Modal de Autenticação */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
};
