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
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,22,34,.05), 0 10px 24px -18px rgba(15,22,34,.4)',
        'soft-lg': '0 2px 4px rgba(15,22,34,.06), 0 22px 44px -22px rgba(15,22,34,.5)',
      },
    },
  },
  plugins: [],
} satisfies Config;
