/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        claude: {
          bg: '#fbfaf8',
          sidebar: '#f3f2ef',
          text: '#1a1a1a',
          accent: '#d97757',
        }
      }
    },
  },
  plugins: [],
}
