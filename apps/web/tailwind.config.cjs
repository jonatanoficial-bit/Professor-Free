/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#ff6a00",
          700: "#e85f00",
          900: "#b34700"
        }
      }
    }
  },
  plugins: []
};