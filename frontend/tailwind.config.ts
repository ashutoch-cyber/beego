import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f1f8f4",
          100: "#dbeee4",
          200: "#b7dfcb",
          300: "#8fc7ad",
          400: "#5f9f7d",
          500: "#2D6A4F",
          600: "#2D6A4F",
          700: "#24553f",
          800: "#1B4332",
          900: "#123024",
        },
        accent: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
        },
      },
    },
  },
  plugins: [],
}

export default config
