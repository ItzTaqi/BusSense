import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["src/**/*.test.ts", "../supabase/functions/**/*.test.ts"] },
});
