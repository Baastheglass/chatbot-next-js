/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      keyframes: {
        "fade-in": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 }
        },
        "fade-out": {
          "0%": { opacity: 1 },
          "100%": { opacity: 0 }
        },
        "fadeIn": {
          "0%": { opacity: 0, transform: "translateY(10px)" },
          "100%": { opacity: 1, transform: "translateY(0)" }
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-5px)" }
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        "typing": {
          "0%, 60%": { opacity: 0.3, transform: "scale(0.8)" },
          "30%": { opacity: 1, transform: "scale(1.2)" }
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" }
        },
        "pulse-width": {
          "0%, 100%": { width: "0%" },
          "50%": { width: "100%" }
        }
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-in",
        "fadeIn": "fadeIn 0.5s ease-out",
        "float": "float 2s ease-in-out infinite",
        "shimmer": "shimmer 1.5s infinite",
        "typing": "typing 1.4s ease-in-out infinite",
        "spin-slow": "spin-slow 8s linear infinite",
        "pulse-width": "pulse-width 2s ease-in-out infinite"
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
}