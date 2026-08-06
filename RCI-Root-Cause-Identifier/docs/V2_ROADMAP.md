# MGD V2 — Migration Roadmap

This roadmap sequences the remediation items from [TECH_DEBT.md](TECH_DEBT.md) into a plan for MGD Version 2. **V1 remains the production baseline and must not be touched by this roadmap's execution without separate, explicit approval per phase.** This document is planning only — no code changes have been made.

## Guiding principles for V2

1. **One diagnostic engine, one knowledge model.** The defining V1 problem is three engines and four knowledge libraries answering the same question differently. V2's core deliverable is collapsing this to one of each — not adding a fourth.
2. **Everything a "production consulting platform" implies but V1 doesn't have yet**: authenticated API surface end-to-end, durable storage for every artifact (no flat JSON files), no client-confidential documents in git.
3. **Sequence for reversibility.** Early phases should be additive/parallel-safe (new code paths that don't remove old ones) so V1 can keep running until each cutover is verified. Destructive steps (deleting engines, deleting library files, git history rewrites) come last, after their replacement has been validated against real client data.
4. **Every phase ends with a decision point**, not an assumption that the next phase proceeds automatically. Some of these choices (which engine survives, whether to scrub git history) are product/business decisions, not engineering ones.

---

## Phase 0 — Baseline hygiene (safe, immediate, no product decisions required)

Can start as soon as approved; touches nothing load-bearing.

- Delete the three confirmed-dead files with zero importers: `server/industries/manufacturing-root-cause-library.ts`, `server/industries/manufacturing-vocabulary.ts`, `shared/root-cause-expert-library.ts`.
- Delete the ten fully-orphaned `server/frontend/` files; relocate `server/frontend/mgd/mgd-dashboard.tsx` to `client/src/pages/`.
- Delete `server/diagnostics/diagnostic-matrix.ts` (dead, zero importers).
- Remove all Replit-inert artifacts: `.replit_integration_files/`, both `attached_assets/` directories, `zipFile.zip`, root-level `package.json`/`package-lock.json`, the stale app-level `.replit`, the unused `@assets` Vite alias.
- Remove `@replit/vite-plugin-cartographer` and `@replit/vite-plugin-dev-banner` devDependencies (already no-op outside Replit; removing them removes any residual signal to future readers that this app is Replit-bound).
- Add `uploads/` to `.gitignore` immediately (does not remove existing history — see Phase 4).
- **Decision point**: confirm the RCI Export Engine (`export-pdf-generator.ts` + its 3 orphaned components) is genuinely unwanted before deleting it — if there's a plan to relaunch a "consulting proposal pack" export, keep and re-wire it instead.

## Phase 1 — Security and durability hotfixes (can land on V1 directly, doesn't require the V2 branch)

These are severity-ranked highest in TECH_DEBT.md and don't depend on the engine-consolidation decision. Recommend doing these against the current baseline once approved, rather than waiting for the full V2 effort.

- Apply `isAuthenticated`/`isAdmin` to `/api/mgd/*`, `/api/execution/*`, and `/api/diagnostic-route` — currently fully public.
- Migrate `server/mgd/report-store.ts` and `pipeline-trace.ts` from flat JSON files to Postgres tables (`mgd_reports`, `mgd_traces`) using the existing Drizzle/`storage.ts` pattern. Mechanical, low-risk, and removes the single largest durability gap in the system.
- Fix `/api/mgd/run` to read from `cil_transactions` instead of re-running CIL extraction in-route, when a document has already been CIL-processed.

## Phase 2 — Engine and knowledge-library consolidation (the core V2 decision)

This is the phase that actually defines "V2" architecturally. It requires a product decision before engineering work starts:

**Decision needed**: which diagnostic engine is the target — Generation C (`server/mgd/*`, deterministic, no LLM, currently the more actively developed one per the `attached_assets` prompt history) or a rebuilt Generation A/B (LLM-driven, richer cost-saving/financial-impact modeling)? Recommend Generation C as the default candidate given it's newer, self-contained, fully traced, and has no external API dependency/cost/latency — but this should be validated against which one consultants actually trust more in practice, which only the product owner can answer.

Once decided:

1. Define one canonical `RootCause`/`Finding`/`BenchmarkResult` data shape (currently three incompatible shapes share the same type names — see TECH_DEBT.md item 1).
2. Reconcile the industry taxonomy — merge Group B's 6 industries and Group C's 13 into one list, and build out the missing root-cause/signal/benchmark/mapping data for the ~10 industries that currently have problem-statement text but no matching engine data (construction, F&B variants, hospitality, hotels/Airbnb, oil & gas, property development).
3. Migrate the retained engine to source knowledge from a single library location. Retire the losing engine(s) and their private knowledge groups, but only after running both engines in parallel against a sample of real historical client analyses and confirming the surviving engine's output quality is acceptable — this is a validation gate, not a formality.
4. Consolidate the four report-generation stacks onto the surviving engine's report shape.

This phase is the largest by effort and the only one that changes user-facing diagnostic output — plan a validation/UAT step with actual consultants before cutting production traffic over.

## Phase 3 — Auth and hosting independence

- Stand up a replacement authentication provider (e.g. Auth0, Clerk, or self-hosted email/password + Postgres sessions) to replace `server/system/replitAuth.ts`'s hard dependency on Replit's OIDC issuer and `REPL_ID`.
- Cut over `isAuthenticated`/session handling to the new provider; migrate existing session data or force re-login.
- Remove the remaining Replit-hosting assumptions once auth is independent: single-port `0.0.0.0` bind assumption, `REPL_ID`-gated Vite plugins, `.replit` deploy config — replace with a standard containerized deploy target (Docker + your chosen platform).
- This phase unblocks running/deploying the app anywhere, not just Replit — a prerequisite for most standard production infrastructure practices (multi-instance scaling, standard CI/CD, infra-as-code).

## Phase 4 — Storage and confidentiality remediation

- Move `uploads/` from local disk to external object storage (S3-compatible) — necessary regardless of hosting choice, since local disk was never durable on Replit's ephemeral filesystem either.
- **Decision needed, flag explicitly to stakeholders**: whether to scrub the 89 real client documents currently committed to git history (`uploads/`, also duplicated in `zipFile.zip`). This is a destructive, history-rewriting operation (`git filter-repo`/BFG) that affects every clone of the repository and should not be executed without explicit sign-off, ideally after confirming which client documents are involved and whether any confidentiality/compliance obligations apply retroactively.

## Phase 5 — Cleanup and hardening

- Remove verbose debug logging in `replitAuth.ts`'s successor.
- Fix the global Express error handler's respond-then-rethrow pattern; wire in a real error-monitoring integration (Sentry or equivalent).
- Factor the duplicated `/demo`/`/results/:sessionId`/`/history` route definitions in `App.tsx` into a shared sub-tree.
- Revisit whether the execution module (`src/modules/execution/`) is an active product feature or an abandoned experiment — confirm with product before deciding whether it graduates into V2 or is retired.

## Suggested phase ordering and dependencies

```
Phase 0 (hygiene) ─── can start immediately, no dependencies
Phase 1 (security/durability hotfixes) ─── can start immediately, in parallel with Phase 0
Phase 2 (engine consolidation) ─── requires a product decision; largest effort; should
                                     not start until Phase 0/1 are done so the codebase
                                     being consolidated is already de-cluttered
Phase 3 (auth/hosting independence) ─── can run in parallel with Phase 2; independent concern
Phase 4 (storage/confidentiality) ─── can start anytime; git-history scrub needs explicit
                                        stakeholder sign-off and should happen after Phase 2/3
                                        settle so it's a one-time operation
Phase 5 (cleanup/hardening) ─── follows naturally once the above land
```

## What this roadmap deliberately does not decide

- Which engine wins in Phase 2 (product decision).
- Which auth provider to adopt in Phase 3 (infra/cost decision).
- Whether to scrub git history in Phase 4 (needs explicit stakeholder approval given it's irreversible for existing clones).
- Timeline/staffing — this is a sequencing document, not a schedule.

Awaiting approval before any of the above phases begin.
