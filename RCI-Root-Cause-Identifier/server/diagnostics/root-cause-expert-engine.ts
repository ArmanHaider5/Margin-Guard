import { manufacturingRootCauseLibrary } from "../industries/manufacturing-root-cause-library";
import { evaluateSignalMaps } from "../signals/signal-map-engine";
import { scoreRootCauses } from "./root-cause-scorer";

console.log(
  "🧠 ROOT CAUSE LIBRARY LOADED:",
  manufacturingRootCauseLibrary.length,
  "manufacturing root causes"
);

export interface ExpertDiagnosisResult {
  id: string;
  name: string;
  description: string;
  category: string;
  triggerMatches: number;
  supportMatches: number;
  expertScore: number;
  signalMapScore: number;
  scorerScore: number;
  finalScore: number;
}

export function evaluateExpertRootCauses(signals: string[]) {

  const results = [];

  for (const rootCause of manufacturingRootCauseLibrary) {

    const triggerMatches =
      rootCause.triggers.filter(s => signals.includes(s)).length;

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

export function runExpertDiagnosis(
  signals: string[],
  topN: number = 3
): ExpertDiagnosisResult[] {

  const expertRuleResults = evaluateExpertRootCauses(signals);
  const signalMapResults = evaluateSignalMaps(signals);
  const normalizedForScorer = signals.map(s => ({ signalId: s }));
  const scorerResults = scoreRootCauses(normalizedForScorer);

  console.log("🧠 PIPELINE: ROOT CAUSE EXPERT ENGINE STARTED — rules:", expertRuleResults.length, "maps:", signalMapResults.length, "scorer:", scorerResults.length);

  const scorerLookup: Record<string, number> = {};
  for (const sr of scorerResults) {
    scorerLookup[sr.id] = sr.score;
  }

  const expertDiagnosis: ExpertDiagnosisResult[] =
    expertRuleResults.map(rule => {

      const signalMap =
        signalMapResults.find(
          m => m.rootCauseId === rule.id
        );

      const mapScore = signalMap?.score || 0;
      const scorerScore = scorerLookup[rule.id] || 0;

      return {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        category: rule.category,
        triggerMatches: rule.triggerMatches,
        supportMatches: rule.supportMatches,
        expertScore: rule.score,
        signalMapScore: mapScore,
        scorerScore,
        finalScore: rule.score + mapScore + scorerScore
      };

    })
    .sort((a, b) => b.finalScore - a.finalScore);

  const finalFindings = expertDiagnosis.slice(0, topN);

  console.log("🏆 PIPELINE: FINAL DIAGNOSIS GENERATED —", finalFindings.length, "findings");

  return finalFindings;
}
