/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        admin: {
          primary: "#0f172a",
          secondary: "#1e293b",
          accent: "#3b82f6"
        }
      }
    },
  },
  plugins: [],
}
