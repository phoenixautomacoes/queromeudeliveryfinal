import React from "react";
import { Category } from "../types";

interface CategoryNavProps {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  primaryColor?: string;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
  primaryColor = "#FF6B00",
}) => {
  return (
    <div className="sticky top-[108px] z-20 bg-stone-50/95 backdrop-blur-xs border-b border-stone-200/80 py-2.5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar no-scrollbar pb-1">
          <button
            id="cat-tab-all"
            onClick={() => onSelectCategory("all")}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeCategoryId === "all"
                ? "text-white shadow-xs"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/60"
            }`}
            style={{
              backgroundColor: activeCategoryId === "all" ? primaryColor : undefined,
            }}
          >
            Todos os Itens
          </button>

          {categories.map(cat => {
            const isActive = activeCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                id={`cat-tab-${cat.id}`}
                onClick={() => onSelectCategory(cat.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? "text-white shadow-xs"
                    : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/60"
                }`}
                style={{
                  backgroundColor: isActive ? primaryColor : undefined,
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
