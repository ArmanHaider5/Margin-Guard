// ─────────────────────────────────────────────────────────────────────────────
// MGD STRUCTURED DIAGNOSTIC SCOPE
//
// Represents "what the client asked MGD to investigate" (a Business Concern)
// as a distinct, explicitly-labeled report item — never as evidence, never as
// a finding, and never blended with either.
//
// Core rule, from docs/MGD_STRUCTURED_DIAGNOSTIC_SCOPE_ADR.md:
//   BUSINESS CONCERN ≠ EVIDENCE.  SCOPE ≠ TRUTH.
// A concern's presence can only ever describe what MGD was ASKED to look at.
// It can never describe, or influence, what MGD FOUND or CONCLUDED.
//
// Design principles:
//   • No AI, no keyword matching, no semantic/topic classification of
//     `concernText`. A concern's TEXT is never correlated to a specific
//     finding or evidence domain in this module. A concern MAY carry a
//     `selectedAreas` list — but that list is exclusively HUMAN-SELECTED
//     (the consultant explicitly picked it in the wizard), never derived
//     from the text itself. See
//     docs/MGD_BUSINESS_CONCERN_CORRELATION_ADR.md for the full design and
//     why this remains a bright line, not a slippery slope toward inference.
//   • Deterministic — the same input always produces the same output.
//   • Never throws — empty array on any failure path.
//   • Reads only report-level evidence sufficiency (already computed
//     elsewhere, in evidence-sufficiency.ts) — never recomputes or
//     influences it.
// ─────────────────────────────────────────────────────────────────────────────

import type { EvidenceLevel } from "./evidence-sufficiency";
import { FINDING_CATEGORIES } from "./finding-categories";

/**
 * Only UNVALIDATED and INSUFFICIENT_EVIDENCE are ever produced by
 * `buildDiagnosticScope` today. SUPPORTED and NOT_SUPPORTED remain reserved
 * and are still never constructed — this was re-investigated in
 * docs/MGD_BUSINESS_CONCERN_CORRELATION_ADR.md and the conclusion did not
 * change: even when a consultant explicitly selects a diagnostic area for a
 * concern, and MGD finds a real, evidence-backed Finding in that exact
 * category, that is still not a deterministic basis for "this concern is
 * validated" — the finding's specific content may not actually speak to
 * what the concern's text describes, only to the same broad area. What
 * changed in that milestone is additive: a concern can now carry
 * consultant-selected `selectedAreas`, and the findings that fall in those
 * areas are surfaced via `relevantFindingIds` — a factual cross-reference,
 * not a validation claim. SUPPORTED/NOT_SUPPORTED remain reserved for a
 * future milestone that would need a materially stronger, still-undesigned
 * correlation mechanism.
 *
 * The original investigation (see
 * docs/MGD_DIAGNOSTIC_SCOPE_EVIDENCE_COVERAGE_ADR.md) concluded that no
 * existing MGD structure could earn SUPPORTED/NOT_SUPPORTED without
 * guessing: the finding-category and recommendation-category vocabularies
 * are not the same (only "warehouse_operations" is a literal match between
 * them), and RootCause carries no category of its own — a cross-category
 * synthesis by design. Both of those facts are unchanged and still block
 * SUPPORTED/NOT_SUPPORTED today.
 */
export type ScopeStatus =
  | "UNVALIDATED"           // evidence exists somewhere in this report, but has not been (and today cannot be) correlated to this specific concern
  | "INSUFFICIENT_EVIDENCE" // no evidence exists in this report at all — no concern in it could possibly be substantiated
  | "SUPPORTED"             // reserved — not produced by this module
  | "NOT_SUPPORTED";        // reserved — not produced by this module

export interface DiagnosticScopeItem {
  /** Deterministic and stable for a given input array — not a random id. */
  id: string;
  /** Verbatim business concern text, unmodified. */
  concernText: string;
  /** The only origin this module produces. Reserved for a future
   *  CONSULTANT_OBSERVATION-origin scope item — not introduced here, since
   *  a Consultant Observation is "what was witnessed," not "what to
   *  investigate" (see the provenance ADR's four-class model). */
  origin: "BUSINESS_CONCERN";
  status: ScopeStatus;

  /**
   * Diagnostic area(s) the CONSULTANT explicitly selected for this concern
   * — never inferred from `concernText`. Values are restricted to the
   * authoritative Finding Category vocabulary (see finding-categories.ts):
   * reused here, unchanged, as the one existing vocabulary that Findings
   * are actually tagged with — NOT a promotion of Finding Category to a
   * governed product ontology (see
   * docs/MGD_BUSINESS_CONCERN_CORRELATION_ADR.md §5). Omitted or empty when
   * the consultant selected nothing, which remains a fully valid choice.
   */
  selectedAreas?: string[];

