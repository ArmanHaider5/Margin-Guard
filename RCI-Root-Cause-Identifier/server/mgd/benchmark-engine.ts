// ─────────────────────────────────────────────────────────────────────────────
// MGD BENCHMARK ENGINE
//
// Provides deterministic benchmark intelligence, operational threshold analysis,
// and industry-relative performance interpretation for MGD operational
// diagnostics.
//
// Design principles:
//   • No AI/LLM — all threshold bands, interpretations, risks, and corrective
//     actions are deterministic and data-driven.
//   • Each detector is independently try/catch wrapped — one failure cannot
//     suppress the remaining results.
//   • Metrics not present in the input are silently suppressed (no null results).
//   • Output is sorted: CRITICAL → ELEVATED → WATCHLIST → HEALTHY.
//   • Industry-aware language: event_management terminology applied when relevant.
//   • Architecture is extensible: additional benchmark packs can be registered
//     as separate detector arrays and merged at the top level.
// ─────────────────────────────────────────────────────────────────────────────

import { FINDING_CATEGORIES } from "./finding-categories";

// ── Exported interfaces ────────────────────────────────────────────────────────

export interface BenchmarkResult {
  id: string;

  metric: string;

  category: string;

  actualValue: number;

  benchmarkRange: {
    low:    number;
    medium: number;
    high:   number;
  };

  status: "HEALTHY" | "WATCHLIST" | "ELEVATED" | "CRITICAL";

  interpretation: string;

  operationalRisk?: string;

  recommendedAction?: string;

  confidence: number;
}

export interface BenchmarkContext {
  inventoryLossRate?:          number;   // % of inventory unaccounted for
  refundRate?:                 number;   // % of orders/events resulting in refunds
  logisticsUtilization?:       number;   // % of available logistics capacity utilised
  rejectedJobsRate?:           number;   // % of jobs/events rejected or cancelled
  operationalHealthScore?:     number;   // 0–100 composite health score
  reconciliationDelayRate?:    number;   // % of reconciliation cycles delayed
  manualWorkflowDependency?:   number;   // % of workflows executed manually
  inventoryDiscrepancyRate?:   number;   // % of inventory checks with discrepancies
  manpowerDependencyRate?:     number;   // % of decisions made by ≤2 individuals
  overtimeExposureRate?:       number;   // % of working hours classified as overtime
}

// ── Status ordering (for sort) ───────────────────────────────────────────────

const STATUS_ORDER: Record<string, number> = {
  CRITICAL: 4, ELEVATED: 3, WATCHLIST: 2, HEALTHY: 1,
};

// ── Deterministic ID ──────────────────────────────────────────────────────────

function hashMetric(metric: string): string {
  let h = 5381;
  for (const ch of metric) {
    h = ((h << 5) + h) ^ ch.charCodeAt(0);
    h = h >>> 0;
  }
  return `mgd-bm-${h.toString(16).padStart(8, "0")}`;
}

// ── Core helpers ──────────────────────────────────────────────────────────────

/**
 * Classify a metric value against four threshold bands.
 *
 * thresholds: [watchlistFloor, elevatedFloor, criticalFloor]
 *   value < watchlistFloor  → HEALTHY
 *   value < elevatedFloor   → WATCHLIST
 *   value < criticalFloor   → ELEVATED
 *   value >= criticalFloor  → CRITICAL
 *
 * For HEALTH SCORE (higher is better), pass invertedScale = true; the same
 * boundary values are re-interpreted as upper limits.
 */
export function classifyBenchmarkStatus(
  value:         number,
  thresholds:    [number, number, number],
  invertedScale: boolean = false,
): "HEALTHY" | "WATCHLIST" | "ELEVATED" | "CRITICAL" {
  const [watchlist, elevated, critical] = thresholds;
  if (!invertedScale) {
    if (value < watchlist) return "HEALTHY";
    if (value < elevated)  return "WATCHLIST";
    if (value < critical)  return "ELEVATED";
    return "CRITICAL";
  } else {
    // Higher value is better (e.g. health score)
    if (value >= watchlist) return "HEALTHY";
    if (value >= elevated)  return "WATCHLIST";
    if (value >= critical)  return "ELEVATED";
    return "CRITICAL";
  }
}

