/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        moon: {
          black: '#0A0A0A',
          dark: '#141414',
          gray: '#1F1F1F',
          border: '#2A2A2A',
          text: '#E5E5E5',
          muted: '#999999',
          accent: '#FFFFFF',
          gold: '#D4AF37',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
