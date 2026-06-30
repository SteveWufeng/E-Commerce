/**
 * Shared TypeScript types for the e-commerce MVP.
 *
 * These types mirror the Prisma schema and provide
 * type safety across the application layers.
 */

// ========================
// Product Types
// ========================

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  cost: number | null;
  sku: string | null;
  barcode: string | null;
  stock: number;
  lowStockThreshold: number;
  images: string[];
  tags: string[];
  isFeatured: boolean;
  isActive: boolean;
  weight: number | null;
  category: Category | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
}

// ========================
// Cart Types
// ========================

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  maxStock: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

// ========================
// Order Types
// ========================

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "CANCELLED"
  | "REJECTED";

export type PaymentMethod =
  | "CREDIT_CARD"
  | "GOOGLE_PAY"
  | "PAYPAL"
  | "CASH_ON_PICKUP"
  | "BANK_TRANSFER"
  | "MERCANTIL";

export type PaymentStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED";

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  paymentIntentId: string | null;
  cardLastFour: string | null;
  receiptImage: string | null;
  rejectionReason: string | null;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhone: string | null;
  items: OrderItem[];
  paymentProofs?: PaymentProof[];
  paymentMethodDefinition?: PaymentMethodDefinition | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
}

// ========================
// Pickup Types
// ========================

export interface PickupSlot {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  maxOrders: number;
  currentOrders: number;
  isActive: boolean;
  isAvailable: boolean;
}

// ========================
// User Types
// ========================

export type UserRole = "CUSTOMER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  isVerified: boolean;
}

// ========================
// API Response Types
// ========================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ========================
// Payment Method Definition Types
// ========================

export type ProofType = "NONE" | "IMAGE" | "TEXT" | "IMAGE_AND_TEXT";

export type ProofStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface PaymentMethodDefinition {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  qrCodeUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  proofType: ProofType;
  proofLabel: string | null;
  proofImageRequired: boolean;
  requiresTransactionId: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentProof {
  id: string;
  orderId: string;
  paymentMethodDefinitionId: string;
  paymentMethodDefinition: PaymentMethodDefinition;
  transactionId: string | null;
  amount: number | null;
  imageUrl: string | null;
  notes: string | null;
  status: ProofStatus;
  verifiedById: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ========================
// Checkout Types
// ========================

export interface CheckoutFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  paymentMethod: string;
  notes: string;
  paymentMethodDefinitionId?: string;
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface SignupForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  cost?: number;
  sku?: string;
  stock: number;
  categoryId: string;
  tags: string[];
  images: string[];
  isFeatured: boolean;
  isActive: boolean;
}
