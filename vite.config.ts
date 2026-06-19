import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Uncommon port to avoid clashing with other local dev servers
    // (3000/5173/8080/4200/5000 등) and known services.
    port: 7788,
    strictPort: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
