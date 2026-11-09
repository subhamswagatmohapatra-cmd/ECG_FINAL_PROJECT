/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        clinical: {
          teal: '#0d9488',
          tealLight: '#14b8a6',
          cyan: '#06b6d4',
          blue: '#0284c7',
          green: '#16a34a',
          yellow: '#ca8a04',
          orange: '#ea580c',
          red: '#dc2626',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
