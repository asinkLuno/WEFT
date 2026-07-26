import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.ts"],
      exclude: ["**/*.d.ts", "lib/schema.ts"],
      thresholds: {
        statements: 5,
        branches: 80,
        functions: 71,
        lines: 5,
      },
    },
  },
});
