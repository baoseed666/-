/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        arcade: {
          black: '#0a0a0a',
          gold: '#ffdd00',
          green: '#00ff88',
          red: '#ff4444',
          blue: '#4488ff',
          dim: '#1a1a00',
          border: '#333300',
          muted: '#888844',
        },
      },
      fontFamily: { mono: ['Courier New', 'monospace'] },
      boxShadow: {
        gold: '0 0 12px rgba(255,221,0,0.4)',
        green: '0 0 12px rgba(0,255,136,0.4)',
        neon: '0 0 20px rgba(255,221,0,0.6), 0 0 40px rgba(255,221,0,0.2)',
      },
      animation: {
        'number-tick': 'numberTick 0.3s ease-out',
        'scanline': 'scanline 4s linear infinite',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        numberTick: { '0%': { transform: 'translateY(-8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        scanline: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100vh)' } },
        pulseGold: { '0%,100%': { boxShadow: '0 0 8px rgba(255,221,0,0.3)' }, '50%': { boxShadow: '0 0 24px rgba(255,221,0,0.8)' } },
      },
    },
  },
  plugins: [],
};
