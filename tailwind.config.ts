import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        saffron: {
          50: "#fff8ed",
          100: "#ffefd4",
          200: "#ffdba8",
          300: "#ffc170",
          400: "#ff9b37",
          500: "#ff7a10",
          600: "#f05d06",
          700: "#c74407",
          800: "#9e360e",
          900: "#7f2e0f",
        },
        temple: {
          cream: "#fbf6ee",
          ink: "#3b2415",
          muted: "#7a5a42",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-noto-devanagari)",
          "Noto Sans Devanagari",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "var(--font-tiro-marathi)",
          "Tiro Devanagari Marathi",
          "Noto Serif Devanagari",
          "serif",
        ],
      },
      boxShadow: {
        card: "0 10px 30px -18px rgba(127, 46, 15, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
