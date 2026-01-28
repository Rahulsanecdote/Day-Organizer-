import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Editor and IDE directories (prevents OOM from linting VS Code extensions)
    ".home/**",
    ".vscode/**",
    ".idea/**",
    // Other common directories to exclude
    "node_modules/**",
    "coverage/**",
    "dist/**",
    "*.config.js",
    "*.config.mjs",
    "*.config.cjs",
  ]),
]);

export default eslintConfig;
