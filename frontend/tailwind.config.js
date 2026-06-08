/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        base: '#0b0f19',
        surface: '#131520',
        card: '#161925',
        'card-hover': '#1b1f2e',
        border: '#1e293b',
        'border-bright': '#334155',
        violet: {
          DEFAULT: '#7c3aed',
          light: '#8b5cf6',
          dark: '#6d28d9',
          glow: 'rgba(124,58,237,0.25)',
        },
        indigo: {
          DEFAULT: '#4f46e5',
          light: '#6366f1',
          dark: '#3730a3',
          glow: 'rgba(79,70,229,0.3)',
        },
        teal: {
          DEFAULT: '#14b8a6',
          glow: 'rgba(20,184,166,0.3)'
        },
        cyan: {
          DEFAULT: '#06b6d4',
          light: '#22d3ee',
          glow: 'rgba(6,182,212,0.2)',
        },
        text: {
          primary: '#f8fafc',
          muted: '#94a3b8',
          faint: '#475569',
        },
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #4f46e5 0%, #14b8a6 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(79,70,229,0.1) 0%, rgba(20,184,166,0.05) 100%)',
        'gradient-surface': 'linear-gradient(180deg, #131520 0%, #0b0f19 100%)',
        'mesh-glow': 'radial-gradient(ellipse at 20% 50%, rgba(79,70,229,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(20,184,166,0.1) 0%, transparent 50%)',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-right': 'slideRight 0.4s ease forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124,58,237,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(124,58,237,0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'glow-violet': '0 0 30px rgba(124,58,237,0.4)',
        'glow-cyan': '0 0 20px rgba(6,182,212,0.3)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.3)',
      },
    },
  },
  plugins: [],
}
