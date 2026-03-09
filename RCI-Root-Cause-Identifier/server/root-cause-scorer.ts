import { manufacturingRootCauses }
  from "./manufacturing-root-causes";

export function scoreRootCauses(detectedSignals: { signalId: string }[]) {

  const signalIds = detectedSignals.map(
    s => s.signalId
  );

  const results: {
    id: string;
    name: string;
    category: string;
    triggerMatches: number;
    supportMatches: number;
    score: number;
  }[] = [];

  for (const cause of manufacturingRootCauses) {

    let triggerMatches = 0;
    let supportMatches = 0;

    for (const trigger of cause.triggers) {

      if (signalIds.includes(trigger)) {
        triggerMatches++;
      }

    }

    for (const support of cause.support) {

      if (signalIds.includes(support)) {
        supportMatches++;
      }

    }

    const score =
      (triggerMatches * 10) +
      (supportMatches * 5);

    if (score > 0) {

      results.push({

        id: cause.id,
        name: cause.name,
        category: cause.category,
        triggerMatches,
        supportMatches,
        score

      });

    }

  }

  results.sort((a, b) => b.score - a.score);

  return results;

}
