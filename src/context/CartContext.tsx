import React, { createContext, useContext, useState, useEffect } from "react";
import { CartItem, Product, DeliveryZone } from "../types";

interface CouponInfo {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountCents: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity: number, selectedOptions: any[], notes?: string) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  clearCart: () => void;
  deliveryType: "delivery" | "pickup";
  setDeliveryType: (type: "delivery" | "pickup") => void;
  selectedZone: DeliveryZone | null;
  setSelectedZone: (zone: DeliveryZone | null) => void;
  coupon: CouponInfo | null;
  applyCoupon: (coupon: CouponInfo) => void;
  removeCoupon: () => void;
  subtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  totalCents: number;
  totalItemsCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("qmd_cart_v2");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [coupon, setCoupon] = useState<CouponInfo | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("qmd_cart_v2", JSON.stringify(items));
    } catch (e) {
      console.error("Erro ao salvar carrinho no localStorage:", e);
    }
  }, [items]);

  const addItem = (product: Product, quantity: number, selectedOptions: any[], notes: string = "") => {
    const basePrice = product.promoPriceCents ?? product.priceCents;
    const optionsSum = selectedOptions.reduce((sum, opt) => sum + opt.priceCents, 0);
    const unitPriceCents = basePrice + optionsSum;
    const subtotalCents = unitPriceCents * quantity;

    const newItem: CartItem = {
      id: `${product.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      product,
      quantity,
      notes,
      selectedOptions,
      unitPriceCents,
      subtotalCents,
    };

    setItems(prev => [...prev, newItem]);
    setIsCartOpen(true);
  };

  const removeItem = (cartItemId: string) => {
    setItems(prev => prev.filter(i => i.id !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setItems(prev =>
      prev
        .map(item => {
          if (item.id === cartItemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              subtotalCents: item.unitPriceCents * newQty,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setItems([]);
    setCoupon(null);
    localStorage.removeItem("qmd_cart_v2");
  };

  const applyCoupon = (newCoupon: CouponInfo) => {
    setCoupon(newCoupon);
  };

  const removeCoupon = () => {
    setCoupon(null);
  };

  const subtotalCents = items.reduce((sum, item) => sum + item.subtotalCents, 0);
  const deliveryFeeCents = deliveryType === "delivery" ? (selectedZone ? selectedZone.feeCents : 600) : 0;

  let calculatedDiscountCents = 0;
  if (coupon) {
    if (coupon.discountType === "percentage") {
      calculatedDiscountCents = Math.round((subtotalCents * coupon.discountValue) / 100);
    } else {
      calculatedDiscountCents = Math.min(coupon.discountValue, subtotalCents);
    }
  }

  const totalCents = Math.max(0, subtotalCents + deliveryFeeCents - calculatedDiscountCents);
  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        deliveryType,
        setDeliveryType,
        selectedZone,
        setSelectedZone,
        coupon,
        applyCoupon,
        removeCoupon,
        subtotalCents,
        deliveryFeeCents,
        discountCents: calculatedDiscountCents,
        totalCents,
        totalItemsCount,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
