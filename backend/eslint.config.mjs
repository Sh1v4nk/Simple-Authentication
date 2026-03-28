import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, prettier, {
    rules: {
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-unused-vars": [
            "error",
            {
                argsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^_",
            },
        ],
        "@typescript-eslint/consistent-type-imports": "warn",
        "no-console": "off", // you use console.* intentionally
        "no-process-exit": "off", // validateEnv uses process.exit
        eqeqeq: "error", // no == only ===
        "no-var": "error",
        "prefer-const": "error",
    },
    ignores: ["dist/**", "node_modules/**"],
});
