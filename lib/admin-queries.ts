import { supabase } from './supabase';

export interface DashboardSummary {
  todayRevenue: number;
  todayOrders: number;
  weekRevenue: number;
  weekOrders: number;
  monthRevenue: number;
  monthOrders: number;
  topItems: { name: string; quantity: number }[];
}

export async function getDashboardSummary(tenantId: string): Promise<DashboardSummary> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: monthOrdersData, error } = await supabase
    .from('orders')
    .select('id, total_amount, created_at')
    .eq('tenant_id', tenantId)
    .eq('payment_status', 'paid')
    .gte('created_at', startOfMonth);

  if (error || !monthOrdersData) {
    return {
      todayRevenue: 0, todayOrders: 0,
      weekRevenue: 0, weekOrders: 0,
      monthRevenue: 0, monthOrders: 0,
      topItems: [],
    };
  }

  const todayOrders = monthOrdersData.filter((o) => o.created_at >= startOfToday);
  const weekOrders = monthOrdersData.filter((o) => o.created_at >= startOfWeek);

  const sum = (rows: typeof monthOrdersData) =>
    rows.reduce((total, o) => total + Number(o.total_amount), 0);

  // Top-selling items: join order_items -> menu_items for this month's orders.
  const monthOrderIds = monthOrdersData.map((o) => o.id);
  let topItems: { name: string; quantity: number }[] = [];

  if (monthOrderIds.length > 0) {
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('quantity, menu_items ( name )')
      .in('order_id', monthOrderIds);

    const counts = new Map<string, number>();
    (itemsData ?? []).forEach((row: any) => {
      const name = row.menu_items?.name ?? 'Unknown item';
      counts.set(name, (counts.get(name) ?? 0) + row.quantity);
    });

    topItems = Array.from(counts.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }

  return {
    todayRevenue: sum(todayOrders),
    todayOrders: todayOrders.length,
    weekRevenue: sum(weekOrders),
    weekOrders: weekOrders.length,
    monthRevenue: sum(monthOrdersData),
    monthOrders: monthOrdersData.length,
    topItems,
  };
}

export interface RestaurantSettings {
  id: string;
  name: string;
  logo_url: string | null;
  subdomain: string;
  about_text: string | null;
  contact_phone: string | null;
  contact_email: string | null;
}

export async function getRestaurantSettings(tenantId: string): Promise<RestaurantSettings | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, logo_url, subdomain, about_text, contact_phone, contact_email')
    .eq('id', tenantId)
    .maybeSingle();

  if (error || !data) return null;
  return data as RestaurantSettings;
}

export async function updateRestaurantSettings(
  tenantId: string,
  updates: Partial<Pick<RestaurantSettings, 'name' | 'about_text' | 'contact_phone' | 'contact_email' | 'logo_url'>>
): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from('restaurants')
    .update(updates)
    .eq('id', tenantId)
    .select('id');

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: 'Update blocked — no matching row (check login/RLS).' };
  }
  return { error: null };
}

