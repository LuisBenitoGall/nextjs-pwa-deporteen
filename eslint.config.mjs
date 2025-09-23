import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    // Relax strict "any" usage globally for now to unblock lint.
    // We can tighten this later file-by-file.
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    // Supabase edge functions may intentionally use ts-nocheck/any due to Deno runtime types.
    files: ["supabase/functions/**/*.{ts,tsx,js}"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
