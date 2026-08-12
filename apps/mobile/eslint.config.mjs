import baseConfig from "../../eslint.config.mjs";

export default [
  ...baseConfig,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        __DEV__: "readonly"
      }
    }
  },
  {
    files: ["plugins/**/*.js"],
    languageOptions: {
      globals: {
        module: "readonly",
        require: "readonly"
      }
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  }
];
