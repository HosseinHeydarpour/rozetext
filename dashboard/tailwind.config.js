/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        paper: '#F3EDE2',
        surface: '#FBF8F2',
        ink: '#17130F',
        muted: '#6E6257',
        line: '#DCD2C3',
        accent: '#8E2F2F',
        'accent-soft': '#E8D6CE',
      },
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', 'sans-serif'],
        display: ['"Noto Naskh Arabic"', 'serif'],
      },
    },
  },
  plugins: [],
}
