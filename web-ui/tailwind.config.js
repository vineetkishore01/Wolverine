/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#000000',
        panel: '#0a0a0a',
        'panel-light': '#111111',
        accent: '#ffffff',
        'accent-dim': '#888888',
        text: '#ffffff',
        dim: '#555555',
        border: '#1a1a1a',
        success: '#00ff9d',
        info: '#00d4ff',
        warning: '#ffcc00',
        'user-bubble': '#1a1a1a',
        'bot-bubble': '#000000',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Segoe UI"', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}