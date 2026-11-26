/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        health: {
          dark: '#1B5E20',       // Deep healthcare green
          primary: '#2E7D32',    // Primary healthcare green
          light: '#4CAF50',      // Vibrant leaf green
          mint: '#E8F5E9',       // Soft mint card background
          mintborder: '#C8E6C9', // Soft mint border
        },
        surface: {
          warm: '#FAF8F5',       // Warm off-white background
          card: '#FFFFFF',       // Clean card surface
          muted: '#F0ECE4',      // Soft warm grey/beige
          dark: '#1C2826',       // High contrast dark charcoal
        },
        danger: {
          deep: '#B71C1C',       // High alert danger
          primary: '#D32F2F',    // Red warning
          light: '#FFEBEE',      // Soft red background
          border: '#FFCDD2',
        },
        accent: {
          primary: '#E65100',    // Muted orange warning
          light: '#FFF3E0',
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px -2px rgba(0, 0, 0, 0.08), 0 1px 4px -1px rgba(0, 0, 0, 0.04)',
        elevated: '0 10px 25px -5px rgba(27, 94, 32, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
