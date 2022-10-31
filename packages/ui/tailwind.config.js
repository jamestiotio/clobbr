const { colors } = require('./src/shared/colors.js');

module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          300: colors.primary.light,
          500: colors.primary.main,
          700: colors.primary.dark
        },
        secondary: {
          300: colors.secondary.light,
          500: colors.secondary.main,
          700: colors.secondary.dark
        }
      },

      screens: {
        'tall-sm': { raw: '(min-height: 640px)' },
        'tall-md': { raw: '(min-height: 768px)' },
        'tall-lg': { raw: '(min-height: 1024px)' },
        'tall-xl': { raw: '(min-height: 1280px)' },
        'tall-2xl': { raw: '(min-height: 1536px)' }
      }
    }
  },
  safelist: [
    {
      pattern: /max-w-./
    }
  ],
  plugins: []
};
