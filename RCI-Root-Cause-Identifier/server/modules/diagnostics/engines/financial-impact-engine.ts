export interface FinancialImpact {
  downtimeLoss: number;
  scrapLoss: number;
  overtimeCost: number;
  totalLoss: number;
}

export function estimateFinancialImpact(signals: string[]): FinancialImpact {

  let downtimeLoss = 0;
  let scrapLoss = 0;
  let overtimeCost = 0;

  if (signals.includes("downtime")) {
    downtimeLoss = 400000;
  }

  if (signals.includes("scrap")) {
    scrapLoss = 120000;
  }

  if (signals.includes("rework")) {
    scrapLoss += 60000;
  }

  if (signals.includes("overtime_spike")) {
    overtimeCost = 90000;
  }

  const totalLoss = downtimeLoss + scrapLoss + overtimeCost;

  return {
    downtimeLoss,
    scrapLoss,
    overtimeCost,
    totalLoss
  };
}
