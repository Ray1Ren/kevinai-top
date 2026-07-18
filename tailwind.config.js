/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        graphite: {
          50: '#f6f6f5',
          100: '#e7e7e6',
          200: '#d1d1cf',
          300: '#b0b0ad',
          400: '#888885',
          500: '#6d6d6a',
          600: '#5d5d5a',
          700: '#4f4f4c',
          800: '#3d3d3b',
          900: '#2a2a28',
          950: '#141413',
        },
        pitch: {
          300: '#b8d96e',
          400: '#a3cf4a',
          500: '#8ab82f',
          600: '#6c9324',
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
