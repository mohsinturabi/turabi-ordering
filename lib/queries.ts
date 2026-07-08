import { supabase } from './supabase';
import type {
  Tenant,
  RestaurantTable,
  Category,
  MenuItem,
  Order,
  PaymentMethod,
  CartLine,
} from './types';

export async function getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('restaurants')
   .select('id, name, logo_url, subdomain, subscription_status, plan_type, trial_ends_at')
    .eq('subdomain', subdomain)
    .maybeSingle();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('getTenantBySubdomain failed', error);
    return null;
  }
  return data as Tenant | null;
}

export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, logo_url, subdomain, subscription_status, plan_type, trial_ends_at')
    .eq('id', tenantId)
    .maybeSingle();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('getTenantById failed', error);
    return null;
  }
  return data as Tenant | null;
}

export async function getTableByNumber(
  tenantId: string,
  tableNumber: string
): Promise<RestaurantTable | null> {
  const { data, error } = await supabase
    .from('tables')
    .select('id, tenant_id, table_number')
    .eq('tenant_id', tenantId)
    .eq('table_number', tableNumber)
    .maybeSingle();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('getTableByNumber failed', error);
    return null;
  }
  return data as RestaurantTable | null;
}

export async function getTableByToken(
  tenantId: string,
  token: string
): Promise<RestaurantTable | null> {
  const { data, error } = await supabase
    .from('tables')
    .select('id, tenant_id, table_number, qr_token')
    .eq('tenant_id', tenantId)
    .eq('qr_token', token)
    .maybeSingle();

  // eslint-disable-next-line no-console
  console.log('getTableByToken:', { tenantId, token, data, error });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('getTableByToken failed', error);
    return null;
  }
  return data as RestaurantTable | null;
}

export async function getMenu(
  tenantId: string
): Promise<{ categories: Category[]; items: MenuItem[] }> {
  const [{ data: categories, error: catErr }, { data: items, error: itemErr }] =
    await Promise.all([
      supabase
        .from('categories')
        .select('id, tenant_id, name, sort_order')
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('menu_items')
        .select('id, tenant_id, category_id, name, description, price, image_url, is_available')
        .eq('tenant_id', tenantId),
    ]);

  if (catErr) console.error('getMenu categories failed', catErr); // eslint-disable-line no-console
  if (itemErr) console.error('getMenu items failed', itemErr); // eslint-disable-line no-console

  return {
    categories: (categories as Category[]) ?? [],
    items: (items as MenuItem[]) ?? [],
  };
}

interface PlaceOrderInput {
  tenantId: string;
  tableId: string | null;
  orderType: 'table' | 'counter';
  mobileNumber: string;
  customerName: string;
  paymentMethod: PaymentMethod;
  lines: CartLine[];
}

interface PlaceOrderResult {
  order: Order | null;
  error: string | null;
}

// Inserts the order + order_items. order_code is generated server-side by the
// Postgres trigger from Phase 1 (format ORD-YYYYMMDD-XXXXXX) — we just read it
// back off the inserted row.
export async function placeOrder({
  tenantId,
  tableId,
  orderType,
  mobileNumber,
  customerName,
  paymentMethod,
  lines,
}: PlaceOrderInput): Promise<PlaceOrderResult> {
  if (lines.length === 0) {
    return { order: null, error: 'Cart is empty.' };
  }

  // Suspended restaurants can't take new orders.
  const { data: tenant } = await supabase
    .from('restaurants')
    .select('subscription_status')
    .eq('id', tenantId)
    .maybeSingle();

  if (tenant?.subscription_status === 'suspended') {
    return { order: null, error: 'Ye restaurant abhi orders accept nahi kar raha.' };
  }

  // Resolve or create the customer record by mobile number (tenant-scoped).
  const { data: customer, error: customerErr } = await supabase
    .from('customers')
    .upsert(
      { tenant_id: tenantId, mobile_number: mobileNumber, name: customerName },
      { onConflict: 'tenant_id,mobile_number' }
    )
    .select('id')
    .single();

  if (customerErr || !customer) {
    return { order: null, error: customerErr?.message ?? 'Could not save customer.' };
  }

  const totalAmount = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      tenant_id: tenantId,
      table_id: tableId,
      order_type: orderType,
      customer_id: customer.id,
      status: 'Pending',
      payment_method: paymentMethod,
      payment_status: 'unpaid',
      total_amount: totalAmount,
    })

    .select('id, tenant_id, table_id, order_code, status, payment_method, payment_status, total_amount, created_at')
    .single();

  if (orderErr || !order) {
    return { order: null, error: orderErr?.message ?? 'Could not place order.' };
  }

  const orderItemsPayload = lines.map((l) => ({
    order_id: order.id,
    tenant_id: tenantId,
    menu_item_id: l.menuItemId,
    quantity: l.quantity,
    price_at_order: l.price,
  }));

  const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsPayload);

  if (itemsErr) {
    return { order: order as Order, error: itemsErr.message };
  }

  return { order: order as Order, error: null };
}