/**
 * Build a concise executive interpretation sentence for a metric.
 */
export function buildBenchmarkInterpretation(
  metricLabel: string,
  value:       number,
  status:      string,
  unit:        string,
  industry?:   string,
): string {
  const em = industry === "event_management";
  const formatted = `${value.toFixed(1)}${unit}`;

  switch (status) {
    case "HEALTHY":
      return `${metricLabel} of ${formatted} is within sustainable operational norms — no corrective intervention is required at this time.`;
    case "WATCHLIST":
      return em
        ? `${metricLabel} of ${formatted} is slightly above the optimal band for event operations. Monitoring is recommended to prevent escalation.`
        : `${metricLabel} of ${formatted} is slightly elevated above the healthy range. Preventive monitoring is recommended.`;
    case "ELEVATED":
      return em
        ? `${metricLabel} of ${formatted} reflects material strain in event operational performance, indicating structural inefficiency that requires targeted corrective action.`
        : `${metricLabel} of ${formatted} indicates material operational strain that exceeds sustainable thresholds and requires structured corrective action.`;
    case "CRITICAL":
      return em
        ? `${metricLabel} of ${formatted} represents an unsustainable operational condition for event delivery — immediate intervention is required to prevent recurring service failures.`
        : `${metricLabel} of ${formatted} is at a critical level that is unsustainable and will generate compounding operational failures without immediate corrective action.`;
    default:
      return `${metricLabel} is currently at ${formatted}.`;
  }
}

/**
 * Generate the operational risk sentence for a given status and metric.
 */
export function buildOperationalRisk(
  metricLabel: string,
  status:      string,
  riskByStatus: Record<string, string>,
): string | undefined {
  if (status === "HEALTHY") return undefined;
  return riskByStatus[status] ?? `Elevated ${metricLabel} introduces operational risk that may compound under demand pressure.`;
}

/**
 * Generate the corrective action sentence for a given status and metric.
 */
export function buildCorrectiveAction(
  status:           string,
  actionByStatus:   Record<string, string>,
): string | undefined {
  if (status === "HEALTHY") return undefined;
  return actionByStatus[status] ?? "Review operational controls and implement corrective measures.";
}

// ── Benchmark detectors ───────────────────────────────────────────────────────
// Each returns BenchmarkResult | null.
// null means: metric was not provided (suppressed silently).

export function benchmarkInventoryLoss(
  value:    number | undefined,
  industry?: string,
): BenchmarkResult | null {
  if (value == null) return null;

  // Thresholds: [watchlist, elevated, critical] in %
  const thresholds: [number, number, number] = [2, 4, 7];
  const status = classifyBenchmarkStatus(value, thresholds);

  const risks: Record<string, string> = {
    WATCHLIST: "Minor inventory loss may indicate undocumented shrinkage or recording gaps. Left unaddressed, this will erode gross margin progressively.",
    ELEVATED:  "Inventory loss at this rate is generating measurable financial leakage and signals a breakdown in stock accountability controls.",
    CRITICAL:  "Inventory loss at this level represents significant uncontrolled shrinkage — the financial and operational cost of this condition is compounding.",
  };

  const actions: Record<string, string> = {
    WATCHLIST: "Introduce periodic cycle counts and review outbound recording procedures to identify and close the leakage source.",
    ELEVATED:  "Implement mandatory closing-balance verification at each stock movement event and conduct an immediate audit of the highest-loss SKUs.",
    CRITICAL:  "Suspend affected inventory lines pending a full stock audit. Introduce real-time scanning or barcode reconciliation to restore accountability.",
  };

  return {
    id:            hashMetric("inventory_loss_rate"),
    metric:        "Inventory Loss Rate",
    category:      "inventory_control",
    actualValue:   value,
    benchmarkRange:{ low: thresholds[0], medium: thresholds[1], high: thresholds[2] },
    status,
    interpretation: buildBenchmarkInterpretation("Inventory Loss Rate", value, status, "%", industry),
    operationalRisk:   buildOperationalRisk("Inventory Loss Rate", status, risks),
    recommendedAction: buildCorrectiveAction(status, actions),
    confidence: 90,
  };
}

