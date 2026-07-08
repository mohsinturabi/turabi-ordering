import Image from 'next/image';
import type { Tenant } from '@/lib/types';

export default function BrandHeader({ tenant }: { tenant: Tenant | null }) {
  return (
    <header className="flex items-center gap-3 px-5 py-4 border-b border-line">
      {tenant?.logo_url ? (
        <Image
          src={tenant.logo_url}
          alt={`${tenant.name} logo`}
          width={36}
          height={36}
          className="rounded-chit object-cover"
        />
      ) : (
        <div className="w-9 h-9 rounded-chit bg-accent-soft flex items-center justify-center">
          <span className="font-display italic text-accent text-lg">
            {tenant?.name?.[0] ?? '·'}
          </span>
        </div>
      )}
      <span className="font-display text-lg text-ink truncate">
        {tenant?.name ?? 'Loading…'}
      </span>
    </header>
  );
}