// Used on the tracking page to show what was ordered, alongside live status.
export async function getOrderItems(
  orderId: string
): Promise<{ name: string; quantity: number; price: number }[]> {
  const { data, error } = await supabase
    .from('order_items')
    .select('quantity, price_at_order, menu_items ( name )')
    .eq('order_id', orderId);

  if (error || !data) {
    if (error) console.error('getOrderItems failed', error); // eslint-disable-line no-console
    return [];
  }

  return data.map((row: any) => ({
    name: row.menu_items?.name ?? 'Item',
    quantity: row.quantity,
    price: row.price_at_order,
  }));
}

// Used by the permanent /order/track/[orderCode] page. Looks the order up by
// its code alone — no tenant/table context needed — so the link keeps
// working after a refresh, a closed tab, or on a different device.
export async function getOrderByCode(orderCode: string): Promise<{
  order: Order | null;
  tenant: Tenant | null;
  table: RestaurantTable | null;
}> {
  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id, tenant_id, table_id, order_type, order_code, status, payment_method, payment_status, total_amount, created_at'
    )
    .eq('order_code', orderCode)
    .maybeSingle();

  if (error || !order) {
    if (error) console.error('getOrderByCode failed', error); // eslint-disable-line no-console
    return { order: null, tenant: null, table: null };
  }

  const [{ data: tenant }, { data: table }] = await Promise.all([
    supabase
      .from('restaurants')
      .select('id, name, logo_url, subdomain, subscription_status')
      .eq('id', order.tenant_id)
      .maybeSingle(),
    supabase
      .from('tables')
      .select('id, tenant_id, table_number')
      .eq('id', order.table_id)
      .maybeSingle(),
  ]);

  return {
    order: order as Order,
    tenant: (tenant as Tenant) ?? null,
    table: (table as RestaurantTable) ?? null,
  };
}

export async function getCategoriesForTenant(tenantId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, tenant_id, name, sort_order')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('getCategoriesForTenant failed', error); // eslint-disable-line no-console
    return [];
  }
  return data as Category[];
}

export async function getMenuItemsForTenant(tenantId: string): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, tenant_id, category_id, name, description, price, image_url, is_available')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });
  if (error) {
    console.error('getMenuItemsForTenant failed', error); // eslint-disable-line no-console
    return [];
  }
  return data as MenuItem[];
}

export async function createCategory(
  tenantId: string,
  name: string,
  sortOrder: number
): Promise<{ category: Category | null; error: string | null }> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ tenant_id: tenantId, name, sort_order: sortOrder })
    .select('id, tenant_id, name, sort_order')
    .single();
  if (error) return { category: null, error: error.message };
  return { category: data as Category, error: null };
}

export async function deleteCategory(categoryId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('categories').delete().eq('id', categoryId);
  return { error: error?.message ?? null };
}

interface MenuItemInput {
  tenantId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

export async function createMenuItem(
  input: MenuItemInput
): Promise<{ item: MenuItem | null; error: string | null }> {
  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      tenant_id: input.tenantId,
      category_id: input.categoryId,
      name: input.name,
      description: input.description || null,
      price: input.price,
      image_url: input.imageUrl || null,
      is_available: true,
    })
    .select('id, tenant_id, category_id, name, description, price, image_url, is_available')
    .single();
  if (error) return { item: null, error: error.message };
  return { item: data as MenuItem, error: null };
}

export async function updateMenuItem(
  itemId: string,
  updates: Partial<{
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    category_id: string;
  }>
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('menu_items').update(updates).eq('id', itemId);
  return { error: error?.message ?? null };
}

export async function toggleMenuItemAvailability(
  itemId: string,
  isAvailable: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('menu_items')
    .update({ is_available: isAvailable })
    .eq('id', itemId);
  return { error: error?.message ?? null };
}

export async function deleteMenuItem(itemId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
  return { error: error?.message ?? null };
}

export async function getInvoiceByOrderId(
  orderId: string
): Promise<{ pdfUrl: string | null }> {
  const { data } = await supabase
    .from('invoices')
    .select('pdf_url')
    .eq('order_id', orderId)
    .maybeSingle();
  return { pdfUrl: data?.pdf_url ?? null };
}

export async function isValidCounterToken(tenantId: string, token: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', tenantId)
    .eq('counter_qr_token', token)
    .maybeSingle();

  // eslint-disable-next-line no-console
  console.log('isValidCounterToken:', { tenantId, token, data, error });

  return !error && !!data;
}

export async function switchOrderToPayAtCounter(orderId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('orders')
    .update({ payment_method: 'counter' })
    .eq('id', orderId);
  return { error: error?.message ?? null };
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
  tenantId: string,
  updates: Partial<Pick<PaymentSettings, 'razorpay_key_id' | 'razorpay_key_secret'>>
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