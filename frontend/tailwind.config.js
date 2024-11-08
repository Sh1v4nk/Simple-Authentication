/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      animation: {
        'border': 'border 6s linear infinite',
      },
      keyframes: {
        'border': {
          to: { '--border-angle': '360deg' },
        },
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"]
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
