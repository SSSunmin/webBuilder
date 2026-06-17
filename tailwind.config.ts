import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4434e2",
          light: "#6867fe",
          lighter: "#8d8dfb",
          lightest: "#dcdbfd",
          pale: "#ecebfc",
          dark: "#3526c7",
          darker: "#3025a0",
          darkest: "#11086c",
        },
        accent: {
          DEFAULT: "#e8492a",
          light: "#f76b4a",
        },
        ink: "#0c0a09",
        ink2: "#25252f",
        muted: "#646371",
        line: "#e5e9f0",
        line2: "#eef1f7",
        canvas: "#f4f6fb",
        success: "#10b981",
        warning: "#f59e0b",
        error: "#f43f5e",
        info: "#06b6d4",
      },
      borderRadius: {
        chip: "6px",
        button: "10px",
        card: "14px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 2px #0f172a08",
        cardHover: "0 4px 12px #0f172a0f",
        hero: "0 10px 24px #4434e240",
        pane: "0 1px 2px rgb(23 32 51 / 0.08)",
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