export function benchmarkRefundLeakage(
  value:    number | undefined,
  industry?: string,
): BenchmarkResult | null {
  if (value == null) return null;

  const thresholds: [number, number, number] = [3, 5, 8];
  const status = classifyBenchmarkStatus(value, thresholds);

  const em = industry === "event_management";

  const risks: Record<string, string> = {
    WATCHLIST: em
      ? "Refund rates slightly above the norm for event delivery indicate client satisfaction gaps that may be attributable to operational rather than commercial causes."
      : "Refund rates above baseline suggest systematic quality or fulfilment gaps that are eroding revenue.",
    ELEVATED: em
      ? "Material refund leakage in event operations typically indicates recurring delivery failures — these are operational problems generating commercial consequences."
      : "Elevated refund rates indicate recurring operational or product failures driving material revenue erosion.",
    CRITICAL: em
      ? "Refund rates at this level indicate a systemic event delivery breakdown. Client confidence is at risk and revenue recovery is being offset by refund obligations."
      : "Critical refund rates indicate systemic quality failure. Revenue recovery is being structurally offset by refund obligations.",
  };

  const actions: Record<string, string> = {
    WATCHLIST: "Review the top refund categories and trace each to its operational root cause. Introduce pre-service quality checkpoints.",
    ELEVATED:  "Conduct a root cause analysis on the top 3 refund drivers. Implement service delivery checklists and client communication protocols.",
    CRITICAL:  "Suspend the highest-risk service lines pending a full process review. Introduce mandatory pre-delivery sign-off and post-service feedback capture.",
  };

  return {
    id:            hashMetric("refund_leakage_rate"),
    metric:        "Refund Leakage Rate",
    category:      FINDING_CATEGORIES.FINANCIAL_LEAKAGE,
    actualValue:   value,
    benchmarkRange:{ low: thresholds[0], medium: thresholds[1], high: thresholds[2] },
    status,
    interpretation: buildBenchmarkInterpretation("Refund Leakage Rate", value, status, "%", industry),
    operationalRisk:   buildOperationalRisk("Refund Leakage Rate", status, risks),
    recommendedAction: buildCorrectiveAction(status, actions),
    confidence: 88,
  };
}

export function benchmarkLogisticsCapacity(
  value:    number | undefined,
  industry?: string,
): BenchmarkResult | null {
  if (value == null) return null;

  // High utilisation is a risk: thresholds represent OVER-utilisation bands
  const thresholds: [number, number, number] = [75, 85, 95];
  const status = classifyBenchmarkStatus(value, thresholds);

  const em = industry === "event_management";

  const risks: Record<string, string> = {
    WATCHLIST: em
      ? "Logistics capacity approaching 75% utilisation leaves limited buffer for event schedule surges or last-minute additions."
      : "Logistics utilisation approaching the sustainable ceiling limits flexibility for demand surges.",
    ELEVATED: em
      ? "At this utilisation rate, any unplanned event addition or venue change will stress logistics beyond recoverable capacity."
      : "Logistics capacity at this level will generate fulfilment failures during any demand peak or schedule deviation.",
    CRITICAL: em
      ? "Logistics is at near-maximum utilisation — the operation has no capacity buffer. A single event change could generate a cascade of delivery failures."
      : "Logistics capacity is critically exhausted. Fulfilment reliability is at risk and service failures under peak demand are highly probable.",
  };

  const actions: Record<string, string> = {
    WATCHLIST: "Review scheduling density and identify periods where load can be redistributed to create buffer capacity.",
    ELEVATED:  "Conduct a logistics capacity audit. Engage backup logistics providers and introduce load balancing protocols for peak periods.",
    CRITICAL:  "Immediate logistics capacity review required. Prioritise critical deliveries, defer non-essential load, and activate contingency transport arrangements.",
  };

  return {
    id:            hashMetric("logistics_utilization"),
    metric:        "Logistics Capacity Utilisation",
    category:      FINDING_CATEGORIES.LOGISTICS_COORDINATION,
    actualValue:   value,
    benchmarkRange:{ low: thresholds[0], medium: thresholds[1], high: thresholds[2] },
    status,
    interpretation: buildBenchmarkInterpretation("Logistics Capacity Utilisation", value, status, "%", industry),
    operationalRisk:   buildOperationalRisk("Logistics Capacity Utilisation", status, risks),
    recommendedAction: buildCorrectiveAction(status, actions),
    confidence: 82,
  };
}

