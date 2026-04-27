import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0A1A2F",
          50: "#F5F7FA",
          100: "#E6ECF2",
          200: "#C6D2E0",
          300: "#9DAFC4",
          400: "#6F86A2",
          500: "#4A627F",
          600: "#33485F",
          700: "#1F3147",
          800: "#142235",
          900: "#0A1A2F",
        },
        accent: {
          DEFAULT: "#1F6FEB",
          50: "#EAF1FE",
          100: "#CFDEFC",
          500: "#1F6FEB",
          600: "#1A5BC4",
          700: "#16489B",
        },
        warn: {
          50: "#FFF7E6",
          500: "#D97706",
          700: "#92400E",
        },
        crit: {
          50: "#FEECEC",
          500: "#DC2626",
          700: "#991B1B",
        },
        ok: {
          50: "#ECFDF5",
          500: "#059669",
          700: "#065F46",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Inter",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      maxWidth: {
        prose: "70ch",
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,26,47,0.04), 0 4px 16px rgba(10,26,47,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
