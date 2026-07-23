import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  globalIgnores([".next/**", "out/**", "dist/**", "lib/schema.ts"]),
]);

export default eslintConfig;
