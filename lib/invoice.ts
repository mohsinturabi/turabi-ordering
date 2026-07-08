import QRCode from 'qrcode';
import { renderToBuffer } from '@react-pdf/renderer';
import { supabaseAdmin } from './supabase-admin';
import InvoiceDocument from './invoice-pdf';
import type { Order, Tenant, RestaurantTable } from './types';

export async function generateInvoiceForOrder(
  orderId: string
): Promise<{ url: string | null; error: string | null }> {
  const { data: existing } = await supabaseAdmin
  .from('invoices')
  .select('pdf_url')
  .eq('order_id', orderId)
  .maybeSingle();

if (existing?.pdf_url) {
  return { url: existing.pdf_url, error: null };
}

const { data: order, error: orderErr } = await supabaseAdmin
  .from('orders')
  .select(
    'id, tenant_id, table_id, order_type, customer_id, order_code, status, payment_method, payment_status, payment_mode, total_amount, created_at'
  )
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr || !order) return { url: null, error: 'Order not found' };

  const [{ data: tenant }, { data: table }, { data: customer }, { data: orderItems }] = await Promise.all([
    supabaseAdmin
      .from('restaurants')
      .select('id, name, logo_url, subdomain, subscription_status')
      .eq('id', order.tenant_id)
      .maybeSingle(),
    supabaseAdmin
      .from('tables')
      .select('id, tenant_id, table_number')
      .eq('id', order.table_id)
      .maybeSingle(),
    supabaseAdmin.from('customers').select('name, mobile_number').eq('id', order.customer_id).maybeSingle(),
    supabaseAdmin
      .from('order_items')
      .select('quantity, price_at_order, menu_items ( name )')
      .eq('order_id', order.id),
  ]);

  if (!tenant) return { url: null, error: 'Restaurant not found' };

  const items = (orderItems ?? []).map((row: any) => ({
    name: row.menu_items?.name ?? 'Item',
    quantity: row.quantity,
    price: row.price_at_order,
  }));

  const invoiceNumber = `INV-${order.order_code}`;

  const trackingUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/order/track/${order.order_code}`;
  const qrDataUrl = await QRCode.toDataURL(trackingUrl || order.order_code, { margin: 1, width: 200 });

  const pdfBuffer = await renderToBuffer(
    InvoiceDocument({
      order: order as Order,
      tenant: tenant as Tenant,
      table: table as RestaurantTable | null,
      customerName: customer?.name ?? null,
      customerMobile: customer?.mobile_number ?? null,
      items,
      invoiceNumber,
      qrDataUrl,
    }) as any
  );

  const storagePath = `${order.tenant_id}/${order.order_code}.pdf`;
  const { error: uploadErr } = await supabaseAdmin.storage
    .from('invoices')
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true });

  if (uploadErr) return { url: null, error: uploadErr.message };

  const { data: publicUrlData } = supabaseAdmin.storage.from('invoices').getPublicUrl(storagePath);
  const pdfUrl = publicUrlData.publicUrl;

  const { error: insertErr } = await supabaseAdmin.from('invoices').upsert(
    {
      order_id: order.id,
      tenant_id: order.tenant_id,
      invoice_number: invoiceNumber,
      pdf_url: pdfUrl,
    },
    { onConflict: 'order_id' }
  );

  if (insertErr) return { url: null, error: insertErr.message };

  return { url: pdfUrl, error: null };
}