import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

const sharedGlobals = {
  AbortController: "readonly",
  Blob: "readonly",
  FormData: "readonly",
  Headers: "readonly",
  Request: "readonly",
  Response: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  console: "readonly",
  fetch: "readonly",
  module: "readonly",
  process: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly"
};

const browserGlobals = {
  document: "readonly",
  FileReader: "readonly",
  localStorage: "readonly",
  navigator: "readonly",
  performance: "readonly",
  ResizeObserver: "readonly",
  window: "readonly"
};

const commonJsGlobals = {
  __dirname: "readonly",
  module: "readonly",
  require: "readonly"
};

export default [
  {
    ignores: [
      "**/.next/**",
      "**/.expo/**",
      "**/android/**",
      "**/ios/**",
      "**/coverage/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/out/**",
      "**/*.tsbuildinfo"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: sharedGlobals,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      "eqeqeq": ["error", "always"],
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "no-debugger": "error",
      "no-var": "error",
      "prefer-const": "error"
    }
  },
  {
    files: ["apps/web/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: browserGlobals
    }
  },
  {
    files: [
      "**/*.config.js",
      "apps/backend/prisma/**/*.js",
      "apps/mobile/metro.config.js",
      "apps/mobile/tailwind.config.js"
    ],
    languageOptions: {
      sourceType: "commonjs",
      globals: commonJsGlobals
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn"
    }
  }
];
