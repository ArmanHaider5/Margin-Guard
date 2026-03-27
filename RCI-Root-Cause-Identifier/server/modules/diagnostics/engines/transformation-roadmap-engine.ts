import {
  transformationRoadmapTemplates,
  categoryFallbackTemplates,
  type RoadmapTemplate,
} from "./transformation-roadmap-templates";

// ─────────────────────────────────────────────────────────────────────────────
// TRANSFORMATION ROADMAP ENGINE
//
// Produces a 3-phase, 30/60/90-day transformation roadmap from:
//   1. Named root cause → exact template match
//   2. Root cause category → category-level fallback template
//   3. Generic default fallback
//
// The output is a RoadmapTemplate (array of RoadmapPhase objects) that the
// results page renders with phase labels, titles, descriptions, and actions.
// ─────────────────────────────────────────────────────────────────────────────

export function generateTransformationRoadmap(
  primaryRootCause: any,
  findings?: any[]
): RoadmapTemplate {

  // ── 1. Exact title match ─────────────────────────────────────────────────
  const title = (primaryRootCause?.title ?? primaryRootCause?.name ?? "").trim();

  if (title && transformationRoadmapTemplates[title]) {
    console.log(`🗺️  ROADMAP: exact match → "${title}"`);
    return transformationRoadmapTemplates[title];
  }

  // ── 2. Fuzzy match on root cause title ──────────────────────────────────
  // If exact lookup fails, check whether any template key is contained in
  // (or contains) the root cause title — handles minor wording differences.
  if (title) {
    const titleLower = title.toLowerCase();
    for (const [templateKey, template] of Object.entries(transformationRoadmapTemplates)) {
      const keyLower = templateKey.toLowerCase();
      if (titleLower.includes(keyLower) || keyLower.includes(titleLower)) {
        console.log(`🗺️  ROADMAP: fuzzy match → "${templateKey}" for "${title}"`);
        return template;
      }
      // Also try keyword overlap (≥ 2 significant words in common)
      const titleWords = new Set(titleLower.split(/\s+/).filter(w => w.length > 3));
      const keyWords = keyLower.split(/\s+/).filter(w => w.length > 3);
      const overlap = keyWords.filter(w => titleWords.has(w)).length;
      if (overlap >= 2) {
        console.log(`🗺️  ROADMAP: keyword overlap (${overlap}) → "${templateKey}" for "${title}"`);
        return template;
      }
    }
  }

  // ── 3. Category-based fallback ───────────────────────────────────────────
  const category = (primaryRootCause?.category ?? "").trim();

  if (category && categoryFallbackTemplates[category]) {
    console.log(`🗺️  ROADMAP: category fallback → "${category}"`);
    return categoryFallbackTemplates[category];
  }

  // Derive category from findings if primaryRootCause doesn't have one
  if (findings && findings.length > 0) {
    const mostCommonCategory = getMostCommonCategory(findings);
    if (mostCommonCategory && categoryFallbackTemplates[mostCommonCategory]) {
      console.log(`🗺️  ROADMAP: findings category fallback → "${mostCommonCategory}"`);
      return categoryFallbackTemplates[mostCommonCategory];
    }
  }

  // ── 4. Generic default ───────────────────────────────────────────────────
  console.log(`🗺️  ROADMAP: using default fallback template`);
  return categoryFallbackTemplates["default"];
}

function getMostCommonCategory(findings: any[]): string | null {
  const categoryCounts: Record<string, number> = {};
  for (const f of findings) {
    const cat = (f.category ?? f.fourMCategory ?? "").trim();
    if (cat) categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
  }
  const entries = Object.entries(categoryCounts);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}
