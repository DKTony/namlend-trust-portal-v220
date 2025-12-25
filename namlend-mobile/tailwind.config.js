/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        zinc: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
        blue: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Semantic Accents
        success: '#22c55e', // green-500
        warning: '#f97316', // orange-500
        // AI/Intelligence Gradients
        indigo: {
          900: '#312e81',
        },
        purple: {
          900: '#581c87',
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
      fontFamily: {
        sans: ['Inter-Regular'],
        'sans-bold': ['Inter-Bold'],
        'sans-medium': ['Inter-Medium'],
        'sans-semibold': ['Inter-SemiBold'],
      },
      borderRadius: {
        'xl': '0.75rem', // 12px (Inputs)
        '2xl': '1rem',   // 16px (Large Containers)
        '3xl': '1.5rem', // 24px (Large Containers)
        '4xl': '2rem',   // 32px
        'full': '9999px', // Pill-shaped (Buttons)
      },
      letterSpacing: {
        tight: '-0.025em', // Compressed (Heads)
        wider: '0.05em',   // Expanded (Meta/Subtitles)
      },
      boxShadow: {
        'neo-glow': '0 0 20px -5px rgba(37, 99, 235, 0.2)', // Blue glow
        'neo-drop': '0 25px 50px -12px rgba(0, 0, 0, 0.5)', // Heavy diffused shadow
      }
    },
  },
  plugins: [],
}
