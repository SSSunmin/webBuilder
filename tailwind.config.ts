import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f5f7fb",
        ink: "#172033",
        line: "#d9e0ea",
      },
      boxShadow: {
        pane: "0 1px 2px rgb(23 32 51 / 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
