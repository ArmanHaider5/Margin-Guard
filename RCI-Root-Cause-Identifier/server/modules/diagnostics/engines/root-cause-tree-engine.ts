export interface RootCauseTree {
  primaryCause: any | null;
  secondaryCauses: any[];
  contributingFactors: any[];
  category: string;
}

export function buildRootCauseTree(findings: any[]): RootCauseTree {

  if (!findings || findings.length === 0) {
    console.log("ROOT TREE: No findings provided");
    return {
      primaryCause: null,
      secondaryCauses: [],
      contributingFactors: [],
      category: ""
    };
  }

  // Sort findings by score (highest first)
  const sorted = [...findings].sort((a, b) => (b.score || 0) - (a.score || 0));

  const primary = sorted[0] || null;

  const secondary = sorted.slice(1, 3);

  console.log("🌳 ROOT CAUSE TREE BUILT");
  console.log("Primary:", primary?.title || primary?.name || primary?.id || "unknown");
  console.log("Secondary:", secondary.length);

  return {
    primaryCause: primary,
    secondaryCauses: secondary,
    contributingFactors: [],
    category: primary?.category || ""
  };
}
