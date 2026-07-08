import { notFound, redirect } from 'next/navigation';
import { getTenantBySubdomain, getTableByToken, isValidCounterToken } from '@/lib/queries';
import BrandHeader from '@/components/BrandHeader';
import CheckoutForm from '@/components/CheckoutForm';
import RequireMobile from '@/components/RequireMobile';

function SuspendedNotice({ tenant }: { tenant: { name: string } }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 px-6 py-16">
      <p className="font-display text-2xl text-ink">Orders abhi accept nahi ho rahe</p>
      <p className="text-muted max-w-sm">
        {tenant.name} abhi orders accept nahi kar raha hai. Kripya seedha staff se baat karein ya thodi der baad try karein.
      </p>
    </div>
  );
}

export default async function CheckoutPage({
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

  // Suspended restaurants can't take new orders — show a message instead
  // of the checkout form, regardless of table vs counter flow.
  if (tenant.subscription_status === 'suspended') {
    return (
      <>
        <BrandHeader tenant={tenant} />
        <SuspendedNotice tenant={tenant} />
      </>
    );
  }

  if (ct) {
    const valid = await isValidCounterToken(tenant.id, ct);
    if (!valid) redirect(`/order/${tenantSlug}`);

    const tokenQuery = `?ct=${encodeURIComponent(ct)}`;
    return (
      <RequireMobile tenantSlug={tenantSlug} redirectQuery={tokenQuery}>
        <BrandHeader tenant={tenant} />
        <CheckoutForm tenant={tenant} table={null} isCounter />
      </RequireMobile>
    );
  }

  const table = await getTableByToken(tenant.id, t!);
  if (!table) {
    redirect(`/order/${tenantSlug}`);
  }

  const tokenQuery = `?t=${encodeURIComponent(t!)}`;

  return (
    <RequireMobile tenantSlug={tenantSlug} redirectQuery={tokenQuery}>
      <BrandHeader tenant={tenant} />
      <CheckoutForm tenant={tenant} table={table!} isCounter={false} />
    </RequireMobile>
  );
}