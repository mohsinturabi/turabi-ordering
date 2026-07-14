// Mirrors the Phase 1 Supabase schema. Keep in sync with the SQL definitions.

export type SubscriptionStatus = 'active' | 'grace' | 'suspended';

export interface Tenant {
  id: string;
  name: string;
  logo_url: string | null;
  subdomain: string;
  subscription_status: SubscriptionStatus;
  plan_type: 'basic' | 'assisted' | null;
  trial_ends_at: string | null;
}

export interface RestaurantTable {
  id: string;
  tenant_id: string;
  table_number: string;
  qr_token: string;
}

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  tenant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  rating?: number | null;
  rating_count?: number | null;
  is_bestseller?: boolean;
}

export type PaymentMethod = 'counter' | 'online';
export type PaymentStatus = 'paid' | 'unpaid' | 'refunded';
export type PaymentMode = 'cash' | 'upi';

export type OrderStatus =
  | 'Pending'
  | 'Accepted'
  | 'Preparing'
  | 'Ready'
  | 'Completed'
  | 'Cancelled';

export interface Order {
  id: string;
  tenant_id: string;
  table_id: string;
  order_code: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_mode: PaymentMode | null;   // ← naya
  total_amount: number;
  created_at: string;
  order_type: 'table' | 'counter';
}
export interface OrderItemRow {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price_at_order: number;
}

export interface Staff {
  id: string;
  tenant_id: string;
  name: string;
  role: 'owner' | 'staff';
  auth_user_id: string;
}

// Order shape used by the Counter Dashboard — includes the joined fields
// staff actually need to see at a glance (table number, customer name/mobile,
// line items) without extra round trips per card.
export interface DashboardOrder extends Order {
  table_number: string | null;
  customer_mobile: string | null;
  customer_name: string | null;
  items: { name: string; quantity: number; price: number }[];
}

// Client-side cart shape — persisted to localStorage, not the DB,
// until the order is actually placed.
export interface CartLine {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}
