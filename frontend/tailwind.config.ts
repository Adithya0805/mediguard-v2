import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.tsx",
    "./src/components/ui/*.tsx"
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0f1e",
        surface: "#111827",
        "surface-raised": "#1a2234",
        border: "#1e293b",
        primary: {
          DEFAULT: "#0d9488",
          hover: "#0f766e",
        },
        accent: "#06b6d4",
        "text-primary": "#f1f5f9",
        "text-secondary": "#94a3b8",
        "text-muted": "#475569",
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        critical: "#dc2626",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
export default config;
