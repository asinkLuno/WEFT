import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "dist/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "lib/schema.ts",
  ]),
]);

export default eslintConfig;
