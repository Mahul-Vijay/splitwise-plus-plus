import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B0E13",
          900: "#12151C",
          800: "#1A1F29",
          700: "#242B38",
          600: "#323B4C",
        },
        paper: {
          100: "#F5F6F7",
          200: "#E7E9ED",
          400: "#A9B0BE",
        },
        teal: {
          400: "#39E2C6",
          500: "#2DD4BF",
          600: "#1FAE9C",
        },
        amber: {
          400: "#F7B955",
          500: "#F5A623",
        },
        coral: {
          400: "#FF7A6E",
          500: "#F25C4D",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to bottom, rgba(45,212,191,0.06) 1px, transparent 1px), linear-gradient(to right, rgba(45,212,191,0.06) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "28px 28px",
      },
    },
  },
  plugins: [],
};
export default config;
