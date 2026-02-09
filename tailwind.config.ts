import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        playfair: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans: ['var(--font-playfair)', 'Georgia', 'serif'],
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      colors: {
        wedding: {
          gold: '#7A9C96', // Verde scuro per titoli e pulsanti (allineato allo sfondo)
          'gold-light': '#A2B5B0', // Verde medio per hover
          'sage-light': '#D3E8E6', // Verde pastello chiaro
          'sage-medium': '#A2B5B0', // Verde foglia medio
          'sage-dark': '#7A9C96', // Verde foglia scuro
          'accent-gold': '#D4AF37', // Oro per accenti speciali
          cream: '#FAF8F3', // Crema delicato
          white: '#FFFFFF',
        },
      },
    },
  },
  plugins: [],
}
export default config
