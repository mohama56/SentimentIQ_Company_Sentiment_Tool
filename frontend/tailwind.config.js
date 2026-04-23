/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette matching the dashboard design
        brand: {
          50:  '#e6f1fb',
          100: '#b5d4f4',
          400: '#378add',
          600: '#185fa5',
          800: '#0c447c',
        },
      },
    },
  },
  plugins: [],
}