export function benchmarkOperationalHealth(
  value:    number | undefined,
  industry?: string,
): BenchmarkResult | null {
  if (value == null) return null;

  // Inverted scale: higher is better. Thresholds: [healthy_min, watchlist_min, elevated_min]
  const thresholds: [number, number, number] = [80, 65, 50];
  const status = classifyBenchmarkStatus(value, thresholds, true);

  const interpretations: Record<string, string> = {
    HEALTHY:   `Operational Health Score of ${value.toFixed(0)}/100 reflects an operation performing within sustainable parameters. Continued monitoring is recommended.`,
    WATCHLIST: `Operational Health Score of ${value.toFixed(0)}/100 indicates moderate structural inefficiency. The operation is functional but is absorbing unnecessary friction.`,
    ELEVATED:  `Operational Health Score of ${value.toFixed(0)}/100 reflects significant operational strain. The current model will not sustain performance under increased demand.`,
    CRITICAL:  `Operational Health Score of ${value.toFixed(0)}/100 indicates critical instability. Compounding operational failures are likely without immediate corrective intervention.`,
  };

  const risks: Record<string, string> = {
    WATCHLIST: "Moderate health strain signals structural inefficiency that will amplify under demand growth if not addressed proactively.",
    ELEVATED:  "Elevated operational strain indicates the business is sustaining performance through effort rather than process — an unsustainable condition.",
    CRITICAL:  "Critical operational health indicates systemic process failures generating recurring disruption and compounding costs.",
  };

  const actions: Record<string, string> = {
    WATCHLIST: "Prioritise the highest-impact operational findings and implement structured stabilisation actions within 30 days.",
    ELEVATED:  "Initiate a structured operational improvement programme addressing the most acute root causes. Target a health score improvement to the 65+ band within 60 days.",
    CRITICAL:  "Treat operational stabilisation as an emergency priority. Implement immediate corrective actions across all CRITICAL-status operational findings.",
  };

  return {
    id:            hashMetric("operational_health_score"),
    metric:        "Operational Health Score",
    category:      "operational_health",
    actualValue:   value,
    benchmarkRange:{ low: thresholds[0], medium: thresholds[1], high: thresholds[2] },
    status,
    interpretation: interpretations[status],
    operationalRisk:   buildOperationalRisk("Operational Health", status, risks),
    recommendedAction: buildCorrectiveAction(status, actions),
    confidence: 95,
  };
}

export function benchmarkReconciliationDelays(
  value:    number | undefined,
  industry?: string,
): BenchmarkResult | null {
  if (value == null) return null;

  const thresholds: [number, number, number] = [10, 20, 35];
  const status = classifyBenchmarkStatus(value, thresholds);

  const risks: Record<string, string> = {
    WATCHLIST: "Reconciliation delays above 10% introduce data latency that reduces the reliability of operational decision-making.",
    ELEVATED:  "Reconciliation delays at this rate indicate systematic process gaps that are distorting the accuracy of inventory and financial records.",
    CRITICAL:  "Reconciliation delays at this level mean operational records are materially unreliable — decisions are being made on lagged or inaccurate data.",
  };

  const actions: Record<string, string> = {
    WATCHLIST: "Review reconciliation scheduling and identify the top delay sources. Introduce SLA targets for reconciliation cycle completion.",
    ELEVATED:  "Implement automated reconciliation triggers at key process milestones. Assign ownership of reconciliation completion to a specific role.",
    CRITICAL:  "Halt all non-essential manual processes and redirect capacity to clearing the reconciliation backlog. Introduce daily reconciliation mandates with management sign-off.",
  };

  return {
    id:            hashMetric("reconciliation_delay_rate"),
    metric:        "Reconciliation Delay Rate",
    category:      FINDING_CATEGORIES.WORKFLOW_SCALABILITY,
    actualValue:   value,
    benchmarkRange:{ low: thresholds[0], medium: thresholds[1], high: thresholds[2] },
    status,
    interpretation: buildBenchmarkInterpretation("Reconciliation Delay Rate", value, status, "%", industry),
    operationalRisk:   buildOperationalRisk("Reconciliation Delay Rate", status, risks),
    recommendedAction: buildCorrectiveAction(status, actions),
    confidence: 80,
  };
}

