import { defineConfig } from "eslint/config";
import next from "eslint-config-next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import securityPlugin from "eslint-plugin-security";
import * as regexpPlugin from "eslint-plugin-regexp";
import unusedImports from "eslint-plugin-unused-imports";
import noSecrets from "eslint-plugin-no-secrets";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

export default defineConfig([
    ...next,
    securityPlugin.configs.recommended,
    regexpPlugin.configs["flat/recommended"],
    ...compat.plugins("eslint-plugin-no-secrets"),
    {
        plugins: {
            "unused-imports": unusedImports,
            "no-secrets": noSecrets,
        },
        rules: {
            // 1. Security (Hardcoded Secrets & SAST)
            "no-secrets/no-secrets": "error",
            
            // 2. API & Architecture (Information Disclosure)
            "no-console": ["warn", { allow: ["warn", "error"] }],
            
            // 3. Code Quality (Swallowed Errors, Dead Code, God Components)
            "no-empty": "warn",
            "max-lines": "off",
            "security/detect-object-injection": "off",
            "@next/next/no-img-element": "off",
            "unused-imports/no-unused-imports": "error",
            "unused-imports/no-unused-vars": [
                "warn",
                { "vars": "all", "varsIgnorePattern": "^_", "args": "after-used", "argsIgnorePattern": "^_" }
            ],
        }
    }
]);
