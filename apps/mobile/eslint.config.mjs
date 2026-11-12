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
    files: ["plugins/**/*.js", "scripts/**/*.js"],
    languageOptions: {
      globals: {
        __dirname: "readonly",
        console: "readonly",
        module: "readonly",
        process: "readonly",
        require: "readonly"
      }
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "off"
    }
  },
  {
    files: ["**/*.test.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        afterEach: "readonly",
        beforeEach: "readonly",
        describe: "readonly",
        expect: "readonly",
        it: "readonly",
        jest: "readonly",
        require: "readonly",
        test: "readonly"
      }
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  }
];
