/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        arcade: {
          black:  'var(--arcade-black)',
          gold:   'var(--arcade-gold)',
          green:  'var(--arcade-green)',
          red:    'var(--arcade-red)',
          blue:   'var(--arcade-blue)',
          dim:    'var(--arcade-dim)',
          border: 'var(--arcade-border)',
          muted:  'var(--arcade-muted)',
        },
      },
      fontFamily: { mono: ['Courier New', 'monospace'] },
      boxShadow: {
        gold:  '0 0 12px rgba(var(--arcade-gold-rgb), 0.4)',
        green: '0 0 12px rgba(var(--arcade-green-rgb), 0.4)',
        neon:  '0 0 20px rgba(var(--arcade-gold-rgb), 0.6), 0 0 40px rgba(var(--arcade-gold-rgb), 0.2)',
      },
      animation: {
        'number-tick':  'numberTick 0.3s ease-out',
        'scanline':     'scanline 4s linear infinite',
        'pulse-gold':   'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        numberTick: { '0%': { transform: 'translateY(-8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        scanline:   { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100vh)' } },
        pulseGold:  { '0%,100%': { boxShadow: '0 0 8px rgba(var(--arcade-gold-rgb), 0.3)' }, '50%': { boxShadow: '0 0 24px rgba(var(--arcade-gold-rgb), 0.8)' } },
      },
    },
  },
  plugins: [],
};
