/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: '#0A0B0F',
          card: '#12141B',
          rule: '#232733',
          ruleFaint: '#1A1D26',
        },
        ink: {
          DEFAULT: '#E8EAF0',
          muted: '#8B92A6',
        },
        accent: {
          DEFAULT: '#2DD4BF',
          dim: '#20A99A',
        },
        status: {
          active: '#F5A623',
          released: '#2DD4BF',
          reclaimed: '#8B92A6',
        },
        danger: {
          DEFAULT: '#F2545B',
          dim: '#C7434A',
        },
      },
      fontFamily: {
        display: ['"IBM Plex Mono"', 'monospace'],
        body: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
