'use client';

import { useEffect, useState } from 'react';

export default function OrderPlacedAnimation({
  orderCode,
  tableLabel,
  onTrackOrder,
  onBackToMenu,
}: {
  orderCode: string;
  tableLabel: string;
  onTrackOrder: () => void;
  onBackToMenu: () => void;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(true), []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 relative bg-ink text-paper px-6 py-10">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <span
            key={i}
            className="absolute w-2 h-2 rounded-full bg-accent"
            style={{
              top: '38%',
              left: '50%',
              animation: show ? `confetti-${i % 5} 0.9s ease-out forwards` : 'none',
              animationDelay: `${i * 0.03}s`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      <div
        className={`w-24 h-24 rounded-full border-2 border-paper flex items-center justify-center transition-transform duration-500 ${
          show ? 'scale-100' : 'scale-0'
        }`}
      >
        <svg viewBox="0 0 52 52" className="w-12 h-12">
          <path
            fill="none"
            stroke="#fff"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14 27l7 7 16-16"
            style={{
              strokeDasharray: 48,
              strokeDashoffset: show ? 0 : 48,
              transition: 'stroke-dashoffset 0.6s ease 0.4s',
            }}
          />
        </svg>
      </div>

      <p className={`font-display text-2xl transition-opacity duration-500 delay-700 ${show ? 'opacity-100' : 'opacity-0'}`}>
        Order placed!
      </p>
      <p className={`text-sm text-paper/70 text-center transition-opacity duration-500 delay-700 ${show ? 'opacity-100' : 'opacity-0'}`}>
        We&apos;ve sent your order to the kitchen. Sit back, relax and we&apos;ll take it from here.
      </p>

      <div
        className={`w-full border border-paper/20 rounded-chit px-4 py-3 mt-2 transition-opacity duration-500 delay-700 ${
          show ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="text-xs uppercase tracking-wide text-paper/50 mb-2">Order Summary</p>
        <div className="flex justify-between text-sm py-0.5">
          <span className="text-paper/70">Table</span>
          <span className="font-mono">{tableLabel}</span>
        </div>
        <div className="flex justify-between text-sm py-0.5">
          <span className="text-paper/70">Order ID</span>
          <span className="font-mono">{orderCode}</span>
        </div>
      </div>

      <p className={`text-sm text-paper/60 mt-1 transition-opacity duration-500 delay-700 ${show ? 'opacity-100' : 'opacity-0'}`}>
        We&apos;ll notify you when it&apos;s ready.
      </p>

      <button
        type="button"
        onClick={onTrackOrder}
        className={`w-full bg-accent text-paper rounded-chit py-3.5 font-medium mt-3 transition-opacity duration-500 delay-700 ${
          show ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Track order →
      </button>
      <button
        type="button"
        onClick={onBackToMenu}
        className={`text-sm text-paper/70 underline mt-1 transition-opacity duration-500 delay-700 ${
          show ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Back to menu
      </button>
    </div>
  );
}
