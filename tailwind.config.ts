import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#edfcf2', 100: '#d3f8e2', 200: '#aaf0c9', 300: '#73e3ac',
          400: '#3dcf8a', 500: '#1ab56e', 600: '#0e9358', 700: '#0c7848',
          800: '#0d5f3a', 900: '#0c4e31', 950: '#062b1c',
        },
        forest: {
          DEFAULT: '#162B20', dark: '#0D2018', light: '#1E3D2C',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(22,43,32,0.06), 0 1px 2px rgba(22,43,32,0.04)',
        'card-hover': '0 4px 16px rgba(22,43,32,0.1), 0 2px 6px rgba(22,43,32,0.06)',
        modal: '0 20px 60px rgba(0,0,0,0.2)',
      },
      borderRadius: { xl: '12px', '2xl': '16px', '3xl': '20px' },
    },
  },
  plugins: [],
};
export default config;
