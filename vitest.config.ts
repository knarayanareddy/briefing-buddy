import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Frontend tests + vitest-style edge-function unit tests.
    // Deno-style tests use the *_test.ts suffix and run under `deno test`
    // (see scripts.test:deno) — they are excluded from this glob.
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "supabase/functions/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // briefingSchema.ts imports zod from esm.sh (for Deno edge runtime);
      // map it to the npm zod dependency so vitest can resolve it offline.
      "https://esm.sh/zod@4.6.7": "zod",
    },
  },
});
