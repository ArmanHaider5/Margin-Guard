export interface ConsultingNarrative {
  summary: string;
  narrative: string;
}

export function generateConsultingNarrative(
  rootCauseTree: any,
  causalChains: any[],
): ConsultingNarrative {
  const primary = rootCauseTree?.primaryCause;
  const secondary: any[] = rootCauseTree?.secondaryCauses || [];
  const chain: string[] = causalChains?.[0]?.chain || [];

  if (!primary) {
    console.log("🧠 CONSULTING NARRATIVE GENERATED");
    return {
      summary: "No primary operational issue identified.",
      narrative: "Insufficient evidence to construct a consulting narrative.",
    };
  }

  const primaryTitle = primary.title || primary.name || "Unknown";

  const summaryText = `Primary operational issue identified: ${primaryTitle}.`;

  let narrativeText = `Evidence suggests the primary operational issue is ${primaryTitle.toLowerCase()}.`;

  if (secondary.length > 0) {
    const secondaryNames = secondary
      .map((s: any) => s.title || s.name || "")
      .filter(Boolean)
      .join(", ");
    narrativeText += ` Supporting factors include ${secondaryNames.toLowerCase()}.`;
  }

  if (chain.length >= 2) {
    narrativeText += ` This results in the following operational impact chain: ${chain.join(" → ")}.`;
  }

  console.log("🧠 CONSULTING NARRATIVE GENERATED");

  return {
    summary: summaryText,
    narrative: narrativeText,
  };
}
