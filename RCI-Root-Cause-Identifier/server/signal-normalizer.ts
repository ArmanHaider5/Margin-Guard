import { SIGNAL_LIBRARY } from "../shared/signal-library";

export interface NormalizedSignal {
  signalId: string;
  category: string;
  matchedPhrase: string;
}

export function normalizeSignals(text: string): NormalizedSignal[] {

  const detectedSignals: NormalizedSignal[] = [];

  const lowerText = text.toLowerCase();

  for (const signal of SIGNAL_LIBRARY) {

    for (const synonym of signal.synonyms) {

      if (lowerText.includes(synonym.toLowerCase())) {

        detectedSignals.push({
          signalId: signal.id,
          category: signal.category,
          matchedPhrase: synonym
        });

      }

    }

  }

  return detectedSignals;

}
