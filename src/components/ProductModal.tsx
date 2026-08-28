import React, { useState, useEffect } from "react";
import { Product, ProductOption } from "../types";
import { X, Plus, Minus, Check } from "lucide-react";

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, selectedOptions: any[], notes: string) => void;
  primaryColor?: string;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  onClose,
  onAddToCart,
  primaryColor = "#FF6B00",
}) => {
  if (!product) return null;

  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  // Selected options map: groupId -> Set of option objects
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, ProductOption[]>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setQuantity(1);
    setNotes("");
    setValidationError(null);

    // Pré-selecionar opções obrigatórias simples de 1 escolha se houver apenas 1 opção
    const initialMap: Record<string, ProductOption[]> = {};
    if (product.optionGroups) {
      product.optionGroups.forEach(grp => {
        if (grp.isRequired && grp.maxSelect === 1 && grp.options.length === 1) {
          initialMap[grp.id] = [grp.options[0]];
        } else {
          initialMap[grp.id] = [];
        }
      });
    }
    setSelectedOptionsMap(initialMap);
  }, [product]);

  const toggleOption = (groupId: string, option: ProductOption, maxSelect: number) => {
    setValidationError(null);
    setSelectedOptionsMap(prev => {
      const current = prev[groupId] || [];
      const exists = current.some(o => o.id === option.id);

      if (exists) {
        return {
          ...prev,
          [groupId]: current.filter(o => o.id !== option.id),
        };
      }

      if (maxSelect === 1) {
        // Escolha única
        return {
          ...prev,
          [groupId]: [option],
        };
      }

      if (current.length >= maxSelect) {
        // Limite atingido
        return prev;
      }

      return {
        ...prev,
        [groupId]: [...current, option],
      };
    });
  };

  // Cálculo de Preço Total do Item
  const basePrice = product.promoPriceCents ?? product.priceCents;
  const allSelectedOptions: Array<{ optionId: string; groupName: string; optionName: string; priceCents: number }> = [];

  let optionsTotalCents = 0;
  if (product.optionGroups) {
    product.optionGroups.forEach(grp => {
      const selected = selectedOptionsMap[grp.id] || [];
      selected.forEach(opt => {
        optionsTotalCents += opt.priceCents;
        allSelectedOptions.push({
          optionId: opt.id,
          groupName: grp.name,
          optionName: opt.name,
          priceCents: opt.priceCents,
        });
      });
    });
  }

  const unitPriceCents = basePrice + optionsTotalCents;
  const totalItemCents = unitPriceCents * quantity;

  const handleAdd = () => {
    // Validar regras obrigatórias
    if (product.optionGroups) {
      for (const grp of product.optionGroups) {
        const selected = selectedOptionsMap[grp.id] || [];
        if (grp.isRequired && selected.length < Math.max(1, grp.minSelect)) {
          setValidationError(`Por favor, selecione as opções obrigatórias em "${grp.name}".`);
          return;
        }
      }
    }

    onAddToCart(product, quantity, allSelectedOptions, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        id="modal-product-detail"
        className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200"
      >
        {/* Cabeçalho com Imagem ou Botão Fechar */}
        <div className="relative">
          {product.imageUrl ? (
            <div className="w-full h-48 sm:h-56 bg-stone-100 overflow-hidden relative">
              <img
                src={product.imageUrl}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
            </div>
          ) : (
            <div className="h-16 bg-stone-100" />
          )}

          <button
            id="btn-close-product-modal"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 text-stone-800 flex items-center justify-center shadow-md hover:bg-white transition-all"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {/* Título e Descrição */}
          <div>
            {product.badge && (
              <span
                className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white mb-2"
                style={{ backgroundColor: primaryColor }}
              >
                {product.badge}
              </span>
            )}
            <h2 className="font-extrabold text-xl text-stone-900">{product.name}</h2>
            {product.description && (
              <p className="text-stone-600 text-sm mt-1.5 leading-relaxed font-normal">
                {product.description}
              </p>
            )}
            <div className="mt-2 text-base font-extrabold text-stone-900">
              {(basePrice / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </div>

          {/* Mensagem de Erro de Validação */}
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {validationError}
            </div>
          )}

          {/* Grupos de Opções / Adicionais */}
          {product.optionGroups &&
            product.optionGroups.map(grp => {
              const selected = selectedOptionsMap[grp.id] || [];
              return (
                <div key={grp.id} className="border-t border-stone-100 pt-4">
                  <div className="flex items-baseline justify-between mb-2.5">
                    <div>
                      <h4 className="font-bold text-stone-900 text-sm">{grp.name}</h4>
                      <p className="text-xs text-stone-500">
                        {grp.maxSelect === 1
                          ? "Escolha 1 opção"
                          : `Escolha até ${grp.maxSelect} opções`}
                      </p>
                    </div>
                    {grp.isRequired ? (
                      <span className="px-2 py-0.5 rounded-md bg-stone-900 text-white text-[10px] font-bold uppercase">
                        Obrigatório
                      </span>
                    ) : (
                      <span className="text-xs text-stone-400 font-medium">Opcional</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {grp.options.map(opt => {
                      const isSelected = selected.some(o => o.id === opt.id);
                      return (
                        <label
                          key={opt.id}
                          onClick={() => toggleOption(grp.id, opt, grp.maxSelect)}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all ${
                            isSelected
                              ? "bg-stone-50 border-stone-900/40 text-stone-900 font-semibold"
                              : "bg-white border-stone-200/80 hover:bg-stone-50/60 text-stone-700 font-normal"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-${grp.maxSelect === 1 ? "full" : "md"} border flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-stone-900 border-stone-900 text-white"
                                  : "border-stone-300 bg-white"
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="text-sm">{opt.name}</span>
                          </div>

                          <span className="text-xs font-bold text-stone-900">
                            {opt.priceCents > 0
                              ? `+ ${(opt.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
                              : "Grátis"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}

          {/* Campo de Observações */}
          <div className="border-t border-stone-100 pt-4">
            <label htmlFor="item-notes" className="block text-xs font-bold text-stone-700 mb-1.5">
              Alguma observação especial?
            </label>
            <textarea
              id="item-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Tirar a maionese, carne bem passada, enviar guardanapos..."
              rows={2}
              maxLength={200}
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-stone-400 transition-all resize-none"
            />
          </div>
        </div>

        {/* Rodapé Fixo com Contador de Quantidade e Botão Adicionar */}
        <div className="p-4 sm:p-6 bg-white border-t border-stone-100 flex items-center gap-4">
          {/* Contador */}
          <div className="flex items-center border border-stone-200 rounded-xl p-1 bg-stone-50">
            <button
              type="button"
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-200 active:scale-95 transition-all"
              aria-label="Diminuir"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center text-sm font-black text-stone-900">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(q => Math.min(20, q + 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-200 active:scale-95 transition-all"
              aria-label="Aumentar"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Botão Adicionar */}
          <button
            id="btn-add-to-cart-confirm"
            onClick={handleAdd}
            className="flex-1 py-3 px-4 rounded-xl text-white font-extrabold text-sm shadow-md flex items-center justify-between transition-transform active:scale-98"
            style={{ backgroundColor: primaryColor }}
          >
            <span>Adicionar ao Pedido</span>
            <span>
              {(totalItemCents / 100).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
