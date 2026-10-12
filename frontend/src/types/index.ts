export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'admin' | 'cashier';
}

export interface Category {
  id: number;
  name: string;
  local_name?: string | null;
  icon?: string;
  color?: string;
  display_order?: number;
  is_active: number | boolean;
}

export type FoodType = 'veg' | 'non-veg' | 'beverage';

export interface Product {
  id: number;
  category_id: number;
  name: string;
  local_name?: string | null;
  code?: string | null;
  selling_price: number;
  cost_price: number;
  food_type: FoodType;
  preparation_time_mins: number;
  is_available: number | boolean;
  image_url?: string | null;
  category_name?: string;
  category_color?: string;
}

export interface CartItem {
  product_id?: number;
  product_name: string;
  local_name?: string | null;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  food_type?: FoodType;
  notes?: string;
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'other';
export type OrderStatus = 'completed' | 'cancelled' | 'refunded';
export type CustomerType = 'student' | 'staff' | 'visitor';

export interface OrderItem {
  id?: number;
  order_id?: number;
  product_id?: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  subtotal: number;
  notes?: string | null;
}

export interface Order {
  id: number;
  bill_number: string;
  order_date: string;
  customer_name: string;
  customer_type: CustomerType;
  token_number?: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  grand_total: number;
  payment_method: PaymentMethod;
  payment_status: 'paid' | 'refunded' | 'cancelled';
  order_status: OrderStatus;
  cancellation_reason?: string | null;
  cashier_name?: string;
  items_count?: number;
  notes?: string | null;
  offline_id?: string | null;
  is_synced?: boolean | number;
  items?: OrderItem[];
}

export type ExpenseCategory = 'groceries' | 'dairy' | 'gas_fuel' | 'disposables' | 'wages' | 'maintenance' | 'other';

export interface Expense {
  id: number;
  category: ExpenseCategory;
  title: string;
  amount: number;
  expense_date: string;
  paid_to?: string | null;
  payment_method: 'cash' | 'upi' | 'bank';
  receipt_number?: string | null;
  notes?: string | null;
  created_by_name?: string;
}

export interface BusinessSettings {
  business_name: string;
  college_name: string;
  campus_branch: string;
  phone: string;
  email: string;
  tax_name: string;
  tax_percentage: string;
  tax_inclusive: string;
  currency_symbol: string;
  timezone: string;
  invoice_prefix: string;
  printer_type: 'bridge' | 'serial' | 'browser';
  printer_width: '58' | '80';
  printer_bridge_url: string;
  printer_auto_cut: string;
  printer_open_drawer: string;
  printer_header: string;
  printer_footer: string;
  upi_vpa: string;
  upi_merchant_name: string;
}

export interface DashboardData {
  today: string;
  gross_sales: number;
  completed_orders_count: number;
  cash_collections: number;
  upi_collections: number;
  other_collections: number;
  cancelled_orders_count: number;
  cancelled_orders_amount: number;
  refunds_amount: number;
  operating_expenses: number;
  ingredient_cost: number;
  gross_profit: number;
  estimated_net_profit: number;
  profit_margin_percentage: number;
  hourly_trend: Array<{ order_hour: number; order_count: number; hourly_sales: number }>;
  recent_orders: Order[];
}

export interface OfflineOrderPayload {
  offline_id: string;
  order_date: string;
  customer_name: string;
  customer_type: CustomerType;
  items: CartItem[];
  discount_type: 'flat' | 'percent';
  discount_value: number;
  tax_rate: number;
  is_tax_inclusive: boolean;
  payment_method: PaymentMethod;
  notes?: string;
  grand_total: number;
}
