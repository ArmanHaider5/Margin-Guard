import { manufacturingRootCauseLibrary }
  from "../industries/manufacturing-root-cause-library";

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

  for (const cause of manufacturingRootCauseLibrary) {

    let triggerMatches = 0;
    let supportMatches = 0;

    for (const trigger of cause.triggers) {

      if (signalIds.includes(trigger)) {
        triggerMatches++;
      }

    }

    for (const signal of cause.supportingSignals) {

      if (signalIds.includes(signal)) {
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
