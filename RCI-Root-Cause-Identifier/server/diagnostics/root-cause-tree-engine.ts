export interface RootCauseTreeNode {
  id: string;
  title: string;
  category: string;
  score: number;
  description?: string;
  severity?: string;
  evidence?: string[];
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

  const primaryCause: RootCauseTreeNode = {
    id: sorted[0].id,
    title: sorted[0].title,
    category: sorted[0].fourMCategory || sorted[0].category || "",
    score: sorted[0].score ?? 0,
    description: sorted[0].description,
    severity: sorted[0].severity,
    evidence: sorted[0].evidence,
  };

  const primaryCategory = primaryCause.category;

  const secondaryCauses: RootCauseTreeNode[] = sorted
    .slice(1)
    .filter(
      (f) =>
        (f.fourMCategory || f.category || "") === primaryCategory &&
        (f.score ?? 0) > 30,
    )
    .slice(0, 3)
    .map((f) => ({
      id: f.id,
      title: f.title,
      category: f.fourMCategory || f.category || "",
      score: f.score ?? 0,
      description: f.description,
      severity: f.severity,
      evidence: f.evidence,
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
    .map((f) => ({
      id: f.id,
      title: f.title,
      category: f.fourMCategory || f.category || "",
      score: f.score ?? 0,
      description: f.description,
      severity: f.severity,
      evidence: f.evidence,
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
