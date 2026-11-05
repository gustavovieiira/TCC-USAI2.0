import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // Nomes herdados da primeira identidade (papel, tinta, barro, jade...), agora apontando para as
        // cores de "A Fachada". As telas do app foram escritas com estes nomes; remapear aqui muda o app todo
        // de uma vez, e cada tela é depois refinada à mão. Telas do app são "de trabalho": fundo claro e frio,
        // cartões brancos e a cor viva só onde há ação.
        paper: {
          DEFAULT: '#EDF2F0',
          surface: '#FFFFFF',
          line: '#D3DEDB',
          dark: '#092A31',
          'dark-surface': '#0D3B44',
          'dark-line': '#1B6672',
        },
        ink: {
          DEFAULT: '#0B2A30',
          soft: '#36565B',
          faint: '#4E676C',
          inverse: '#FFF8EC',
          'inverse-soft': '#B7CFCB',
        },
        barro: {
          100: '#FFE6DF',
          400: '#FF8A6E',
          500: '#FF6B4A',
          700: '#B8361A',
          900: '#3D1A12',
        },
        jade: {
          100: '#DFF2E6',
          300: '#6BC28A',
          500: '#1E6B3E',
          700: '#14502D',
          900: '#0F3A22',
        },
        mostarda: {
          100: '#FFEFC9',
          500: '#FFC24B',
          700: '#7A5200',
        },
        carmim: {
          100: '#FFE3DD',
          500: '#B3261E',
          700: '#8C1D18',
        },
        roxo: {
          100: '#E4DCEB',
          500: '#5A4478',
        },
        // "A Fachada": prédio visto à noite. Petróleo (céu e prédio), coral (a parede pintada e a ação),
        // açafrão (a luz das janelas) e verde-folha (disponível).
        fachada: {
          noite: '#0D3B44',
          'noite-fundo': '#092A31',
          predio: '#14505B',
          'predio-claro': '#1B6672',
          luz: '#FFC24B',
          'luz-clara': '#FFE19A',
          'luz-escura': '#C98A12',
          coral: '#FF6B4A',
          'coral-escuro': '#D94A2B',
          'coral-texto': '#B8361A',
          folha: '#6BC28A',
          'folha-escura': '#2F8F57',
          'folha-texto': '#1E6B3E',
          papel: '#FFF8EC',
          'papel-suave': '#B7CFCB',
          tinta: '#0B2A30',
          'tinta-suave': '#36565B',
        },
      },
      fontFamily: {
        marca: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        mao: ['Caveat', '"Segoe Script"', 'cursive'],
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Public Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        meta: ['"Public Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '12px',
        lg: '18px',
      },
      boxShadow: {
        paper: '0 1px 2px rgb(11 42 48 / .06), 0 12px 24px -16px rgb(11 42 48 / .28)',
        'paper-2': '0 2px 4px rgb(11 42 48 / .08), 0 24px 38px -22px rgb(11 42 48 / .4)',
        press: '0 10px 18px -8px rgb(184 54 26 / .55)',
      },
      backgroundImage: {
        // Sem textura de fundo no app: o fundo é uma cor lisa.
        cortica: 'none',
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
    // `notch` era o canto recortado da primeira identidade. Agora é o canto arredondado de "A Fachada":
    // mantém o nome (são dezenas de usos) e troca o recorte por raio de borda.
    plugin(({ matchUtilities }) =>
      matchUtilities(
        {
          notch: (v: string) => ({ borderRadius: v }),
        },
        { values: { sm: '10px', DEFAULT: '16px', lg: '22px', xl: '28px' } },
      ),
    ),
  ],
} satisfies Config;
