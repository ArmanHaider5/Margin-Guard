import { EXPERT_ROOT_CAUSES } from "../shared/root-cause-expert-library";

export function evaluateExpertRootCauses(signals: string[]) {

  const results = [];

  for (const rootCause of EXPERT_ROOT_CAUSES) {

    const triggerMatches =
      rootCause.triggerSignals.filter(s => signals.includes(s)).length;

    const supportMatches =
      rootCause.supportingSignals.filter(s => signals.includes(s)).length;

    const score =
      triggerMatches * 5 + supportMatches * 2;

    const evidenceStrength =
      triggerMatches + supportMatches;

    if (triggerMatches >= 1 && evidenceStrength >= 2) {

      results.push({

        id: rootCause.id,

        name: rootCause.name,

        description: rootCause.description,

        category: rootCause.category,

        triggerMatches,

        supportMatches,

        evidenceStrength,

        score

      });

    }

  }

  return results.sort((a, b) => b.score - a.score);

}
