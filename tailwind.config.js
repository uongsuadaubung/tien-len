/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        container: 'var(--bg-container)',
        card: {
          DEFAULT: 'var(--bg-card)',
          hover: 'var(--bg-card-hover)',
          active: 'var(--bg-card-active)',
        },
        input: 'var(--bg-input)',
        gold: {
          DEFAULT: 'var(--color-gold)',
          hover: 'var(--color-gold-hover)',
          dim: 'var(--color-gold-dim)',
          text: 'var(--color-gold-text)',
          border: 'var(--color-gold-border)',
        },
        tprimary: 'var(--text-primary)',
        tsecondary: 'var(--text-secondary)',
        tmuted: 'var(--text-muted)',
        tdim: 'var(--text-dim)',
      }
    }
  },
  plugins: [],
};
