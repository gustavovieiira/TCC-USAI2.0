import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#EFE8DD',
          surface: '#FFFCF7',
          line: '#E2D8CA',
          dark: '#171310',
          'dark-surface': '#201A16',
          'dark-line': '#38302A',
        },
        ink: {
          DEFAULT: '#241D18',
          soft: '#5C5049',
          faint: '#8E7A6C',
          inverse: '#F2EAE0',
          'inverse-soft': '#BEB0A4',
        },
        barro: {
          100: '#F6E2D8',
          400: '#E0764E',
          500: '#B4502F',
          700: '#8E3C22',
          900: '#3A241B',
        },
        jade: {
          100: '#DCEBE4',
          300: '#5FBFA2',
          500: '#1F6F5C',
          700: '#14483B',
          900: '#14332B',
        },
        mostarda: {
          100: '#F3E6C8',
          500: '#A97208',
          700: '#6B4906',
        },
        carmim: {
          100: '#F7DEDE',
          500: '#A62B33',
          700: '#7C1F26',
        },
        roxo: {
          100: '#E4DCEB',
          500: '#5A4478',
        },
      },
      fontFamily: {
        display: ['"Zilla Slab"', 'Georgia', 'serif'],
        sans: ['"Public Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        meta: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        lg: '12px',
      },
      boxShadow: {
        paper: '0 2px 0 #E2D8CA, 0 8px 20px -14px rgb(74 58 46 / .25)',
        'paper-2': '0 3px 0 #D6C6B0, 0 16px 28px -16px rgb(74 58 46 / .35)',
        press: '0 3px 0 #7A3219',
      },
      backgroundImage: {
        cortica: 'radial-gradient(#DCCFBD 1px, transparent 1.3px)',
      },
      backgroundSize: {
        'cortica-grid': '14px 14px',
      },
      keyframes: {
        usaiPulse: {
          '0%, 100%': { opacity: '.45' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        usaiPulse: 'usaiPulse 1.2s infinite',
      },
    },
  },
  plugins: [
    // Motivo assinatura: canto inferior direito recortado a 45° — ver docs/design-system.md
    plugin(({ matchUtilities }) =>
      matchUtilities(
        {
          notch: (v: string) => ({
            clipPath: `polygon(0 0,100% 0,100% calc(100% - ${v}),calc(100% - ${v}) 100%,0 100%)`,
          }),
        },
        { values: { sm: '8px', DEFAULT: '14px', lg: '20px', xl: '26px' } },
      ),
    ),
  ],
} satisfies Config;
