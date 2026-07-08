import Script from 'next/script';
import { CartProvider } from '@/lib/cart-context';

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  return (
    <CartProvider tenantSlug={tenant}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="min-h-screen max-w-md mx-auto flex flex-col">{children}</div>
    </CartProvider>
  );
}