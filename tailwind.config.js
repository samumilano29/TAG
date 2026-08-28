/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Archivo', 'Inter', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#070a12',
          900: '#0b0f19',
          800: '#121826',
          700: '#1b2334',
          600: '#2a344a',
          500: '#3b465f',
        },
        it: {
          DEFAULT: '#ef4444',
          bright: '#ff5b5b',
          deep: '#b91c1c',
        },
        safe: {
          DEFAULT: '#22c55e',
          bright: '#4ade80',
          deep: '#15803d',
        },
        pending: {
          DEFAULT: '#f59e0b',
          bright: '#fbbf24',
        },
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0.55)' },
          '50%': { boxShadow: '0 0 0 14px rgba(239,68,68,0)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'pulse-red': 'pulse-red 1.8s infinite',
        'fade-up': 'fade-up 0.4s ease-out both',
        'scale-in': 'scale-in 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'slide-down': 'slide-down 0.4s ease-out both',
        'slide-in-left': 'slide-in-left 0.25s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in 0.2s ease-out both',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};
