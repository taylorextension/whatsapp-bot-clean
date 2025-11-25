/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./client/index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: '#030304',
        carbon: '#0B0C0E',
        subtle: 'rgba(255, 255, 255, 0.08)',
        active: 'rgba(255, 255, 255, 0.2)',
        primary: {
          DEFAULT: '#3b82f6',
          glow: '#60a5fa',
        },
        neon: {
          orange: '#F97316',
        }
      },
      animation: {
        'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'border-beam': {
          '100%': {
            'offset-distance': '100%',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'plasma': 'linear-gradient(180deg, #3b82f6 0%, #60a5fa 100%)',
      },
    },
  },
  plugins: [],
}