export async function uploadLogo(tenantId: string, file: File): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split('.').pop();
  const path = `${tenantId}/logo.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from('logos')
    .upload(path, file, { upsert: true });

  if (uploadErr) return { url: null, error: uploadErr.message };

  const { data } = supabase.storage.from('logos').getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

export interface AdminOrderRow {
  id: string;
  order_code: string;
  status: string;
  payment_method: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  table_number: string | null;
  customer_name: string | null;
  customer_mobile: string | null;
}

export async function getOrdersForAdmin(
  tenantId: string,
  filters: { search?: string; status?: string; dateFrom?: string; dateTo?: string }
): Promise<AdminOrderRow[]> {
  let query = supabase
    .from('orders')
    .select(
      `id, order_code, status, payment_method, payment_status, total_amount, created_at,
       tables ( table_number ),
       customers ( name, mobile_number )`
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
  if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

  const { data, error } = await query;
  if (error || !data) return [];

  let rows: AdminOrderRow[] = data.map((row: any) => ({
    id: row.id,
    order_code: row.order_code,
    status: row.status,
    payment_method: row.payment_method,
    payment_status: row.payment_status,
    total_amount: row.total_amount,
    created_at: row.created_at,
    table_number: row.tables?.table_number ?? null,
    customer_name: row.customers?.name ?? null,
    customer_mobile: row.customers?.mobile_number ?? null,
  }));

  // Search by order code or mobile number — done client-side after fetch
  // since it needs to match across the joined customer row too.
  if (filters.search) {
    const term = filters.search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.order_code.toLowerCase().includes(term) ||
        (r.customer_mobile ?? '').includes(term)
    );
  }

  return rows;
}

export interface AdminCustomerRow {
  id: string;
  name: string;
  mobile_number: string;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
}

export async function getCustomersForAdmin(tenantId: string): Promise<AdminCustomerRow[]> {
  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, name, mobile_number')
    .eq('tenant_id', tenantId);

  if (error || !customers) return [];

  const { data: orders } = await supabase
    .from('orders')
    .select('customer_id, total_amount, created_at, payment_status')
    .eq('tenant_id', tenantId);

  const stats = new Map<string, { count: number; spent: number; lastOrder: string }>();
  (orders ?? []).forEach((o: any) => {
    if (!o.customer_id) return;
    const existing = stats.get(o.customer_id) ?? { count: 0, spent: 0, lastOrder: '' };
    existing.count += 1;
    if (o.payment_status === 'paid') existing.spent += Number(o.total_amount);
    if (!existing.lastOrder || o.created_at > existing.lastOrder) existing.lastOrder = o.created_at;
    stats.set(o.customer_id, existing);
  });

  return customers
    .map((c) => {
      const s = stats.get(c.id) ?? { count: 0, spent: 0, lastOrder: '' };
      return {
        id: c.id,
        name: c.name,
        mobile_number: c.mobile_number,
        order_count: s.count,
        total_spent: s.spent,
        last_order_at: s.lastOrder || null,
      };
    })
    .sort((a, b) => (b.last_order_at ?? '').localeCompare(a.last_order_at ?? ''));
}

export interface CustomerOrderHistory {
  order_code: string;
  status: string;
  total_amount: number;
  created_at: string;
}

export async function getCustomerOrderHistory(customerId: string): Promise<CustomerOrderHistory[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('order_code, status, total_amount, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as CustomerOrderHistory[];
}

export interface StaffRow {
  id: string;
  name: string;
  role: string;
  auth_user_id: string;
  is_primary_owner: boolean;
}

export async function getStaffForTenant(tenantId: string): Promise<StaffRow[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('id, name, role, auth_user_id, is_primary_owner')
    .eq('tenant_id', tenantId);

  if (error || !data) return [];
  return data as StaffRow[];
}

export async function removeStaff(staffId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('staff').delete().eq('id', staffId);
  return { error: error?.message ?? null };
}

export interface TableWithQR {
  id: string;
  table_number: string;
  qr_token: string;
  order_url: string;
}

export async function getTablesForQR(tenantId: string, subdomain: string): Promise<TableWithQR[]> {
  const { data, error } = await supabase
    .from('tables')
    .select('id, table_number, qr_token')
    .eq('tenant_id', tenantId)
    .order('table_number', { ascending: true });

  if (error || !data) return [];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';

  return data.map((t) => ({
    id: t.id,
    table_number: t.table_number,
    qr_token: t.qr_token,
    order_url: `${siteUrl}/order/${subdomain}?t=${t.qr_token}`,
  }));
}

export interface CounterQR {
  restaurant_name: string;
  logo_url: string | null;
  order_url: string;
}

export async function getCounterQR(tenantId: string, subdomain: string): Promise<CounterQR | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('name, logo_url, counter_qr_token')
    .eq('id', tenantId)
    .maybeSingle();

  if (error || !data || !data.counter_qr_token) return null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';

  return {
    restaurant_name: data.name,
    logo_url: data.logo_url,
    order_url: `${siteUrl}/order/${subdomain}?ct=${data.counter_qr_token}`,
  };
}

export interface PaymentSettings {
  id: string;
  razorpay_key_id: string | null;
  razorpay_key_secret: string | null;
}

export async function getPaymentSettings(tenantId: string): Promise<PaymentSettings | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, razorpay_key_id, razorpay_key_secret')
    .eq('id', tenantId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PaymentSettings;
}

export async function updatePaymentSettings(
  restaurantId: string,
  updates: Partial<Pick<PaymentSettings, 'razorpay_key_id' | 'razorpay_key_secret'>>
): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from('restaurants')
    .update(updates)
    .eq('id', restaurantId)
    .select('id');

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: 'Update blocked — no matching row (check login/RLS).' };
  }
  return { error: null };
}