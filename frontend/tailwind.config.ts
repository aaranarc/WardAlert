import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f8fafc",
        surface: "#ffffff",
        border: "#e2e8f0",
        primary: "#0f172a",
        muted: "#64748b",
        card: {
          DEFAULT: "#ffffff",
          subtle: "#f1f5f9",
          border: "#e2e8f0",
        },
        accent: {
          DEFAULT: "#0066cc",
          hover: "#0055b3",
          soft: "#e8f2fc",
        },
        risk: {
          low: "#16a34a",
          moderate: "#d97706",
          high: "#ea580c",
          critical: "#e11d48",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "SF Mono",
          "Menlo",
          "Consolas",
          "Courier New",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
