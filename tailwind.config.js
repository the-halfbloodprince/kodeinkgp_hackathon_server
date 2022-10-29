/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bgBlack': '#0D0C0F',
        'cardBlack':  '#1A1B1E',
        'cyanBlue': '#1BD6EB',
        'purple': '#9168E9',
        'green': '#CAFC01',
        'red': '#F9A08C'
      },
      backgroundImage: (theme) => ({
        'purpleGradient': 'linear-gradient(68.1deg, #C776FF 3.88%, #8D3CFF 103.27%)',
      })
    },
  },
  plugins: [],
}
