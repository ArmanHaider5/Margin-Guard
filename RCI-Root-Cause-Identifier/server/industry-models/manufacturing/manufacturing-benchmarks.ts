export const manufacturingBenchmarks: Record<string, { target: number; unit: string }> = {
  downtime: { target: 6, unit: "hours/week" },
  overtime: { target: 5, unit: "% workforce" },
  otd: { target: 95, unit: "%" },
  scrap_rate: { target: 2, unit: "%" },
  rework_rate: { target: 3, unit: "%" },
};
