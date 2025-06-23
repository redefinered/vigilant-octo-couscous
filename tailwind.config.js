/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        'acc-red': '#dc2626',
        'acc-green': '#16a34a',
        'acc-blue': '#2563eb',
        'acc-yellow': '#ca8a04',
      },
      fontFamily: {
        'racing': ['Orbitron', 'monospace'],
      },
    },
  },
  plugins: [],
  darkMode: 'class',
} 