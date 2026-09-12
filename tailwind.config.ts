import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'yt-red': '#ff0000',
        'yt-dark': '#0f0f0f',
        'yt-card': '#1a1a1a',
        'yt-border': '#2a2a2a',
        'yt-hover': '#222222',
      },
    },
  },
  plugins: [],
}
export default config
