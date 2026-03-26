/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1a3c2e',
        'primary-light': '#2c5e4a',
        'primary-dark': '#0f2a20',
        accent: '#4caf7d',
        background: '#f8f9fa',
      },
    },
  },
  plugins: [],
}