import { NormalizedSignal } from "./signal-normalizer";

export interface SignalCluster {
  category: string;
  signals: string[];
  strength: number;
}

export function buildSignalGraph(signals: NormalizedSignal[]): SignalCluster[] {

  const clusters: Record<string, SignalCluster> = {};

  for (const signal of signals) {

    const category = signal.category;

    if (!clusters[category]) {
      clusters[category] = {
        category,
        signals: [],
        strength: 0
      };
    }

    clusters[category].signals.push(signal.signalId);
    clusters[category].strength += 1;

  }

  return Object.values(clusters);

}
