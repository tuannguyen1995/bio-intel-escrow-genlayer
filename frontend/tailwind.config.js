/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bio: {
          dark: '#050B14',
          card: '#0A1526',
          border: '#1E293B',
          emerald: '#10B981',
          cyan: '#06B6D4',
          amber: '#F59E0B',
          crimson: '#EF4444',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.35)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.35)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.35)',
        'glow-crimson': '0 0 20px rgba(239, 68, 68, 0.35)',
      },
      backgroundImage: {
        'grid-pattern': "radial-gradient(circle, rgba(16, 185, 129, 0.08) 1px, transparent 1px)",
        'cellular-membrane': "radial-gradient(ellipse at 50% 0%, #0c1a2e 0%, #050b14 75%)",
      }
    },
  },
  plugins: [],
}