  /**
   * Finding IDs whose `category` is a member of `selectedAreas` — a
   * read-only cross-reference computed by `attachRelevantFindings` AFTER
   * the full, unfiltered diagnostic has already run. This is explicitly
   * NOT validation: a finding appearing here means only "this finding's
   * category matches an area the consultant selected for this concern,"
   * never "this finding proves or disproves the concern." Absent when
   * `selectedAreas` is empty/unset, or when no findings matched.
   */
  relevantFindingIds?: string[];
}

/** A concern as submitted: either the legacy plain-text form, or the
 *  richer form carrying consultant-selected diagnostic areas. Both are
 *  accepted indefinitely — this is an additive widening of the input
 *  contract, not a replacement, so historical/older callers passing plain
 *  strings continue to work unchanged. */
export type BusinessConcernInput = string | { text: string; selectedAreas?: string[] };

const VALID_AREAS: ReadonlySet<string> = new Set(Object.values(FINDING_CATEGORIES));

/**
 * Build the structured diagnostic scope for a report from its business
 * concerns and its already-computed, report-level evidence sufficiency
 * level. Never throws.
 *
 * Status is deliberately coarse: it reflects only whether ANY evidence
 * exists in the report at all (evidenceLevel !== "NONE"), never whether
 * evidence exists FOR that specific concern's topic. A consultant-selected
 * `selectedAreas` value does NOT change this — selecting an area tells MGD
 * what the consultant additionally wants cross-referenced for display (see
 * attachRelevantFindings below), never what to conclude. No AI, no keyword
 * matching, no inference from `concernText` is performed anywhere in this
 * module — `selectedAreas` is carried through exactly as submitted, filtered
 * only against the fixed, known Finding Category vocabulary (an integrity
 * check, not a classification).
 */
export function buildDiagnosticScope(
  businessConcerns: BusinessConcernInput[] | undefined,
  evidenceLevel: EvidenceLevel | undefined,
): DiagnosticScopeItem[] {
  try {
    const concerns = Array.isArray(businessConcerns) ? businessConcerns : [];
    const status: ScopeStatus = evidenceLevel === "NONE" ? "INSUFFICIENT_EVIDENCE" : "UNVALIDATED";

    const items: DiagnosticScopeItem[] = [];
    for (const raw of concerns) {
      let concernText = "";
      let selectedAreas: string[] = [];

      if (typeof raw === "string") {
        concernText = raw.trim();
      } else if (raw && typeof raw === "object" && typeof raw.text === "string") {
        concernText = raw.text.trim();
        if (Array.isArray(raw.selectedAreas)) {
          // Human-selected only — validated against the fixed vocabulary,
          // deduplicated, never derived from concernText.
          const seen = new Set<string>();
          for (const a of raw.selectedAreas) {
            if (typeof a === "string" && VALID_AREAS.has(a) && !seen.has(a)) {
              seen.add(a);
              selectedAreas.push(a);
            }
          }
        }
      }

      if (!concernText) continue;

      const item: DiagnosticScopeItem = {
        id: `scope-${items.length}`,
        concernText,
        origin: "BUSINESS_CONCERN",
        status,
      };
      if (selectedAreas.length > 0) item.selectedAreas = selectedAreas;
      items.push(item);
    }

    return items;
  } catch (err) {
    console.error("[MGD][SCOPE] buildDiagnosticScope failed — returning []:", err);
    return [];
  }
}

/**
 * Read-only cross-reference pass: for each scope item that has
 * `selectedAreas`, attach the ids of findings whose `category` is one of
 * those areas. Never mutates `findings`, never changes `status`, never
 * removes or reorders scope items. Mirrors the same "separate, additive
 * enrichment pass" shape already used by evidence-engine.ts's
 * attachEvidenceToFindings — spreads each item, never mutates in place.
 *
 * This is explicitly NOT validation (see DiagnosticScopeItem.relevantFindingIds
 * doc comment) — it exists only so a report can honestly say "these are the
 * findings MGD produced in the area you asked about," which is a factual,
 * deterministic statement the architecture can support without guessing.
 */
export function attachRelevantFindings(
  scopeItems: DiagnosticScopeItem[],
  findings: { id: string; category: string }[],
): DiagnosticScopeItem[] {
  try {
    if (!Array.isArray(scopeItems) || scopeItems.length === 0) return scopeItems ?? [];
    const safeFindings = Array.isArray(findings) ? findings.filter(f => f != null) : [];

    return scopeItems.map(item => {
      if (!item.selectedAreas || item.selectedAreas.length === 0) return { ...item };
      const areaSet = new Set(item.selectedAreas);
      const relevantFindingIds = safeFindings
        .filter(f => typeof f.category === "string" && areaSet.has(f.category))
        .map(f => f.id);
      return relevantFindingIds.length > 0 ? { ...item, relevantFindingIds } : { ...item };
    });
  } catch (err) {
    console.error("[MGD][SCOPE] attachRelevantFindings failed — returning scopeItems unchanged:", err);
    return scopeItems ?? [];
  }
}
