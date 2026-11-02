export type OrderStatus = "pending" | "slip_uploaded" | "approved" | "delivered" | "rejected";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: "customer" | "admin";
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
}

/** A row of the product_listing view: everything a product card needs. */
export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  price: number;
  compare_at_price: number | null;
  min_price: number;
  max_price: number;
  total_stock: number;
  image_path: string | null;
  image_path_2: string | null;
  category_slug: string | null;
  category_name: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Variant {
  id: string;
  product_id: string;
  sku: string | null;
  name: string;
  options: Record<string, string>;
  price: number | null;
  stock: number;
  is_active: boolean;
  sort_order: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  path: string;
  alt: string | null;
  sort_order: number;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  option_names: string[];
  is_active: boolean;
  is_featured: boolean;
  category_id: string | null;
  categories: { name: string; slug: string } | null;
  product_variants: Variant[];
  product_images: ProductImage[];
}

export interface StoreSettings {
  store_name: string;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  payment_instructions: string | null;
  shipping_fee: number;
  free_shipping_threshold: number | null;
  low_stock_threshold: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  subtotal: number;
  shipping_fee: number;
  total: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string | null;
  customer_note: string | null;
  slip_path: string | null;
  slip_uploaded_at: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  image_path: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string | null;
  created_at: string;
}

export interface DashboardStats {
  revenue_total: number;
  revenue_30d: number;
  orders_total: number;
  orders_by_status: Partial<Record<OrderStatus, number>>;
  products_total: number;
  products_active: number;
  customers_total: number;
  low_stock: { product_id: string; product_name: string; variant_name: string; stock: number }[];
  daily: { date: string; revenue: number; orders: number }[];
}

/** Result type used by every server action. */
export type ActionResult<T = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

/** State returned by form-based server actions (login, register...). */
export interface FormState {
  error?: string;
  message?: string;
}
