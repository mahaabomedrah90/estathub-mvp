/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.5rem",
        sm: "1.5rem",
        lg: "2rem",
        xl: "2rem",
        "2xl": "2rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1200px",
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        // New brand identity
        'brand-primary': '#1F1F4B',   // dark indigo from the new identity
        'brand-accent': '#48D1C5',    // aqua / teal from the new identity

        // Supporting palette
        'brand-primary-soft': '#2A2A66',
        'brand-accent-soft': '#DDF8F5',

        // Surfaces
        'surface-base': '#F5F5F5',
        'surface-card': '#FFFFFF',
        'surface-muted': '#F8FAFC',

        // Text
        'text-strong': '#111827',
        'text-body': '#374151',
        'text-muted': '#6B7280',
        'text-on-dark': '#F9FAFB',

        // Borders / lines
        'border-soft': '#E5E7EB',
      },

      fontFamily: {
        sans: ['Lama Sans', 'Inter', 'sans-serif'],
        arabic: ['Lama Sans', 'Inter', 'sans-serif'],
        english: ['Lama Sans', 'Inter', 'sans-serif'],
      },

      borderRadius: {
        sm: '0.375rem',
        DEFAULT: '0.75rem',
        md: '0.875rem',
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },

      boxShadow: {
        soft: '0 8px 30px rgba(17, 24, 39, 0.08)',
        card: '0 10px 25px rgba(17, 24, 39, 0.08)',
        elevated: '0 16px 40px rgba(17, 24, 39, 0.12)',
      },

      maxWidth: {
        content: '1200px',
        reading: '72ch',
      },

      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        26: '6.5rem',
        30: '7.5rem',
      },

      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}