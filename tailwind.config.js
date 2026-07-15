/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        royal: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#1E3A8A',
          800: '#1e2d6e',
          900: '#172554',
          950: '#11193b',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#D97706',
          600: '#b45309',
          700: '#92400e',
          800: '#78350f',
          900: '#451a03',
        },
        canvas: '#f6f7fb',
        ink: '#0f172a',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.10)',
        cardLg: '0 1px 3px 0 rgba(15,23,42,0.05), 0 18px 40px -16px rgba(30,58,138,0.18)',
        ring: '0 0 0 4px rgba(30,58,138,0.10)',
        gold: '0 10px 30px -10px rgba(217,119,6,0.45)',
      },
      borderRadius: {
        '2.5xl': '1.25rem',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseRing: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(217,119,6,0.35)' },
          '50%': { boxShadow: '0 0 0 8px rgba(217,119,6,0)' },
        },
        floatUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        slideIn: 'slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        slideOut: 'slideOut 0.25s ease-in forwards',
        fadeIn: 'fadeIn 0.3s ease-out',
        scaleIn: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 2.5s linear infinite',
        pulseRing: 'pulseRing 2s ease-out infinite',
        floatUp: 'floatUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};
