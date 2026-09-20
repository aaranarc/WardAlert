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
        canvas: "#f7f8fa",
        surface: "#ffffff",
        border: {
          DEFAULT: "#d4dae3",
          light: "#e2e8f0",
          dark: "#94a3b8",
        },
        ink: {
          DEFAULT: "#1a1f2e",
          muted: "#5b6478",
          subtle: "#838d9e",
        },
        navy: {
          DEFAULT: "#1e40af",
          dark: "#172554",
          light: "#dbeafe",
        },
        alarm: {
          critical: "#b91c1c",
          "critical-bg": "#fef2f2",
          warning: "#b45309",
          "warning-bg": "#fffbeb",
          moderate: "#d97706",
          safe: "#166534",
          "safe-bg": "#f0fdf4",
        },
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        sans: [
          "IBM Plex Sans",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "IBM Plex Mono",
          "ui-monospace",
          '"SF Mono"',
          '"Roboto Mono"',
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      borderRadius: {
        DEFAULT: "3px",
        sm: "2px",
        md: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
