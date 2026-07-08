import { notFound, redirect } from 'next/navigation';
import { getTenantBySubdomain, getMenu, isValidCounterToken } from '@/lib/queries';
import BrandHeader from '@/components/BrandHeader';
import MenuBrowser from '@/components/MenuBrowser';
import RequireMobile from '@/components/RequireMobile';

export default async function MenuPage({
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

  const { categories, items } = await getMenu(tenant.id);
  const tokenQuery = ct ? `?ct=${encodeURIComponent(ct)}` : `?t=${encodeURIComponent(t!)}`;
  const cartHref = `/order/${tenantSlug}/cart${tokenQuery}`;

  return (
    <RequireMobile tenantSlug={tenantSlug} redirectQuery={tokenQuery}>
      <BrandHeader tenant={tenant} />
      <MenuBrowser categories={categories} items={items} cartHref={cartHref} />
    </RequireMobile>
  );
}