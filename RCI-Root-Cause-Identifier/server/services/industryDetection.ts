export function detectIndustryFromDocuments(text: string): string {

  const normalized = text.toLowerCase();

  const scores: Record<string, number> = {
    manufacturing: 0,
    retail: 0,
    logistics: 0,
    healthcare: 0,
    finance: 0
  };

  const manufacturingTerms = [
    "downtime",
    "production line",
    "machine breakdown",
    "preventive maintenance",
    "rework",
    "scrap",
    "shop floor",
    "line stoppage",
    "capacity utilization",
    "throughput"
  ];

  const retailTerms = [
    "point of sale",
    "inventory turnover",
    "stockout",
    "foot traffic",
    "basket size",
    "sell-through",
    "merchandise",
    "store operations",
    "shrinkage",
    "planogram"
  ];

  const logisticsTerms = [
    "fleet utilization",
    "route efficiency",
    "warehouse",
    "freight",
    "delivery time",
    "late deliveries",
    "dispatch",
    "shipment",
    "last mile",
    "cargo"
  ];

  const healthcareTerms = [
    "patient wait time",
    "bed occupancy",
    "surgery utilization",
    "readmission",
    "clinical",
    "patient throughput",
    "triage",
    "discharge",
    "ward",
    "medical"
  ];

  const financeTerms = [
    "revenue growth",
    "burn rate",
    "operating expense",
    "cash flow",
    "cost ratio",
    "margin erosion",
    "accounts receivable",
    "profit and loss",
    "balance sheet",
    "fiscal"
  ];

  manufacturingTerms.forEach(term => {
    if (normalized.includes(term)) scores.manufacturing++;
  });

  retailTerms.forEach(term => {
    if (normalized.includes(term)) scores.retail++;
  });

  logisticsTerms.forEach(term => {
    if (normalized.includes(term)) scores.logistics++;
  });

  healthcareTerms.forEach(term => {
    if (normalized.includes(term)) scores.healthcare++;
  });

  financeTerms.forEach(term => {
    if (normalized.includes(term)) scores.finance++;
  });

  const bestMatch = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

  if (bestMatch[1] > 2) return bestMatch[0];

  return "other";

}