export function benchmarkManualDependency(
  value:    number | undefined,
  industry?: string,
): BenchmarkResult | null {
  if (value == null) return null;

  const thresholds: [number, number, number] = [30, 50, 70];
  const status = classifyBenchmarkStatus(value, thresholds);

  const em = industry === "event_management";

  const risks: Record<string, string> = {
    WATCHLIST: em
      ? "Manual workflow dependency above 30% in event operations introduces execution risk that scales directly with event volume."
      : "Manual workflow dependency above 30% introduces significant execution risk that will amplify under demand growth.",
    ELEVATED: em
      ? "Over half of event operational workflows are executed manually — this is a structural scalability constraint that will generate recurring execution failures."
      : "The majority of workflows are manually dependent — this is an unsustainable operating model that will generate systematic failures under volume.",
    CRITICAL: em
      ? "Manual dependency at this level means event operations cannot scale. Every additional event compounds the coordination and execution burden disproportionately."
      : "Critical manual dependency renders the operation structurally unscalable. Systemic failures are inevitable under any material demand increase.",
  };

  const actions: Record<string, string> = {
    WATCHLIST: "Identify the top 5 manual workflows by frequency and design structured automation or checklist substitutes.",
    ELEVATED:  "Initiate a workflow redesign programme targeting the highest-frequency manual processes. Introduce digital tools or templates for at least 50% of manual touchpoints.",
    CRITICAL:  "Immediate workflow redesign is required. Map all manual processes, prioritise the top 10 by operational risk, and implement structured replacements within 30 days.",
  };

  return {
    id:            hashMetric("manual_workflow_dependency"),
    metric:        "Manual Workflow Dependency",
    category:      FINDING_CATEGORIES.WORKFLOW_SCALABILITY,
    actualValue:   value,
    benchmarkRange:{ low: thresholds[0], medium: thresholds[1], high: thresholds[2] },
    status,
    interpretation: buildBenchmarkInterpretation("Manual Workflow Dependency", value, status, "%", industry),
    operationalRisk:   buildOperationalRisk("Manual Workflow Dependency", status, risks),
    recommendedAction: buildCorrectiveAction(status, actions),
    confidence: 78,
  };
}

export function benchmarkInventoryDiscrepancy(
  value:    number | undefined,
  industry?: string,
): BenchmarkResult | null {
  if (value == null) return null;

  const thresholds: [number, number, number] = [5, 10, 20];
  const status = classifyBenchmarkStatus(value, thresholds);

  const risks: Record<string, string> = {
    WATCHLIST: "Inventory discrepancy rates above 5% introduce uncertainty into stock position reporting, increasing the risk of fulfilment shortfalls.",
    ELEVATED:  "At this discrepancy rate, inventory records cannot be relied upon for operational decision-making — replenishment, allocation, and dispatch decisions are all compromised.",
    CRITICAL:  "Critical inventory discrepancy rates indicate a fundamental breakdown in stock control. Accurate inventory visibility is absent, and the operational consequences are likely cascading.",
  };

  const actions: Record<string, string> = {
    WATCHLIST: "Introduce spot-check auditing at the highest-discrepancy SKU categories and review data entry procedures at point-of-receipt.",
    ELEVATED:  "Conduct a full inventory audit. Implement mandatory reconciliation after each stock movement and introduce dual-verification for high-value items.",
    CRITICAL:  "Suspend replenishment orders pending a complete physical stock audit. Implement barcode or RFID-based tracking to restore inventory accuracy immediately.",
  };

  return {
    id:            hashMetric("inventory_discrepancy_rate"),
    metric:        "Inventory Discrepancy Rate",
    category:      "inventory_control",
    actualValue:   value,
    benchmarkRange:{ low: thresholds[0], medium: thresholds[1], high: thresholds[2] },
    status,
    interpretation: buildBenchmarkInterpretation("Inventory Discrepancy Rate", value, status, "%", industry),
    operationalRisk:   buildOperationalRisk("Inventory Discrepancy Rate", status, risks),
    recommendedAction: buildCorrectiveAction(status, actions),
    confidence: 85,
  };
}

