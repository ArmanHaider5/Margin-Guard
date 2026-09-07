import { defineConfig } from "vitest/config";

/**
 * Deliberately its own config, not sharing `vite.config.ts` (which carries React,
 * Tailwind, and Replit-specific plugins irrelevant to server-side Node modules).
 *
 * `include` originally covered only `server/v2/**` (no V1 test suite existed at
 * all). Widened once to also cover `server/mgd/**` and `server/routes/**`
 * — both plain Node/Express modules like server/v2/, so nothing about this
 * config needed to change beyond the glob itself. Widened again here to cover
 * `server/__tests__/**` — repo-wide architecture-fitness sweeps (route
 * wiring, dead-link checks) that don't belong under any single module's own
 * `__tests__/`. Still no supertest, jsdom, or React-testing-library — none of
 * these tests render a component.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: [
      "server/v2/**/__tests__/**/*.test.ts", "server/v2/**/*.test.ts",
      "server/mgd/**/__tests__/**/*.test.ts",
      "server/routes/**/__tests__/**/*.test.ts",
      "server/__tests__/**/*.test.ts",
    ],
  },
});
