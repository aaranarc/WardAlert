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
        background: "#0a0a0f",
        card: {
          DEFAULT: "#12122b",
          highlight: "#1a1a3e",
          border: "rgba(123, 104, 238, 0.3)",
        },
        accent: {
          DEFAULT: "#b8a9ff",
          purple: "#7B68EE",
          cyan: "#38bdf8",
        },
        risk: {
          low: "#4ade80",
          moderate: "#facc15",
          high: "#fb923c",
          critical: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
