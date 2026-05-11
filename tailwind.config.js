/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0066FF",
          dark: "#0047B3",
        },
        background: {
          DEFAULT: "#F9FAFB",
          dark: "#0B0F19",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          dark: "#1A2235",
        },
        text: {
          DEFAULT: "#111827",
          dark: "#F9FAFB",
        },
        border: {
          DEFAULT: "#E5E7EB",
          dark: "#374151",
        },
        neon: {
          blue: "#00E5FF",
          purple: "#B400FF",
        }
      },
    },
  },
  plugins: [],
};
