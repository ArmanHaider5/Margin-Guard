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

  const primary = scored[0];
  const primaryCategory = primary.category;

  const primaryCause: RootCauseTreeNode = {
    id: primary.id,
    title: primary.title,
    category: primaryCategory,
    score: primary.score,
  };

  const secondaryCauses: RootCauseTreeNode[] = scored
    .filter(
      (f) =>
        f.category === primaryCategory &&
        f.id !== primary.id &&
        f.score >= 40
    )
    .map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      score: c.score,
    }));

  const contributingFactors: RootCauseTreeNode[] = scored
    .filter(
      (f) =>
        f.score >= 20 &&
        f.id !== primary.id &&
        !secondaryCauses.find((s) => s.id === f.id)
    )
    .map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      score: c.score,
    }));

  console.log("🌳 ROOT CAUSE TREE BUILT");
  console.log("Primary:", primary.id);
  console.log("Secondary:", secondaryCauses.length);
  console.log("Contributing:", contributingFactors.length);

  return {
    primaryCause,
    secondaryCauses,
    contributingFactors,
    category: primaryCategory,
  };
}
