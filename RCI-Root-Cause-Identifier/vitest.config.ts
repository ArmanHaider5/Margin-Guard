import { defineConfig } from "vitest/config";

/**
 * Deliberately its own config, not sharing `vite.config.ts` (which carries React,
 * Tailwind, and Replit-specific plugins irrelevant to `server/v2/`, a Node-only
 * module tree). Scoped narrowly so a future V1 test suite (none exists today)
 * cannot collide with this one.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["server/v2/**/__tests__/**/*.test.ts", "server/v2/**/*.test.ts"],
  },
});
