import type { Config } from 'tailwindcss';

// Design tokens for the ordering flow.
// Palette is built around a "kitchen ticket" idea — the order is a chit that
// moves from counter to kitchen to table — rather than a generic food-app look.
// Base:    #FBF7F0 (warm paper)      Ink:     #24211D (near-black, warm)
// Accent:  #C1440E (chili / ticket-stamp red)   Accent-soft: #F2E4D8
// Success: #3F7D57 (herb green, used for "Ready"/"Completed")
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: '#FBF7F0',
        ink: '#24211D',
        muted: '#8A8378',
        accent: '#C1440E',
        'accent-soft': '#F2E4D8',
        line: '#E4DCCE',
        success: '#3F7D57',
        'success-soft': '#E4EEE7',
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        chit: '4px',
      },
    },
  },
  plugins: [],
};

export default config;
