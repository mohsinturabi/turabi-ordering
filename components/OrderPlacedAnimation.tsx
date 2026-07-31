'use client';

import { useEffect, useState } from 'react';

export default function OrderPlacedAnimation() {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(true), []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 relative">
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <span
            key={i}
            className="absolute w-2 h-2 rounded-full bg-accent"
            style={{
              top: '50%',
              left: '50%',
              animation: show ? `confetti-${i % 5} 0.9s ease-out forwards` : 'none',
              animationDelay: `${i * 0.03}s`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      <div
        className={`w-24 h-24 rounded-full bg-ink flex items-center justify-center transition-transform duration-500 ${
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

      <p
        className={`font-display text-xl text-ink transition-opacity duration-500 delay-700 ${
          show ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Order placed!
      </p>
      <p
        className={`text-sm text-muted transition-opacity duration-500 delay-700 ${
          show ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Taking you to your order…
      </p>
    </div>
  );
}
