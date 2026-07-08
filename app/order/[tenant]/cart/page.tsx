import { notFound, redirect } from 'next/navigation';
import { getTenantBySubdomain, isValidCounterToken } from '@/lib/queries';
import BrandHeader from '@/components/BrandHeader';
import CartView from '@/components/CartView';
import RequireMobile from '@/components/RequireMobile';

export default async function CartPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ t?: string; ct?: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const { t, ct } = await searchParams;

  if (!t && !ct) {
    redirect(`/order/${tenantSlug}`);
  }

  const tenant = await getTenantBySubdomain(tenantSlug);
  if (!tenant) notFound();

  if (ct) {
    const valid = await isValidCounterToken(tenant.id, ct);
    if (!valid) redirect(`/order/${tenantSlug}`);
  }

  const tokenQuery = ct ? `?ct=${encodeURIComponent(ct)}` : `?t=${encodeURIComponent(t!)}`;

  return (
    <RequireMobile tenantSlug={tenantSlug} redirectQuery={tokenQuery}>
      <BrandHeader tenant={tenant} />
      <h1 className="font-display text-2xl text-ink px-5 pt-5">Your order</h1>
      <CartView
        checkoutHref={`/order/${tenantSlug}/checkout${tokenQuery}`}
        menuHref={`/order/${tenantSlug}/menu${tokenQuery}`}
      />
    </RequireMobile>
  );
}