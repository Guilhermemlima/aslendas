import type { Config } from 'tailwindcss'

/**
 * As cores vivem em CSS variables (ver globals.css) para que a paleta possa ser
 * trocada em runtime pelo painel administrativo, sem rebuild.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: 'rgb(var(--c-cream) / <alpha-value>)',
        blush: 'rgb(var(--c-blush) / <alpha-value>)',
        rose: {
          50: 'rgb(var(--c-rose-50) / <alpha-value>)',
          100: 'rgb(var(--c-rose-100) / <alpha-value>)',
          300: 'rgb(var(--c-rose-300) / <alpha-value>)',
          500: 'rgb(var(--c-rose-500) / <alpha-value>)',
          700: 'rgb(var(--c-rose-700) / <alpha-value>)',
        },
        lilac: {
          100: 'rgb(var(--c-lilac-100) / <alpha-value>)',
          300: 'rgb(var(--c-lilac-300) / <alpha-value>)',
          500: 'rgb(var(--c-lilac-500) / <alpha-value>)',
        },
        gold: 'rgb(var(--c-gold) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--c-ink) / <alpha-value>)',
          soft: 'rgb(var(--c-ink-soft) / <alpha-value>)',
          faint: 'rgb(var(--c-ink-faint) / <alpha-value>)',
        },
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        hand: ['var(--font-hand)', 'cursive'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        card: '1.75rem',
      },
      boxShadow: {
        soft: '0 2px 8px -2px rgb(var(--c-shadow) / 0.10), 0 12px 32px -12px rgb(var(--c-shadow) / 0.18)',
        lift: '0 8px 20px -6px rgb(var(--c-shadow) / 0.16), 0 24px 60px -24px rgb(var(--c-shadow) / 0.28)',
        polaroid: '0 1px 2px rgb(var(--c-shadow) / 0.18), 0 10px 24px -10px rgb(var(--c-shadow) / 0.35)',
        inset: 'inset 0 1px 0 rgb(255 255 255 / 0.55)',
      },
      backgroundImage: {
        'gradient-romance':
          'linear-gradient(135deg, rgb(var(--c-rose-100)) 0%, rgb(var(--c-cream)) 45%, rgb(var(--c-lilac-100)) 100%)',
        'gradient-gold':
          'linear-gradient(120deg, rgb(var(--c-gold) / 0.9), rgb(var(--c-rose-300) / 0.9))',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.15', transform: 'scale(0.85)' },
          '50%': { opacity: '0.85', transform: 'scale(1)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        twinkle: 'twinkle 4s ease-in-out infinite',
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
