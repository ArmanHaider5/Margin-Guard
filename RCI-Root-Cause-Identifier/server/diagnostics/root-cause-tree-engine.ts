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

export function buildRootCauseTree(findings: any[]): RootCauseTree {
  if (!findings || findings.length === 0) {
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

  const sorted = [...findings].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const primary = sorted[0];
  const primaryCategory = primary.fourMCategory || primary.category || "";

  const primaryCause: RootCauseTreeNode = {
    id: primary.id,
    title: primary.name || primary.title || "",
    category: primaryCategory,
    score: primary.score ?? 0,
  };

  const secondaryCauses: RootCauseTreeNode[] = sorted
    .slice(1)
    .filter(
      (f) =>
        (f.fourMCategory || f.category || "") === primaryCategory &&
        (f.score ?? 0) > 30,
    )
    .slice(0, 3)
    .map((c) => ({
      id: c.id,
      title: c.name || c.title || "",
      category: c.fourMCategory || c.category || "",
      score: c.score ?? 0,
    }));

  const secondaryIds = new Set(secondaryCauses.map((s) => s.id));

  const contributingFactors: RootCauseTreeNode[] = sorted
    .slice(1)
    .filter(
      (f) =>
        !secondaryIds.has(f.id) &&
        f.id !== primaryCause.id &&
        (f.score ?? 0) > 10,
    )
    .map((c) => ({
      id: c.id,
      title: c.name || c.title || "",
      category: c.fourMCategory || c.category || "",
      score: c.score ?? 0,
    }));

  console.log("🌳 ROOT CAUSE TREE BUILT");
  console.log("Primary:", primaryCause?.id);
  console.log("Secondary:", secondaryCauses.length);
  console.log("Contributing:", contributingFactors.length);

  return {
    primaryCause,
    secondaryCauses,
    contributingFactors,
    category: primaryCategory,
  };
}
