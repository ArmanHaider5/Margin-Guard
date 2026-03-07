export interface AggregatedSignal {

  signalId: string;

  count: number;

}

export function aggregateSignals(signalIds: string[]) {

  const signalCounts: Record<string, number> = {};

  for (const signal of signalIds) {

    if (!signalCounts[signal]) {
      signalCounts[signal] = 0;
    }

    signalCounts[signal]++;

  }

  const aggregated: AggregatedSignal[] =
    Object.entries(signalCounts).map(([signalId, count]) => ({

      signalId,

      count

    }));

  return aggregated.sort((a, b) => b.count - a.count);

}
