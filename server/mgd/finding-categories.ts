// ─────────────────────────────────────────────────────────────────────────────
// MGD FINDING CATEGORY VOCABULARY — authoritative source
//
// THE single source of truth for MGD V1's Finding Category vocabulary. Every
// file that needs one of these 9 exact strings must import them from here —
// never re-declare its own copy. See
// docs/MGD_FINDING_CATEGORY_GOVERNANCE_ADR.md for what a Finding Category is
// (and, importantly, what it is not — it is not a Recommendation Category,
// not a Consultant Note category, and not automatically a Diagnostic Scope
// Domain). This governs ONLY the Finding Category vocabulary; it does not
// unify or replace any other category vocabulary in the codebase.
//
// Deliberately its own leaf module with zero imports: findings-engine.ts
// itself imports from evidence-engine.ts (for FindingEvidence), and
// evidence-engine.ts needs these category values too — declaring them
// inside findings-engine.ts would create a circular import the moment
// evidence-engine.ts (or any other findings-engine.ts dependency) needed to
// reference them. Keeping this vocabulary in its own dependency-free file
// avoids that class of bug entirely, for this and any future consumer.
// ─────────────────────────────────────────────────────────────────────────────

export const FINDING_CATEGORIES = {
  INVENTORY_VISIBILITY:    "inventory_visibility",
  LOGISTICS_COORDINATION:  "logistics_coordination",
  WAREHOUSE_OPERATIONS:    "warehouse_operations",
  MANPOWER_DEPENDENCY:     "manpower_dependency",
  FINANCIAL_LEAKAGE:       "financial_leakage",
  WORKFLOW_SCALABILITY:    "workflow_scalability",
  // Event Management operational categories
  EVENT_READINESS:         "event_readiness",
  DISPATCH_OPERATIONS:     "dispatch_operations",
  ASSET_MANAGEMENT:        "asset_management",
} as const;

/** The literal-union type of every valid Finding Category string. */
export type FindingCategory = typeof FINDING_CATEGORIES[keyof typeof FINDING_CATEGORIES];
