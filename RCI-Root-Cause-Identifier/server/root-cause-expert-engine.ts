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

    if (triggerMatches > 0) {

      results.push({

        id: rootCause.id,

        name: rootCause.name,

        description: rootCause.description,

        category: rootCause.category,

        triggerMatches,

        supportMatches,

        score

      });

    }

  }

  return results.sort((a, b) => b.score - a.score);

}
