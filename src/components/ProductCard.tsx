import React from "react";
import { Product } from "../types";
import { Plus } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  primaryColor?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  primaryColor = "#FF6B00",
}) => {
  const currentPrice = product.promoPriceCents ?? product.priceCents;
  const formattedPrice = (currentPrice / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const formattedOriginalPrice = product.promoPriceCents
    ? (product.priceCents / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })
    : null;

  return (
    <div
      id={`product-card-${product.id}`}
      onClick={() => onSelect(product)}
      className="group bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 hover:border-stone-300 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div className="flex gap-3 sm:gap-4">
        {/* Detalhes do Produto */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            {product.badge && (
              <span
                className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white mb-1.5"
                style={{ backgroundColor: primaryColor }}
              >
                {product.badge}
              </span>
            )}
            <h3 className="font-bold text-stone-900 text-sm sm:text-base leading-snug group-hover:text-stone-800 line-clamp-1">
              {product.name}
            </h3>
            {product.description && (
              <p className="text-stone-500 text-xs mt-1 line-clamp-2 leading-relaxed font-normal">
                {product.description}
              </p>
            )}
          </div>

          {/* Preços e Ação */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-stone-900 text-sm sm:text-base">
                {formattedPrice}
              </span>
              {formattedOriginalPrice && (
                <span className="text-xs text-stone-400 line-through">
                  {formattedOriginalPrice}
                </span>
              )}
            </div>

            <button
              type="button"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs transition-transform group-hover:scale-105 active:scale-95"
              style={{ backgroundColor: primaryColor }}
              aria-label={`Adicionar ${product.name}`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Imagem do Produto */}
        {product.imageUrl && (
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-stone-100 shrink-0 relative">
            <img
              src={product.imageUrl}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={e => {
                // Fallback graceful
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