export function benchmarkManpowerDependency(
  value:    number | undefined,
  industry?: string,
): BenchmarkResult | null {
  if (value == null) return null;

  const thresholds: [number, number, number] = [20, 35, 55];
  const status = classifyBenchmarkStatus(value, thresholds);

  const em = industry === "event_management";

  const risks: Record<string, string> = {
    WATCHLIST: em
      ? "A notable share of event coordination decisions resting with one or two individuals creates vulnerability during illness, travel, or multi-event clashes."
      : "Operational decisions concentrated in a small number of individuals creates single-point-of-failure risk.",
    ELEVATED: em
      ? "Event delivery reliability is significantly compromised by dependency on a small number of coordinators. Concurrent events or absences will generate delivery failures."
      : "Critical operational decisions are concentrated in too few individuals — this creates systemic fragility that will manifest as recurring failures under normal operating conditions.",
    CRITICAL: em
      ? "The event operation is critically dependent on a single decision-maker or a very small team. Any absence or concurrent demand will halt or severely compromise event delivery."
      : "Manpower dependency at this level represents a critical single-point-of-failure. The operation cannot function reliably without specific individuals.",
  };

  const actions: Record<string, string> = {
    WATCHLIST: "Document the decision-making authorities concentrated in key individuals and identify candidates for cross-training.",
    ELEVATED:  "Implement a structured knowledge transfer programme. Distribute decision-making authority across at least 3 individuals for each operational domain.",
    CRITICAL:  "Immediately initiate a cross-training and knowledge distribution programme. Assign backup decision-makers for all critical operational roles and document all undocumented processes.",
  };

  return {
    id:            hashMetric("manpower_dependency_rate"),
    metric:        "Manpower Dependency Rate",
    category:      FINDING_CATEGORIES.MANPOWER_DEPENDENCY,
    actualValue:   value,
    benchmarkRange:{ low: thresholds[0], medium: thresholds[1], high: thresholds[2] },
    status,
    interpretation: buildBenchmarkInterpretation("Manpower Dependency Rate", value, status, "%", industry),
    operationalRisk:   buildOperationalRisk("Manpower Dependency Rate", status, risks),
    recommendedAction: buildCorrectiveAction(status, actions),
    confidence: 75,
  };
}

export function benchmarkOvertimeExposure(
  value:    number | undefined,
  industry?: string,
): BenchmarkResult | null {
  if (value == null) return null;

  const thresholds: [number, number, number] = [10, 20, 30];
  const status = classifyBenchmarkStatus(value, thresholds);

  const em = industry === "event_management";

  const risks: Record<string, string> = {
    WATCHLIST: em
      ? "Overtime exposure above 10% in event operations suggests that staffing levels are insufficient for event volume, or that pre-event planning is absorbing unplanned surge hours."
      : "Overtime above 10% of total working hours indicates structural understaffing or inefficient scheduling.",
    ELEVATED: em
      ? "At this overtime rate, staff fatigue is becoming a delivery risk factor. Event execution quality deteriorates under sustained high-overtime conditions."
      : "Elevated overtime indicates that the operating model is not sustainable at current volume — costs and error rates will both increase under these conditions.",
    CRITICAL: em
      ? "Overtime at this level is unsustainable and is compromising event delivery quality and staff wellbeing. This will manifest as execution errors, attrition, and client complaints."
      : "Critical overtime exposure indicates the operation is structurally understaffed or systematically inefficient — costs are compounding and quality risk is high.",
  };

  const actions: Record<string, string> = {
    WATCHLIST: "Review scheduling efficiency and identify whether overtime is concentrated in specific roles or event types.",
    ELEVATED:  "Conduct a staffing model review. Identify whether overtime is driven by volume (understaffing) or inefficiency (process gaps) and address accordingly.",
    CRITICAL:  "Immediate staffing model review is required. Introduce shift rotation protocols, consider temporary capacity augmentation, and audit the processes generating the highest overtime burden.",
  };

  return {
    id:            hashMetric("overtime_exposure_rate"),
    metric:        "Overtime Exposure Rate",
    category:      FINDING_CATEGORIES.MANPOWER_DEPENDENCY,
    actualValue:   value,
    benchmarkRange:{ low: thresholds[0], medium: thresholds[1], high: thresholds[2] },
    status,
    interpretation: buildBenchmarkInterpretation("Overtime Exposure Rate", value, status, "%", industry),
    operationalRisk:   buildOperationalRisk("Overtime Exposure Rate", status, risks),
    recommendedAction: buildCorrectiveAction(status, actions),
    confidence: 72,
  };
}

