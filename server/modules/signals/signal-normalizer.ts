import { manufacturingSignals } from "../../modules/industries/manufacturing/manufacturing-signals";

export interface NormalizedSignal {
  signalId: string;
  category: string;
  matchedPhrase: string;
}

export function normalizeSignals(text: string): NormalizedSignal[] {

  const detectedSignals: NormalizedSignal[] = [];
  const lowerText = text.toLowerCase();

  for (const signal of manufacturingSignals) {

    for (const phrase of signal.phrases) {

      if (lowerText.includes(phrase.toLowerCase())) {

        detectedSignals.push({
          signalId: signal.id,
          category: signal.category,
          matchedPhrase: phrase
        });

      }

    }

  }

  return detectedSignals;

}
