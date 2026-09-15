import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#d9edff',
          200: '#bce0ff',
          300: '#8ecdff',
          400: '#59b1ff',
          500: '#3390ff',
          600: '#1c6ff5',
          700: '#1758e0',
          800: '#1a48b5',
          900: '#1b408e',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
