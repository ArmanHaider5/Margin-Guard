import { ROOT_CAUSE_SIGNAL_MAPS } from "../../shared/root-cause-signal-map";

export function evaluateSignalMaps(signals: string[]) {

  const results = [];

  for (const map of ROOT_CAUSE_SIGNAL_MAPS) {

    const primaryMatches =
      map.primarySignals.filter(s => signals.includes(s)).length;

    const secondaryMatches =
      map.secondarySignals.filter(s => signals.includes(s)).length;

    const score =
      primaryMatches * 6 + secondaryMatches * 3;

    if (primaryMatches > 0) {

      results.push({

        rootCauseId: map.rootCauseId,

        primaryMatches,

        secondaryMatches,

        score

      });

    }

  }

  return results.sort((a, b) => b.score - a.score);

}
