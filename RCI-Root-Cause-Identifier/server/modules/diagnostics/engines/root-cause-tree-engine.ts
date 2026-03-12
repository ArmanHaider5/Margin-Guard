export interface RootCauseTreeNode {
  id: string;
  title: string;
  category: string;
  score: number;
}

export interface RootCauseTree {
  primaryCause: RootCauseTreeNode | null;
  secondaryCauses: RootCauseTreeNode[];
  contributingFactors: RootCauseTreeNode[];
  category: string;
}

export function buildRootCauseTree(
  signals: string[],
  rootCauses: any[],
  mappings: Record<string, string[]>
): RootCauseTree {
  if (!signals || signals.length === 0 || !rootCauses || rootCauses.length === 0) {
    console.log("🌳 ROOT CAUSE TREE BUILT");
    console.log("Primary:", null);
    console.log("Secondary:", 0);
    console.log("Contributing:", 0);
    return {
      primaryCause: null,
      secondaryCauses: [],
      contributingFactors: [],
      category: "",
    };
  }

  // Score each root cause by counting how many input signals map to it
  const scoreMap: Record<string, number> = {};
  for (const signal of signals) {
    const matchedRootCauses = mappings[signal] || [];
    for (const rcId of matchedRootCauses) {
      scoreMap[rcId] = (scoreMap[rcId] || 0) + 20;
    }
  }

  // Build scored entries from the root cause library
  const scored = rootCauses
    .map((rc: any) => ({
      id: rc.id,
      title: rc.name || rc.title || rc.id,
      category: rc.category || rc.fourMCategory || "",
      score: scoreMap[rc.id] || 0,
    }))
    .filter((rc) => rc.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    console.log("🌳 ROOT CAUSE TREE BUILT");
    console.log("Primary:", null);
    console.log("Secondary:", 0);
    console.log("Contributing:", 0);
    return {
      primaryCause: null,
      secondaryCauses: [],
      contributingFactors: [],
      category: "",
    };
  }

  const rankedRootCauses = scored;

  const primaryCause =
    rankedRootCauses?.[0] ||
    rootCauses?.[0] ||
    null;

  const secondaryCauses =
    rankedRootCauses?.slice(1, 3) ||
    rootCauses?.slice(1, 3) ||
    [];

  console.log("🌳 ROOT CAUSE TREE BUILT");
  console.log("Primary:", primaryCause?.id ?? null);
  console.log("Secondary:", secondaryCauses.length);

  return {
    primaryCause,
    secondaryCauses,
    contributingFactors: [],
    category: primaryCause?.category || ""
  };
}
