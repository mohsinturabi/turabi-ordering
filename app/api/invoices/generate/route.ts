import { NextResponse } from 'next/server';
import { generateInvoiceForOrder } from '@/lib/invoice';

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 });

    const { url, error } = await generateInvoiceForOrder(orderId);
    if (error) return NextResponse.json({ error }, { status: 500 });

    return NextResponse.json({ url });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('invoices/generate failed', err);
    return NextResponse.json({ error: 'Could not generate invoice' }, { status: 500 });
  }
}