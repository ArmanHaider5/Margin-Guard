# MGD Onboarding Routing — ADR

**Milestone 16.** Status: implemented.

## Problem

`client/src/App.tsx`'s top-level `Router()` gated on `!user.onboardingComplete`
*before* checking `user.role`. `onboardingComplete` is only ever set by
`PATCH /api/auth/user/profile`, which is called exclusively from
`client/src/pages/onboarding.tsx` — a "Tell us about your business" /
industry-picker form that reads, in both its content and its own tests, as a
CLIENT self-onboarding flow, not a consultant/admin tool.

Because every newly-created user (default `role: "client"` per
`shared/schema.ts`, promoted to `"admin"` only via the explicit
`POST /api/auth/become-admin` dev route) starts with `onboardingComplete`
unset, an admin/consultant's very first authenticated page load hit this
gate and was shown the client-facing onboarding form before ever reaching
their own workspace (`MGDDashboard`). This collapsed the two distinct product
roles the architecture otherwise keeps separate (see `docs/ARCHITECTURE.md`
§ Authentication) into one indistinguishable first-run experience.

## Decision

Reorder the two checks: resolve `role === "admin"` first (unconditional
route into the existing admin/consultant Switch, regardless of
`onboardingComplete`), and only apply the `onboardingComplete` gate —
unchanged in every other respect — to the remaining (client) branch.

No schema change: `onboardingComplete` remains a client-only concept in
practice, which this change makes true in the routing logic as well.
`Onboarding` itself, `PATCH /api/auth/user/profile`, and
`updateUserProfile` in `server/system/storage.ts` are all untouched.

## Consequence

- Admin/consultant first login → straight into `MGDDashboard` (see
  `server/frontend/mgd/mgd-dashboard.tsx`'s zero-client empty state for what
  that looks like with no client organizations yet).
- Client (business user) first login → unchanged: still sees the business-
  profile onboarding form until they complete it.
