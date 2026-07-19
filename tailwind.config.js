/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        white: 'rgb(var(--color-strong) / <alpha-value>)',
        paper: '#ffffff',
        graphite: {
          50: 'rgb(var(--graphite-50) / <alpha-value>)',
          100: 'rgb(var(--graphite-100) / <alpha-value>)',
          200: 'rgb(var(--graphite-200) / <alpha-value>)',
          300: 'rgb(var(--graphite-300) / <alpha-value>)',
          400: 'rgb(var(--graphite-400) / <alpha-value>)',
          500: 'rgb(var(--graphite-500) / <alpha-value>)',
          600: 'rgb(var(--graphite-600) / <alpha-value>)',
          700: 'rgb(var(--graphite-700) / <alpha-value>)',
          800: 'rgb(var(--graphite-800) / <alpha-value>)',
          900: 'rgb(var(--graphite-900) / <alpha-value>)',
          950: 'rgb(var(--graphite-950) / <alpha-value>)',
        },
        pitch: {
          300: 'rgb(var(--pitch-300) / <alpha-value>)',
          400: 'rgb(var(--pitch-400) / <alpha-value>)',
          500: 'rgb(var(--pitch-500) / <alpha-value>)',
          600: 'rgb(var(--pitch-600) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
