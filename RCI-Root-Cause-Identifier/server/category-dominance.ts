import { SIGNAL_LIBRARY } from "../shared/signal-library";

export function detectCategoryDominance(signalIds: string[]) {

  const categoryCounts: Record<string, number> = {};

  for (const signalId of signalIds) {

    const signal =
      SIGNAL_LIBRARY.find(s => s.id === signalId);

    if (!signal) continue;

    if (!categoryCounts[signal.category]) {
      categoryCounts[signal.category] = 0;
    }

    categoryCounts[signal.category]++;

  }

  return Object.entries(categoryCounts)
    .map(([category, count]) => ({

      category,

      count

    }))
    .sort((a, b) => b.count - a.count);

}
