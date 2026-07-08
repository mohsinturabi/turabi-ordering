import { FILTERABLE_STATUSES } from '@/lib/order-status';
import type { OrderStatus } from '@/lib/types';

export default function StatusFilterTabs({
  active,
  counts,
  onChange,
}: {
  active: 'all' | OrderStatus;
  counts: Record<string, number>;
  onChange: (value: 'all' | OrderStatus) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {FILTERABLE_STATUSES.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={[
            'shrink-0 px-5 py-3 rounded-full text-base font-semibold border-2 transition-colors',
            active === tab.value
              ? 'bg-ink text-paper border-ink'
              : 'bg-white text-ink border-line',
          ].join(' ')}
        >
          {tab.label}
          {counts[tab.value] ? (
            <span className="ml-2 opacity-70">{counts[tab.value]}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
