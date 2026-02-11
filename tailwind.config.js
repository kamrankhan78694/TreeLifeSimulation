/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.html'],
  theme: {
    extend: {
      colors: {
        'panel': 'rgba(17, 24, 39, 0.94)',
        'panel-2': 'rgba(31, 41, 55, 0.6)',
        'sim-bg': '#0b1220',
        'success': '#22c55e',
        'warning': '#f59e0b',
        'error': '#ef4444',
        'stable-color': '#84cc16',
        'recovering-color': '#eab308',
      },
      width: {
        'panel': '21.25rem',
      },
      spacing: {
        'panel-gap': '1rem',
      },
    }
  },
  plugins: [],
}

