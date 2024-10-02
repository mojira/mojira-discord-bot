import typescriptEslint from "@typescript-eslint/eslint-plugin";
import stylistic from "@stylistic/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: [
        // don't ever lint node_modules
        "**/node_modules",
        // don't lint build output (make sure it's set to your correct build folder name)
        "**/bin"
    ],
}, ...compat.extends("eslint:recommended", "plugin:@typescript-eslint/recommended"), {
    files: ["**/*.ts"],

    plugins: {
        "@typescript-eslint": typescriptEslint,
        "@stylistic": stylistic,
    },

    languageOptions: {
        globals: {
            ...globals.node,
        },

        parser: tsParser,
        ecmaVersion: 5,
        sourceType: "module",

        parserOptions: {
            project: "tsconfig.json",
        },
    },

    rules: {
        "brace-style": ["warn", "1tbs", {
            allowSingleLine: true,
        }],

        "comma-dangle": ["warn", "always-multiline"],
        "comma-spacing": "warn",
        "comma-style": "warn",
        curly: ["warn", "multi-line", "consistent"],
        "dot-location": ["warn", "property"],
        "eol-last": "warn",
        "@stylistic/indent": ["warn", "tab"],
        "keyword-spacing": ["warn"],

        "max-nested-callbacks": ["warn", {
            max: 4,
        }],

        "max-statements-per-line": ["warn", {
            max: 2,
        }],

        "no-empty-function": "warn",
        "no-floating-decimal": "warn",
        "@typescript-eslint/no-floating-promises": "error",
        "no-inline-comments": "warn",
        "no-lonely-if": "warn",
        "no-multi-spaces": "warn",

        "no-multiple-empty-lines": ["warn", {
            max: 2,
            maxEOF: 1,
            maxBOF: 0,
        }],

        "no-shadow": "off",

        "@typescript-eslint/no-shadow": ["error", {
            allow: ["err", "resolve", "reject"],
        }],

        "no-trailing-spaces": ["warn"],
        "no-var": "error",
        "object-curly-spacing": ["warn", "always"],
        "prefer-const": "error",
        quotes: ["warn", "single"],
        "@stylistic/semi": ["warn"],
        "space-before-blocks": "warn",

        "space-before-function-paren": ["warn", {
            anonymous: "never",
            named: "never",
            asyncArrow: "always",
        }],

        "space-in-parens": ["warn", "always", {
            exceptions: ["empty"],
        }],

        "space-infix-ops": "warn",
        "space-unary-ops": "warn",
        "spaced-comment": "warn",
        "template-curly-spacing": ["warn", "always"],

        yoda: ["error", "never", {
            exceptRange: true,
        }],
    },
}];
