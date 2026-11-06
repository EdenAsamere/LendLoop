import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      colors: {
        stone: {
          50: "#FAF9F6",
          100: "#F4F3EE",
          150: "#ECEAE3",
          200: "#E3E0D6",
          300: "#CEC9BC",
          400: "#ABA391",
          500: "#8D8472",
          600: "#6E6657",
          700: "#534D41",
          800: "#39352D",
          900: "#181816",
          950: "#0F0F0D",
        },
        brand: {
          50: "#FAF9F6",
          100: "#F4F3EE",
          200: "#E3E0D6",
          300: "#CEC9BC",
          400: "#8D8472",
          500: "#181816",
          600: "#141412",
          700: "#0F0F0D",
          800: "#080807",
          900: "#000000",
        },
      },
    },
  },
  plugins: [],
};
export default config;