export function benchmarkRejectedJobs(
  value:    number | undefined,
  industry?: string,
): BenchmarkResult | null {
  if (value == null) return null;

  const thresholds: [number, number, number] = [5, 10, 20];
  const status = classifyBenchmarkStatus(value, thresholds);

  const em = industry === "event_management";

  const risks: Record<string, string> = {
    WATCHLIST: em
      ? "Event rejection rates above 5% indicate capacity constraints or qualification gaps that are limiting revenue and client relationship development."
      : "Rejection rates above 5% indicate capacity or capability constraints beginning to limit revenue growth.",
    ELEVATED: em
      ? "Material event rejection rates signal a structural mismatch between incoming demand and available event delivery capacity — revenue is being left on the table."
      : "Elevated rejection rates represent material lost revenue and indicate the operational model cannot absorb available demand.",
    CRITICAL: em
      ? "Critical event rejection rates indicate the business cannot serve a substantial portion of its market demand. Structural capacity expansion or process redesign is urgently required."
      : "Critical rejection rates indicate systemic capacity failure — the business is unable to serve a significant portion of demand, resulting in major revenue and reputational loss.",
  };

  const actions: Record<string, string> = {
    WATCHLIST: "Analyse the top rejection reasons. Determine whether they are capacity-driven (need more resource) or process-driven (need better qualification).",
    ELEVATED:  "Implement a demand-capacity planning process. Review whether rejections can be converted through subcontractor arrangements or process improvements.",
    CRITICAL:  "Conduct an emergency capacity review. Engage strategic partners to cover overflow demand while structural capacity is expanded or processes are redesigned.",
  };

  return {
    id:            hashMetric("rejected_jobs_rate"),
    metric:        "Rejected Jobs Rate",
    category:      FINDING_CATEGORIES.LOGISTICS_COORDINATION,
    actualValue:   value,
    benchmarkRange:{ low: thresholds[0], medium: thresholds[1], high: thresholds[2] },
    status,
    interpretation: buildBenchmarkInterpretation("Rejected Jobs Rate", value, status, "%", industry),
    operationalRisk:   buildOperationalRisk("Rejected Jobs Rate", status, risks),
    recommendedAction: buildCorrectiveAction(status, actions),
    confidence: 83,
  };
}

// ── Detector registry ─────────────────────────────────────────────────────────
// To add a benchmark pack (e.g. manufacturing, healthcare), create a new
// detector function and register it here.  The main pipeline merges all results
// before sorting and deduplication.

type DetectorFn = (value: number | undefined, industry?: string) => BenchmarkResult | null;

interface DetectorEntry {
  key:     keyof BenchmarkContext;
  fn:      DetectorFn;
  label:   string;
}

