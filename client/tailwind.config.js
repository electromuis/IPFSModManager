/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx,vue}",
  ],
  theme: {
    extend: {
      colors: {
        'blue': '#3AAFA9',
        'lightblue': '#E6F4F4',
        'grey': '#566464'
      }
    },
  },
  plugins: [],
}

