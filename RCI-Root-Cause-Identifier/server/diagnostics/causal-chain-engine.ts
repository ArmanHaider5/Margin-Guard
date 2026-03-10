const CAUSAL_LINKS: Record<string, string> = {
  "pm overdue": "maintenance backlog",
  "maintenance backlog": "machine breakdown",
  "machine breakdown": "downtime",
  "downtime": "overtime",
  "overtime": "missed delivery",
  "scrap": "rework",
  "rework": "quality rejection",
  "lead time increase": "missed delivery",
};

const KEY_SIGNALS = [
  "downtime",
  "machine breakdown",
  "pm overdue",
  "overtime",
  "scrap",
  "rework",
  "lead time increase",
  "maintenance backlog",
];

export interface CausalChain {
  chain: string[];
}

function buildChainFrom(signal: string): string[] {
  const chain: string[] = [signal];
  let current = signal;
  const visited = new Set<string>();
  visited.add(current);

  while (CAUSAL_LINKS[current]) {
    const next = CAUSAL_LINKS[current];
    if (visited.has(next)) break;
    chain.push(next);
    visited.add(next);
    current = next;
  }

  return chain;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function buildCausalChains(signals: any[], findings: any[]): CausalChain[] {
  const detectedSignals = new Set<string>();

  for (const sig of signals || []) {
    const id = (sig.signalId || sig.id || "").toLowerCase().replace(/_/g, " ");
    if (KEY_SIGNALS.includes(id)) {
      detectedSignals.add(id);
    }

    const phrase = (sig.matchedPhrase || sig.phrase || "").toLowerCase();
    for (const key of KEY_SIGNALS) {
      if (phrase.includes(key)) {
        detectedSignals.add(key);
      }
    }
  }

  for (const f of findings || []) {
    const title = (f.title || f.name || "").toLowerCase();
    for (const key of KEY_SIGNALS) {
      if (title.includes(key)) {
        detectedSignals.add(key);
      }
    }
  }

  const chainMap = new Map<string, string[]>();

  for (const signal of detectedSignals) {
    const chain = buildChainFrom(signal);
    if (chain.length >= 2) {
      const key = chain.join(" → ");
      if (!chainMap.has(key)) {
        chainMap.set(key, chain);
      }
    }
  }

  const seen = new Set<string>();
  const deduplicated: string[][] = [];

  for (const [_key, chain] of Array.from(chainMap.entries()).sort(
    (a, b) => b[1].length - a[1].length,
  )) {
    const isSubset = deduplicated.some((existing) => {
      const existingSet = new Set(existing);
      return chain.every((s) => existingSet.has(s));
    });

    if (!isSubset) {
      deduplicated.push(chain);
    }
  }

  const chains: CausalChain[] = deduplicated.map((chain) => ({
    chain: chain.map(capitalize),
  }));

  console.log("🔗 CAUSAL CHAINS GENERATED:", chains.length);

  return chains;
}