const DETECTORS: DetectorEntry[] = [
  { key: "inventoryLossRate",        fn: benchmarkInventoryLoss,        label: "Inventory Loss Rate" },
  { key: "refundRate",               fn: benchmarkRefundLeakage,        label: "Refund Leakage Rate" },
  { key: "logisticsUtilization",     fn: benchmarkLogisticsCapacity,    label: "Logistics Capacity Utilisation" },
  { key: "rejectedJobsRate",         fn: benchmarkRejectedJobs,         label: "Rejected Jobs Rate" },
  { key: "operationalHealthScore",   fn: benchmarkOperationalHealth,    label: "Operational Health Score" },
  { key: "reconciliationDelayRate",  fn: benchmarkReconciliationDelays, label: "Reconciliation Delay Rate" },
  { key: "manualWorkflowDependency", fn: benchmarkManualDependency,     label: "Manual Workflow Dependency" },
  { key: "inventoryDiscrepancyRate", fn: benchmarkInventoryDiscrepancy, label: "Inventory Discrepancy Rate" },
  { key: "manpowerDependencyRate",   fn: benchmarkManpowerDependency,   label: "Manpower Dependency Rate" },
  { key: "overtimeExposureRate",     fn: benchmarkOvertimeExposure,     label: "Overtime Exposure Rate" },
];

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate all applicable benchmark results from the provided operational
 * metrics.  Metrics that are undefined/null are silently suppressed.
 *
 * Output is sorted: CRITICAL → ELEVATED → WATCHLIST → HEALTHY.
 * Never throws.
 */
export function generateBenchmarkResults(params: {
  metrics:   BenchmarkContext;
  industry?: string;
} | null | undefined): BenchmarkResult[] {
  try {
    if (params == null) {
      console.log("[MGD][BENCHMARK] generateBenchmarkResults — called with null/undefined params, returning []");
      return [];
    }
    const { metrics = {}, industry } = params;

    console.log(
      `[MGD][BENCHMARK] generateBenchmarkResults — ` +
      `metrics=${Object.keys(metrics).length} provided, ` +
      `industry=${industry ?? "unspecified"}`,
    );

    const results: BenchmarkResult[] = [];

    for (const entry of DETECTORS) {
      const raw = metrics[entry.key];
      const isDefined = raw != null && typeof raw === "number" && isFinite(raw);

      if (!isDefined) {
        console.log(`[MGD][BENCHMARK]   SUPPRESSED — ${entry.label} not provided`);
        continue;
      }

      try {
        const result = entry.fn(raw, industry);
        if (result == null) {
          console.log(`[MGD][BENCHMARK]   SUPPRESSED — ${entry.label} returned null`);
          continue;
        }

        console.log(
          `[MGD][BENCHMARK]   EVALUATED — ${entry.label}: ` +
          `value=${raw.toFixed(2)}, status=${result.status}, confidence=${result.confidence}`,
        );

        results.push(result);
      } catch (err) {
        console.error(`[MGD][BENCHMARK]   ERROR in detector for ${entry.label}:`, err);
        // Silently skip; other detectors continue
      }
    }

    // Sort: CRITICAL → ELEVATED → WATCHLIST → HEALTHY, then confidence DESC
    results.sort((a, b) => {
      const sd = (STATUS_ORDER[b.status] ?? 0) - (STATUS_ORDER[a.status] ?? 0);
      if (sd !== 0) return sd;
      return b.confidence - a.confidence;
    });

    console.log(
      `[MGD][BENCHMARK] Complete — ` +
      `${results.length} benchmark${results.length !== 1 ? "s" : ""} generated ` +
      `(CRITICAL=${results.filter(r => r.status === "CRITICAL").length}, ` +
      `ELEVATED=${results.filter(r => r.status === "ELEVATED").length}, ` +
      `WATCHLIST=${results.filter(r => r.status === "WATCHLIST").length}, ` +
      `HEALTHY=${results.filter(r => r.status === "HEALTHY").length})`,
    );

    for (const r of results) {
      console.log(`[MGD][BENCHMARK]   [${r.status.padEnd(9)}] ${r.metric} = ${r.actualValue.toFixed(2)} (conf=${r.confidence}%)`);
    }

    return results;
  } catch (err) {
    console.error("[MGD][BENCHMARK] generateBenchmarkResults top-level error:", err);
    return [];
  }
}
