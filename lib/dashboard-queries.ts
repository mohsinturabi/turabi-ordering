import { supabase } from './supabase';
import type {
  Staff,
  DashboardOrder,
  OrderStatus,
  PaymentStatus,
  PaymentMode,
  Category,
  MenuItem,
  RestaurantTable,
} from './types';

// Looks up the staff record for the currently signed-in Supabase Auth user.
export async function getStaffForUser(authUserId: string): Promise<Staff | null> {
  const { data, error } = await supabase
    .from('staff')
    .select('id, tenant_id, name, role, auth_user_id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('getStaffForUser failed', error);
    return null;
  }
  return data as Staff | null;
}

export async function getOrdersForTenant(tenantId: string): Promise<DashboardOrder[]> {
  const { data, error } = await supabase
    .from('orders')
   .select(
  `
  id, tenant_id, table_id, order_type, order_code, status, payment_method, payment_status, payment_mode,
  total_amount, created_at,
  tables ( table_number ),
  customers ( mobile_number, name ),
  order_items ( quantity, price_at_order, menu_items ( name ) )
`
)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    if (error) console.error('getOrdersForTenant failed', error); // eslint-disable-line no-console
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    table_id: row.table_id,
    order_type: row.order_type,
    order_code: row.order_code,
    status: row.status,
    payment_method: row.payment_method,
    payment_status: row.payment_status,
    total_amount: row.total_amount,
    created_at: row.created_at,
    payment_mode: row.payment_mode ?? null,
    table_number: row.tables?.table_number ?? null,
    customer_mobile: row.customers?.mobile_number ?? null,
    customer_name: row.customers?.name ?? null,
    items: (row.order_items ?? []).map((oi: any) => ({
      name: oi.menu_items?.name ?? 'Item',
      quantity: oi.quantity,
      price: oi.price_at_order,
    })),
  }));
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  extra?: Partial<{ payment_status: PaymentStatus; payment_mode: PaymentMode }>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('orders')
    .update({ status, ...extra })
    .eq('id', orderId);
  if (error) return { error: error.message };
  return { error: null };
}
export async function getCategoriesForTenant(tenantId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, tenant_id, name, sort_order')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true });
  if (error || !data) {
    if (error) console.error('getCategoriesForTenant failed', error); // eslint-disable-line no-console
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
  if (error || !data) {
    if (error) console.error('getMenuItemsForTenant failed', error); // eslint-disable-line no-console
    return [];
  }
  return data as MenuItem[];
}

export async function createCategory(tenantId: string, name: string, sortOrder: number) {
  const { data, error } = await supabase
    .from('categories')
    .insert({ tenant_id: tenantId, name, sort_order: sortOrder })
    .select('id, tenant_id, name, sort_order')
    .single();
  return { category: data as Category | null, error: error?.message ?? null };
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function createMenuItem(input: {
  tenantId: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl?: string;
}) {
  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      tenant_id: input.tenantId,
      category_id: input.categoryId,
      name: input.name,
      description: input.description,
      price: input.price,
      image_url: input.imageUrl || null,
      is_available: true,
    })
    .select('id, tenant_id, category_id, name, description, price, image_url, is_available')
    .single();
  return { item: data as MenuItem | null, error: error?.message ?? null };
}

export async function updateMenuItem(
  id: string,
  fields: Partial<Pick<MenuItem, 'name' | 'description' | 'price' | 'is_available'>>
) {
  const { error } = await supabase.from('menu_items').update(fields).eq('id', id);
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

export async function deleteMenuItem(id: string) {
  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function uploadMenuItemImage(
  itemId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split('.').pop();
  const path = `${itemId}-${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from('menu-images')
    .upload(path, file, { upsert: true });

  if (uploadErr) {
    return { url: null, error: uploadErr.message };
  }

  const { data } = supabase.storage.from('menu-images').getPublicUrl(path);
  const { error: updateErr } = await updateMenuItem(itemId, { image_url: data.publicUrl });

  if (updateErr) {
    return { url: null, error: updateErr };
  }

  return { url: data.publicUrl, error: null };
}

export async function getTablesForTenant(tenantId: string): Promise<RestaurantTable[]> {
  const { data, error } = await supabase
    .from('tables')
    .select('id, tenant_id, table_number, qr_token')
    .eq('tenant_id', tenantId)
    .order('table_number', { ascending: true });
  if (error || !data) {
    if (error) console.error('getTablesForTenant failed', error); // eslint-disable-line no-console
    return [];
  }
  return data as RestaurantTable[];
}

export async function createTable(tenantId: string, tableNumber: string) {
  const { data, error } = await supabase
    .from('tables')
    .insert({ tenant_id: tenantId, table_number: tableNumber })
    .select('id, tenant_id, table_number, qr_token')
    .single();
  return { table: data as RestaurantTable | null, error: error?.message ?? null };
}

export async function deleteTable(id: string) {
  const { error } = await supabase.from('tables').delete().eq('id', id);
  return { error: error?.message ?? null };
}


export interface TableBookingStatus extends RestaurantTable {
  isBooked: boolean;
}

const ACTIVE_STATUSES: OrderStatus[] = ['Pending', 'Accepted', 'Preparing', 'Ready'];

// Table booked = has an order right now that isn't Completed/Cancelled yet.
export async function getTablesWithBookingStatus(tenantId: string): Promise<TableBookingStatus[]> {
  const [{ data: tables, error: tablesErr }, { data: activeOrders, error: ordersErr }] = await Promise.all([
    supabase
      .from('tables')
      .select('id, tenant_id, table_number, qr_token')
      .eq('tenant_id', tenantId)
      .order('table_number', { ascending: true }),
    supabase
      .from('orders')
      .select('table_id')
      .eq('tenant_id', tenantId)
      .eq('order_type', 'table')
      .in('status', ACTIVE_STATUSES),
  ]);

  if (tablesErr || !tables) {
    if (tablesErr) console.error('getTablesWithBookingStatus tables failed', tablesErr); // eslint-disable-line no-console
    return [];
  }
  if (ordersErr) console.error('getTablesWithBookingStatus orders failed', ordersErr); // eslint-disable-line no-console

  const bookedTableIds = new Set((activeOrders ?? []).map((o: any) => o.table_id));

  return (tables as RestaurantTable[]).map((t) => ({
    ...t,
    isBooked: bookedTableIds.has(t.id),
  }));
}