'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getMobileNumber } from '@/lib/storage';

export default function RequireMobile({
  tenantSlug,
  redirectQuery,
  children,
}: {
  tenantSlug: string;
  redirectQuery: string; // e.g. '?t=abc' or '?ct=xyz'
  children: ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mobile = getMobileNumber(tenantSlug);
    if (!mobile) {
      router.replace(`/order/${tenantSlug}${redirectQuery}`);
      return;
    }
    setReady(true);
  }, [tenantSlug, redirectQuery, router]);

  if (!ready) return null;
  return <>{children}</>;
}