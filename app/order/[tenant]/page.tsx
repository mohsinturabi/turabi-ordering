import { notFound } from 'next/navigation';
import { getTenantBySubdomain, getTableByToken, isValidCounterToken } from '@/lib/queries';
import BrandHeader from '@/components/BrandHeader';
import OnboardingFlow from '@/components/OnboardingFlow';

export default async function TenantLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ t?: string; ct?: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const { t, ct } = await searchParams;

  const tenant = await getTenantBySubdomain(tenantSlug);
  if (!tenant) notFound();

  // Counter QR flow — no specific table, customer picks up from counter.
  if (ct) {
    const isCounter = await isValidCounterToken(tenant.id, ct);
    return (
      <>
        <BrandHeader tenant={tenant} />
        <OnboardingFlow tenant={tenant} table={null} token={ct} isCounter={isCounter} />
      </>
    );
  }

  // Table QR flow — unchanged.
  const table = t ? await getTableByToken(tenant.id, t) : null;

  return (
    <>
      <BrandHeader tenant={tenant} />
      <OnboardingFlow tenant={tenant} table={table} token={t ?? ''} isCounter={false} />
    </>
  );
}