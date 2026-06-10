/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
          100: '#F8FAFC',
        },
        youtube: {
          red: '#EF4444',
          hover: '#DC2626',
        }
      },
    },
  },
  plugins: [],
}
