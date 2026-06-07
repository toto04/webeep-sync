import eslint from "@eslint/js"
import tseslint from "typescript-eslint"
import reactPlugin from "eslint-plugin-react"
import importPlugin from "eslint-plugin-import"
import prettierPlugin from "eslint-plugin-prettier/recommended"
import globals from "globals"
import unusedImportsPlugin from "eslint-plugin-unused-imports"
import autofixPlugin from "eslint-plugin-autofix"

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  importPlugin.flatConfigs?.recommended || {},
  importPlugin.flatConfigs?.electron || {},
  importPlugin.flatConfigs?.typescript || {},
  prettierPlugin,
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    plugins: {
      react: reactPlugin,
      "unused-imports": unusedImportsPlugin,
      autofix: autofixPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
      "import/resolver": {
        typescript: true,
        node: true,
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      "prettier/prettier": "error",
      "no-extra-parens": ["off"],
      "linebreak-style": ["error", "unix"],
      quotes: ["error", "double", { avoidEscape: true }],
      "react/prop-types": ["off"],
      "react/no-multi-comp": ["error"],
      "react/self-closing-comp": ["error"],
      "import/no-unresolved": "off",
      "import/namespace": "off",
      "import/default": "off",
      "import/no-named-as-default": "off",
      "import/no-duplicates": "off",
      "import/no-named-as-default-member": "off",
      "no-unsafe-finally": "off",
      "no-useless-assignment": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "autofix/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "none",
          argsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      "@typescript-eslint/no-unsafe-declaration-merging": "off",
      "prefer-const": [
        "error",
        {
          destructuring: "all",
        },
      ],
    },
  },
  {
    ignores: [
      "dist/",
      ".webpack/",
      "node_modules/",
      "coverage/",
      "out/",
      "graphify-out/",
    ],
  },
)
