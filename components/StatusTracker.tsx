import type { OrderStatus } from '@/lib/types';

// DB status -> customer-facing label. "Pending" reads as "Received" to the
// customer — the order is confirmed on their end the moment it's placed.
const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'Pending', label: 'Received' },
  { status: 'Accepted', label: 'Accepted' },
  { status: 'Preparing', label: 'Preparing' },
  { status: 'Ready', label: 'Ready' },
  { status: 'Completed', label: 'Completed' },
];

export default function StatusTracker({ status }: { status: OrderStatus }) {
  if (status === 'Cancelled') {
    return (
      <div className="rounded-chit border border-accent bg-accent-soft px-4 py-3">
        <p className="font-medium text-accent">Order cancelled</p>
        <p className="text-sm text-ink/70 mt-1">
          Ask the counter if you're not sure why — they can start a new order for you.
        </p>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <ol className="flex flex-col gap-0">
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const upcoming = i > currentIndex;
        return (
          <li key={step.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={[
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono shrink-0',
                  done && 'bg-success text-paper',
                  active && 'bg-accent text-paper',
                  upcoming && 'bg-line text-muted',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {done ? '✓' : i + 1}
              </span>
              {i < STEPS.length - 1 && (
                <span className={`w-px flex-1 min-h-6 ${done ? 'bg-success' : 'bg-line'}`} />
              )}
            </div>
            <div className="pb-6">
              <p
                className={[
                  'font-medium',
                  active ? 'text-ink' : done ? 'text-ink/70' : 'text-muted',
                ].join(' ')}
              >
                {step.label}
              </p>
              {active && (
                <p className="text-sm text-muted mt-0.5">This updates automatically.</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
