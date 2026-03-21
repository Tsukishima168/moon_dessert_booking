/** @type {import('tailwindcss').Config} */
const colorVar = (variableName) => `rgb(var(${variableName}) / <alpha-value>)`

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
          black: colorVar('--moon-black'),
          dark: colorVar('--moon-dark'),
          gray: colorVar('--moon-gray'),
          border: colorVar('--moon-border'),
          text: colorVar('--moon-text'),
          muted: colorVar('--moon-muted'),
          accent: colorVar('--moon-accent'),
          gold: colorVar('--moon-gold'),
        },
        background: colorVar('--background'),
        foreground: colorVar('--foreground'),
        card: colorVar('--card'),
        'card-foreground': colorVar('--card-foreground'),
        popover: colorVar('--popover'),
        'popover-foreground': colorVar('--popover-foreground'),
        primary: colorVar('--primary'),
        'primary-foreground': colorVar('--primary-foreground'),
        secondary: colorVar('--secondary'),
        'secondary-foreground': colorVar('--secondary-foreground'),
        muted: colorVar('--muted'),
        'muted-foreground': colorVar('--muted-foreground'),
        accent: colorVar('--accent'),
        'accent-foreground': colorVar('--accent-foreground'),
        destructive: colorVar('--destructive'),
        border: colorVar('--border'),
        input: colorVar('--input'),
        ring: colorVar('--ring'),
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'var(--radius-md)',
        sm: 'calc(var(--radius-md) - 2px)',
        xl: 'calc(var(--radius) + 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
