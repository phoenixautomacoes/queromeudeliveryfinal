import { z } from "zod";

export enum UserRole {
  SUPER_ADMIN = "super_admin",
  OWNER = "owner",
  MANAGER = "manager",
  KITCHEN = "kitchen",
  CASHIER = "cashier",
  DRIVER = "driver",
  CUSTOMER = "customer",
}

export enum OrderStatus {
  PENDING_PAYMENT = "pending_payment",
  PAYMENT_FAILED = "payment_failed",
  PAID = "paid",
  CONFIRMED = "confirmed",
  PREPARING = "preparing",
  READY = "ready",
  ASSIGNED = "assigned",
  OUT_FOR_DELIVERY = "out_for_delivery",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
}

export enum DeliveryType {
  DELIVERY = "delivery",
  PICKUP = "pickup",
}

export enum PaymentMethod {
  PIX = "pix",
  CASH = "cash",
  CARD_DELIVERY = "card_delivery",
  ONLINE_MERCADO_PAGO = "online_mercado_pago",
}

export enum DiscountType {
  PERCENTAGE = "percentage",
  FIXED = "fixed",
}

// Zod Schemas for API Requests
export const CreateOrderItemOptionSchema = z.object({
  optionId: z.string(),
});

export const CreateOrderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1).max(99),
  notes: z.string().max(250).optional().default(""),
  optionIds: z.array(z.string()).default([]),
});

export const CustomerInfoSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(10).max(20),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().max(300).optional().default(""),
});

export const DeliveryAddressSchema = z.object({
  zip: z.string().min(8).max(10),
  street: z.string().min(2).max(150),
  number: z.string().min(1).max(20),
  complement: z.string().max(50).optional().default(""),
  neighborhood: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  state: z.string().length(2).default("SP"),
  reference: z.string().max(150).optional().default(""),
});

export const CreateOrderRequestSchema = z.object({
  storeSlug: z.string().min(2),
  deliveryType: z.nativeEnum(DeliveryType),
  customer: CustomerInfoSchema,
  address: DeliveryAddressSchema.optional(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  changeFor: z.number().positive().optional(),
  couponCode: z.string().trim().toUpperCase().optional(),
  items: z.array(CreateOrderItemSchema).min(1, "O pedido precisa conter pelo menos um item"),
  termsAccepted: z.boolean().refine(val => val === true, "Aceite dos termos é obrigatório"),
  whatsappConsent: z.boolean().default(true),
});

export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

export const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  driverId: z.string().optional(),
  notes: z.string().max(250).optional(),
});

export const DriverLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().optional(),
  heading: z.number().optional(),
  accuracy: z.number().optional(),
});
