import js from "@eslint/js";
import tseslint from "typescript-eslint";

const browserGlobals = {
  AbortController: "readonly",
  Blob: "readonly",
  FormData: "readonly",
  FileReader: "readonly",
  Headers: "readonly",
  ResizeObserver: "readonly",
  Request: "readonly",
  Response: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  console: "readonly",
  document: "readonly",
  fetch: "readonly",
  localStorage: "readonly",
  module: "readonly",
  navigator: "readonly",
  performance: "readonly",
  process: "readonly",
  setTimeout: "readonly",
  window: "readonly",
};

export default [
  {
    ignores: [".next/**", "next-env.d.ts", "out/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: browserGlobals,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "eqeqeq": ["error", "always"],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-var": "error",
      "prefer-const": "error",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // Node tooling scripts (build/lint helpers), not browser code.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
  },
];
