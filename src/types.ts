export interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  description: string;
  businessType: string;
  logoUrl?: string;
  coverUrl?: string;
  primaryColor: string;
  whatsappNumber: string;
  addressStreet?: string;
  addressNumber?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  defaultDeliveryFeeCents: number;
  minOrderValueCents: number;
  estimatedTimeMin: number;
  estimatedTimeMax: number;
  pixKey?: string;
  pixKeyType?: string;
  isOpen: boolean;
  autoOpenWhatsApp: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface ProductOption {
  id: string;
  name: string;
  priceCents: number;
}

export interface ProductOptionGroup {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: ProductOption[];
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  promoPriceCents?: number | null;
  badge?: string | null;
  imageUrl?: string;
  isAvailable: boolean;
  optionGroups?: ProductOptionGroup[];
}

export interface DeliveryZone {
  id: string;
  name: string;
  zipPrefix?: string;
  feeCents: number;
  estimatedMinMinutes: number;
  estimatedMaxMinutes: number;
}

export interface CartItemOption {
  optionId: string;
  groupName: string;
  optionName: string;
  priceCents: number;
}

export interface CartItem {
  id: string; // unique item id in cart
  product: Product;
  quantity: number;
  notes: string;
  selectedOptions: CartItemOption[];
  unitPriceCents: number;
  subtotalCents: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "super_admin" | "owner" | "manager" | "kitchen" | "cashier" | "driver" | "customer";
}
