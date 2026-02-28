/**
 * ============================================================================
 * RCI ROOT CAUSE LIBRARY - INSTITUTIONAL KNOWLEDGE BASE
 * ============================================================================
 *
 * This is the AUTHORITATIVE source of root causes for RCI diagnostics.
 *
 * RCI language must sound institutional, not advisory.
 *
 * LANGUAGE RULES:
 * 1. Root Cause text: Max 1 sentence, no hedging words ("may", "could", "often")
 * 2. Why It Matters: Direct business impact only, no instructional tone
 * 3. Intervention Direction: Directional, not prescriptive - no timelines, no advice verbs
 * 4. Prohibited phrases: "Ask your staff", "Consider", "Best practice", "AI suggests"
 *
 * GOVERNANCE RULES:
 *
 * 1. AI MUST select root causes from this library ONLY
 *    - No invented root causes allowed
 *    - Each diagnosis must reference a library ID
 *
 * 2. STRUCTURE:
 *    - Each root cause has a unique ID (e.g., "rc-m001")
 *    - Symptoms define what patterns to match
 *    - archetypeIds link to approved recommendations
 *
 * 3. ADDING NEW ROOT CAUSES:
 *    - Requires consultant review and approval
 *    - Must include symptoms, applicableIndustries, and linked archetypes
 *    - Must follow the 4M framework categorisation
 *
 * 4. AI ROLE:
 *    - Match client symptoms to library entries
 *    - Rank relevance based on symptom overlap
 *    - Link to archetypes via archetypeIds
 *    - DO NOT invent new causes
 *
 * 5. INDUSTRY-LOCKING RULES:
 *    - Root causes must be industry-relevant to avoid generic diagnostics
 *    - During diagnostic execution, only root causes where:
 *      applicableIndustries includes client.industry are selected
 *    - If no exact industry match exists, allow "cross-industry" root causes
 *      ONLY if explicitly marked with crossIndustry: true
 *    - Selection is rule-based - NO AI guessing allowed
 *
 * ============================================================================
 */

export type FourMCategory = "Money" | "Manpower" | "Materials" | "Machinery";
export type InterventionType =
  | "self-fixable"
  | "advisory"
  | "consultant-required";

// RCI Brain v2: Case outcome tracking for pattern card references
export type CaseOutcome = "worked" | "partial" | "failed";
export interface CaseReference {
  caseId: string;
  outcome: CaseOutcome;
}

// RCI Brain v2: Standardised symptom taxonomy for symptom → root cause mapping
// Used by getLikelyRootCauses() to score and rank root causes from observed symptoms
export const SYMPTOM_TAGS = [
  "MISSED_DEADLINES",
  "COST_OVERRUNS",
  "HIGH_REWORK",
  "LOW_ACCOUNTABILITY",
  "FREQUENT_ESCALATIONS",
  "QUALITY_ESCAPES",
  "FIRE_FIGHTING_CULTURE",
  "LOW_SYSTEM_ADOPTION",
  "CASH_FLOW_PRESSURE",
  "HIGH_TURNOVER",
  "KNOWLEDGE_LOSS",
  "SUPPLY_DISRUPTION",
  "CAPACITY_BOTTLENECK",
  "CUSTOMER_COMPLAINTS",
  "MARGIN_EROSION",
] as const;
export type SymptomTag = (typeof SYMPTOM_TAGS)[number];

/**
 * Primary Context - The main focus area for a root cause.
 * Used for context weighting during selection.
 * Context weighting ensures diagnostics reflect the user's stated focus.
 */
export type PrimaryContext =
  | "Money" // Financial issues, cash flow, costs, pricing
  | "People" // Staff, training, communication, turnover
  | "Process" // Operations, workflows, procedures, standards
  | "Systems" // Equipment, technology, machinery, infrastructure
  | "Supply"; // Materials, inventory, suppliers, logistics

/**
 * Root Cause Entry Definition
 *
 * INDUSTRY RELEVANCE RULE:
 * Root causes must be industry-relevant to avoid generic diagnostics.
 * During diagnostic execution, only root causes where applicableIndustries
 * includes client.industry will be selected.
 *
 * Cross-industry root causes (crossIndustry: true) are ONLY selected when:
 * - No exact industry match exists, OR
 * - The root cause is explicitly marked as universally applicable
 */
export interface RootCauseEntry {
  id: string;
  title: string;
  category: FourMCategory;
  /**
   * List of industries this root cause applies to.
   * Root causes must be industry-relevant to avoid generic diagnostics.
   * Selection is rule-based: client.industry must match an entry in this list.
   */
  applicableIndustries: string[];
  /**
   * If true, this root cause can be selected for ANY industry when:
   * - No exact industry match exists in applicableIndustries, OR
   * - It is explicitly marked as universally applicable
   */
  crossIndustry?: boolean;
  /**
   * Primary context focus for this root cause.
   * Context weighting ensures diagnostics reflect the user's stated focus.
   * During selection, relevance score increases when selected context matches,
   * and decreases when it does not.
   */
  primaryContext: PrimaryContext;
  symptoms: string[];
  interventionType: InterventionType;
  baseConfidence: number;
  archetypeIds: string[];
  whyItMatters: string;
  interventionDirection: string;

  // RCI Brain v2 — Pattern Card extensions (optional for backward compatibility)
  // Used in future diagnostic workflow for validation and prevention guidance
  signalTriggers?: string[];
  validationChecklist?: string[];
  antiPatterns?: string[];
  highLeverageFix?: string;
  preventionStrategy?: string;
  caseReferences?: CaseReference[];

  // RCI Brain v2 — Symptom taxonomy tags for symptom → root cause mapping
  // Used by getLikelyRootCauses() to score matches from observed symptoms
  symptomTags?: SymptomTag[];
}

export const rootCauseLibrary: RootCauseEntry[] = [
  // ============================================
  // MONEY - Financial Root Causes
  // ============================================

  // Generic root causes are split into specific failure mechanisms to improve diagnostic precision.
  // Cash Flow Issues (split from rc-m001)
  {
    id: "rc-m001a",
    title: "Cash flow strain caused by delayed progress billing approvals",
    category: "Money",
    applicableIndustries: [
      "Construction",
      "Property Development",
      "Oil & Gas",
      "Manufacturing",
    ],
    primaryContext: "Money",
    symptoms: [
      "billing delays",
      "progress claims",
      "invoice approval",
      "certification delays",
      "payment holdups",
    ],
    interventionType: "advisory",
    baseConfidence: 90,
    archetypeIds: [
      "ra-im-cashflow-001",
      "ra-st-cashflow-001",
      "ra-pr-cashflow-001",
    ],
    whyItMatters:
      "Delayed billing approvals extend the cash conversion cycle and strain working capital.",
    interventionDirection:
      "Billing submission discipline and approval tracking protocols.",
    // RCI Brain v2 pattern card fields
    validationChecklist: [
      "Average days from work completion to billing submission",
      "Percentage of progress claims submitted on time",
      "Number of billing rejections per month",
    ],
    antiPatterns: [
      "Batching all progress claims at month-end instead of upon completion",
      "Relying on informal verbal approvals before submitting invoices",
    ],
    highLeverageFix: "Implement weekly billing submission deadlines tied to project milestones.",
    preventionStrategy: "Automated billing triggers linked to project milestone completion records.",
    caseReferences: [],
    symptomTags: ["COST_OVERRUNS", "MISSED_DEADLINES", "CASH_FLOW_PRESSURE"],
  },
  {
    id: "rc-m001b",
    title: "Cash flow strain caused by weak credit control enforcement",
    category: "Money",
    applicableIndustries: [
      "Manufacturing",
      "Retail",
      "Logistics",
      "F&B",
      "Hospitality",
    ],
    primaryContext: "Money",
    symptoms: [
      "overdue accounts",
      "bad debt",
      "collection issues",
      "credit terms",
      "receivables aging",
    ],
    interventionType: "advisory",
    baseConfidence: 85,
    archetypeIds: [
      "ra-im-cashflow-001",
      "ra-st-credit-001",
      "ra-pr-cashflow-001",
    ],
    whyItMatters:
      "Weak credit enforcement allows receivables to age beyond recovery thresholds.",
    interventionDirection:
      "Credit control procedures with escalation timelines.",
    // RCI Brain v2 pattern card fields
    validationChecklist: [
      "Receivables aging report reviewed weekly",
      "Credit terms formally documented per customer",
      "Escalation actions taken within defined thresholds",
    ],
    antiPatterns: [
      "Extending credit limits without reassessing customer payment history",
      "Allowing sales team to override credit holds without approval",
    ],
    highLeverageFix: "Enforce automated credit hold triggers at defined aging thresholds.",
    preventionStrategy: "Monthly credit review meetings with aging reports and escalation tracking.",
    caseReferences: [],
    symptomTags: ["CASH_FLOW_PRESSURE", "MARGIN_EROSION", "LOW_ACCOUNTABILITY"],
  },
  {
    id: "rc-m001c",
    title:
      "Cash flow strain caused by mismatch between payment terms and cost cycles",
    category: "Money",
    applicableIndustries: [
      "Manufacturing",
      "Construction",
      "Retail",
      "Logistics",
      "Hospitality",
    ],
    primaryContext: "Money",
    symptoms: [
      "cash shortage",
      "payment timing",
      "supplier terms",
      "customer terms",
      "working capital gap",
    ],
    interventionType: "consultant-required",
    baseConfidence: 83,
    archetypeIds: [
      "ra-im-cashflow-001",
      "ra-st-cashflow-001",
      "ra-pr-cashflow-001",
    ],
    whyItMatters:
      "Misaligned payment terms create structural cash gaps regardless of profitability.",
    interventionDirection:
      "Payment term restructuring to align inflows with outflows.",
  },

  // Generic root causes are split into specific failure mechanisms to improve diagnostic precision.
  // Cost Overruns (split from rc-m002)
  {
    id: "rc-m002a",
    title: "Cost overruns due to lack of project-level budgets",
    category: "Money",
    applicableIndustries: [
      "Construction",
      "Property Development",
      "Oil & Gas",
      "Manufacturing",
    ],
    primaryContext: "Money",
    symptoms: [
      "no budget",
      "budget missing",
      "project costs",
      "cost tracking",
      "unbudgeted expenses",
    ],
    interventionType: "advisory",
    baseConfidence: 88,
    archetypeIds: ["ra-im-cost-001", "ra-st-cost-001", "ra-pr-budget-001"],
    whyItMatters:
      "Absence of project-level budgets prevents early detection of cost deviations.",
    interventionDirection:
      "Project-level budget templates and variance reporting.",
  },
  {
    id: "rc-m002b",
    title: "Cost overruns due to uncontrolled subcontractor variations",
    category: "Money",
    applicableIndustries: ["Construction", "Property Development", "Oil & Gas"],
    primaryContext: "Money",
    symptoms: [
      "variation orders",
      "subcontractor claims",
      "scope creep",
      "change orders",
      "contractor disputes",
    ],
    interventionType: "consultant-required",
    baseConfidence: 82,
    archetypeIds: ["ra-im-cost-001", "ra-st-cost-001", "ra-pr-cost-001"],
    whyItMatters:
      "Uncontrolled variations erode margins and create adversarial contractor relationships.",
    interventionDirection:
      "Variation approval workflows with cost impact assessment.",
  },
  {
    id: "rc-m002c",
    title: "Cost overruns due to reactive procurement decisions",
    category: "Money",
    applicableIndustries: [
      "Manufacturing",
      "Construction",
      "Hospitality",
      "F&B",
      "Retail",
    ],
    primaryContext: "Money",
    symptoms: [
      "rush orders",
      "emergency purchases",
      "premium pricing",
      "procurement delays",
      "stockouts",
    ],
    interventionType: "advisory",
    baseConfidence: 80,
    archetypeIds: ["ra-im-cost-001", "ra-st-cost-001", "ra-pr-cost-001"],
    whyItMatters:
      "Reactive procurement incurs premium costs and disrupts operational continuity.",
    interventionDirection:
      "Procurement planning aligned to production schedules.",
  },
  {
    id: "rc-m003",
    title: "Poor budget planning and forecasting",
    category: "Money",
    applicableIndustries: [
      "Manufacturing",
      "Retail",
      "Healthcare",
      "Education",
      "F&B",
    ],
    crossIndustry: true,
    primaryContext: "Money",
    symptoms: [
      "budget",
      "forecast",
      "planning",
      "projection",
      "financial planning",
    ],
    interventionType: "advisory",
    baseConfidence: 82,
    archetypeIds: ["ra-im-budget-001", "ra-st-budget-001", "ra-pr-budget-001"],
    whyItMatters:
      "Inaccurate budgets lead to resource misallocation and reactive decision-making.",
    interventionDirection:
      "Structured planning cycles for improved forecasting accuracy.",
  },
  {
    id: "rc-m004",
    title: "Weak credit control and debt recovery",
    category: "Money",
    applicableIndustries: [
      "Retail",
      "Manufacturing",
      "Construction",
      "Logistics",
    ],
    primaryContext: "Money",
    symptoms: [
      "bad debt",
      "credit",
      "collection",
      "overdue",
      "accounts receivable",
    ],
    interventionType: "advisory",
    baseConfidence: 80,
    archetypeIds: ["ra-im-credit-001", "ra-st-credit-001", "ra-pr-credit-001"],
    whyItMatters:
      "Weak credit controls expose the organisation to bad debt write-offs.",
    interventionDirection:
      "Stricter credit approval and collection procedures.",
  },
  {
    id: "rc-m005",
    title: "Under-pricing of products or services",
    category: "Money",
    applicableIndustries: [
      "Manufacturing",
      "Retail",
      "F&B",
      "Hospitality",
      "Professional Services",
    ],
    primaryContext: "Money",
    symptoms: [
      "low margin",
      "pricing",
      "profit",
      "competitive pressure",
      "loss",
    ],
    interventionType: "consultant-required",
    baseConfidence: 78,
    archetypeIds: [
      "ra-im-pricing-001",
      "ra-st-pricing-001",
      "ra-pr-pricing-001",
    ],
    whyItMatters:
      "Under-pricing compromises profitability regardless of sales volume.",
    interventionDirection:
      "Pricing structures aligned to actual cost-to-serve.",
  },
  {
    id: "rc-m006",
    title: "Excessive borrowing and high interest costs",
    category: "Money",
    applicableIndustries: [
      "Manufacturing",
      "Property Development",
      "Retail",
      "Construction",
    ],
    primaryContext: "Money",
    symptoms: ["debt", "loan", "interest", "borrowing", "financing"],
    interventionType: "consultant-required",
    baseConfidence: 75,
    archetypeIds: ["ra-im-debt-001", "ra-st-debt-001", "ra-pr-debt-001"],
    whyItMatters:
      "High debt servicing consumes cash flow otherwise available for operations or growth.",
    interventionDirection:
      "Debt structure optimisation through refinancing or reduction.",
  },
  {
    id: "rc-m007",
    title: "Loose control of cash and liquid assets",
    category: "Money",
    applicableIndustries: ["Retail", "F&B", "Hospitality", "Manufacturing"],
    primaryContext: "Money",
    symptoms: [
      "cash handling",
      "petty cash",
      "theft",
      "shrinkage",
      "missing funds",
    ],
    interventionType: "advisory",
    baseConfidence: 72,
    archetypeIds: ["ra-im-cash-001", "ra-st-cash-001", "ra-pr-cash-001"],
    whyItMatters: "Poor cash controls increase exposure to leakage and fraud.",
    interventionDirection:
      "Tighter cash handling procedures and reconciliation frequency.",
  },
  {
    id: "rc-m008",
    title: "Growth outpacing available capital",
    category: "Money",
    applicableIndustries: [
      "Manufacturing",
      "Retail",
      "Technology",
      "Logistics",
    ],
    primaryContext: "Money",
    symptoms: [
      "growth",
      "expansion",
      "capital",
      "working capital",
      "liquidity",
    ],
    interventionType: "consultant-required",
    baseConfidence: 76,
    archetypeIds: ["ra-im-growth-001", "ra-st-growth-001", "ra-pr-growth-001"],
    whyItMatters:
      "Rapid growth without adequate capital creates liquidity strain.",
    interventionDirection:
      "Expansion pace aligned to capital availability and funding sources.",
  },

  // ============================================
  // MANPOWER - People Root Causes
  // ============================================
  {
    id: "rc-mp001",
    title: "Insufficient training on updated procedures",
    category: "Manpower",
    applicableIndustries: [
      "Manufacturing",
      "Healthcare",
      "Hospitality",
      "Retail",
      "F&B",
      "Logistics",
    ],
    crossIndustry: true,
    primaryContext: "People",
    symptoms: [
      "training",
      "skills gap",
      "knowledge",
      "procedures",
      "competency",
    ],
    interventionType: "advisory",
    baseConfidence: 72,
    archetypeIds: [
      "ra-im-training-001",
      "ra-st-training-001",
      "ra-pr-training-001",
    ],
    whyItMatters:
      "Untrained staff execute tasks inconsistently, increasing errors and rework.",
    interventionDirection:
      "Training programmes aligned to current procedures with regular updates.",
    // RCI Brain v2 pattern card fields
    validationChecklist: [
      "Training records exist for all current procedures",
      "Staff can demonstrate competency on updated processes",
      "Training completion rate tracked per department",
    ],
    antiPatterns: [
      "One-time training with no refresher schedule",
      "Relying on peer-to-peer informal knowledge transfer",
    ],
    highLeverageFix: "Establish mandatory procedure-change training sign-off before go-live.",
    preventionStrategy: "Quarterly training audits linked to procedure revision dates.",
    caseReferences: [],
    symptomTags: ["HIGH_REWORK", "QUALITY_ESCAPES", "CUSTOMER_COMPLAINTS"],
  },
  {
    id: "rc-mp002",
    title: "High turnover in supervisory roles",
    category: "Manpower",
    applicableIndustries: [
      "Hospitality",
      "Retail",
      "F&B",
      "Manufacturing",
      "Healthcare",
    ],
    primaryContext: "People",
    symptoms: [
      "turnover",
      "retention",
      "supervisor",
      "manager leaving",
      "resignation",
    ],
    interventionType: "consultant-required",
    baseConfidence: 68,
    archetypeIds: [
      "ra-im-turnover-001",
      "ra-st-turnover-001",
      "ra-pr-turnover-001",
    ],
    whyItMatters:
      "Supervisor turnover disrupts team continuity and operational knowledge.",
    interventionDirection:
      "Retention factors and succession planning for key roles.",
    // RCI Brain v2 pattern card fields
    validationChecklist: [
      "Supervisor tenure tracked and trended over 12 months",
      "Exit interview data analysed for systemic causes",
      "Succession plans documented for all supervisory roles",
    ],
    antiPatterns: [
      "Promoting top performers without leadership readiness assessment",
      "Treating turnover as an HR problem rather than an operational risk",
    ],
    highLeverageFix: "Introduce structured onboarding and mentoring for newly promoted supervisors.",
    preventionStrategy: "Regular supervisor engagement reviews with action-tracked outcomes.",
    caseReferences: [],
    symptomTags: ["HIGH_TURNOVER", "KNOWLEDGE_LOSS", "LOW_ACCOUNTABILITY", "FIRE_FIGHTING_CULTURE"],
  },
  {
    id: "rc-mp003",
    title: "No defined ownership for cross-department issues",
    category: "Manpower",
    applicableIndustries: [
      "Manufacturing",
      "Property Development",
      "Oil & Gas",
      "Healthcare",
      "Logistics",
    ],
    primaryContext: "Process",
    symptoms: [
      "accountability",
      "ownership",
      "responsibility",
      "blame",
      "unclear roles",
    ],
    interventionType: "consultant-required",
    baseConfidence: 76,
    archetypeIds: [
      "ra-im-ownership-001",
      "ra-st-ownership-001",
      "ra-pr-ownership-001",
    ],
    whyItMatters:
      "Unclear ownership leads to unresolved issues and delayed decisions.",
    interventionDirection:
      "Accountability boundaries for recurring cross-functional matters.",
  },
  {
    id: "rc-mp004",
    title: "Loss of institutional knowledge due to staff departures",
    category: "Manpower",
    applicableIndustries: [
      "Manufacturing",
      "Healthcare",
      "Professional Services",
      "Oil & Gas",
    ],
    primaryContext: "People",
    symptoms: [
      "knowledge loss",
      "documentation",
      "handover",
      "expertise",
      "experience",
    ],
    interventionType: "consultant-required",
    baseConfidence: 74,
    archetypeIds: [
      "ra-im-knowledge-001",
      "ra-st-knowledge-001",
      "ra-pr-knowledge-001",
    ],
    whyItMatters: "Departing staff take critical process knowledge with them.",
    interventionDirection:
      "Knowledge capture mechanisms and structured handover protocols.",
  },
  {
    id: "rc-mp005",
    title: "Inconsistent performance standards across teams",
    category: "Manpower",
    applicableIndustries: [
      "Hospitality",
      "Retail",
      "F&B",
      "Manufacturing",
      "Healthcare",
    ],
    primaryContext: "Process",
    symptoms: [
      "inconsistent",
      "standards",
      "quality variation",
      "performance gap",
      "teams",
    ],
    interventionType: "advisory",
    baseConfidence: 70,
    archetypeIds: [
      "ra-im-standards-001",
      "ra-st-standards-001",
      "ra-pr-standards-001",
    ],
    whyItMatters: "Inconsistent standards create unpredictable output quality.",
    interventionDirection:
      "Uniform performance expectations across all teams through clear benchmarks.",
  },
  {
    id: "rc-mp006",
    title: "Poor communication between departments",
    category: "Manpower",
    applicableIndustries: [
      "Manufacturing",
      "Healthcare",
      "Logistics",
      "Property Development",
      "Oil & Gas",
    ],
    crossIndustry: true,
    primaryContext: "People",
    symptoms: [
      "communication",
      "silos",
      "coordination",
      "departments",
      "collaboration",
    ],
    interventionType: "advisory",
    baseConfidence: 68,
    archetypeIds: ["ra-im-comms-001", "ra-st-comms-001", "ra-pr-comms-001"],
    whyItMatters:
      "Poor inter-department communication causes delays and misalignment.",
    interventionDirection:
      "Structured coordination points between key departments.",
  },
  {
    id: "rc-mp007",
    title: "Understaffing during peak periods",
    category: "Manpower",
    applicableIndustries: [
      "Hospitality",
      "Retail",
      "F&B",
      "Healthcare",
      "Logistics",
    ],
    primaryContext: "People",
    symptoms: ["understaffed", "peak", "capacity", "overworked", "scheduling"],
    interventionType: "self-fixable",
    baseConfidence: 65,
    archetypeIds: [
      "ra-im-staffing-001",
      "ra-st-staffing-001",
      "ra-pr-staffing-001",
    ],
    whyItMatters:
      "Understaffing during peak periods degrades service quality and increases errors.",
    interventionDirection: "Staffing patterns aligned to demand cycles.",
  },
  {
    id: "rc-mp008",
    title: "Weak supervisory oversight and monitoring",
    category: "Manpower",
    applicableIndustries: [
      "Manufacturing",
      "Construction",
      "Retail",
      "F&B",
      "Hospitality",
    ],
    primaryContext: "People",
    symptoms: [
      "supervision",
      "monitoring",
      "oversight",
      "management",
      "control",
    ],
    interventionType: "advisory",
    baseConfidence: 72,
    archetypeIds: [
      "ra-im-supervision-001",
      "ra-st-supervision-001",
      "ra-pr-supervision-001",
    ],
    whyItMatters:
      "Insufficient supervision allows deviations from standards to persist.",
    interventionDirection:
      "Increased supervisory presence and monitoring routines.",
  },

  // ============================================
  // MATERIAL - Supply Chain & Inventory Root Causes
  // ============================================
  {
    id: "rc-mt001",
    title: "Poor inventory visibility and tracking",
    category: "Materials",
    applicableIndustries: [
      "Manufacturing",
      "Retail",
      "F&B",
      "Logistics",
      "Healthcare",
    ],
    primaryContext: "Supply",
    symptoms: ["inventory", "stock", "tracking", "visibility", "stockout"],
    interventionType: "advisory",
    baseConfidence: 78,
    archetypeIds: [
      "ra-im-inventory-001",
      "ra-st-inventory-001",
      "ra-pr-inventory-001",
    ],
    whyItMatters:
      "Inaccurate inventory data leads to unreliable ordering and allocation decisions.",
    interventionDirection:
      "Stock tracking accuracy through systematic counting and recording.",
    // RCI Brain v2 pattern card fields
    validationChecklist: [
      "Physical stock count matches system records within 2% tolerance",
      "Stock movements recorded in real time at point of transaction",
      "Cycle counting schedule maintained and adhered to",
    ],
    antiPatterns: [
      "Annual stock take as the sole inventory verification method",
      "Manual spreadsheet tracking alongside a system of record",
    ],
    highLeverageFix: "Implement daily cycle counting for high-value and fast-moving items.",
    preventionStrategy: "Real-time stock movement recording at every transaction point.",
    caseReferences: [],
    symptomTags: ["SUPPLY_DISRUPTION", "COST_OVERRUNS", "LOW_SYSTEM_ADOPTION"],
  },
  {
    id: "rc-mt002",
    title: "Unreliable supplier delivery performance",
    category: "Materials",
    applicableIndustries: [
      "Manufacturing",
      "Construction",
      "F&B",
      "Retail",
      "Hospitality",
    ],
    primaryContext: "Supply",
    symptoms: [
      "supplier",
      "delivery",
      "late shipment",
      "vendor",
      "supply chain",
    ],
    interventionType: "advisory",
    baseConfidence: 74,
    archetypeIds: [
      "ra-im-supplier-001",
      "ra-st-supplier-001",
      "ra-pr-supplier-001",
    ],
    whyItMatters:
      "Unreliable suppliers disrupt production schedules and customer commitments.",
    interventionDirection:
      "Supplier performance metrics with escalation mechanisms.",
    // RCI Brain v2 pattern card fields
    validationChecklist: [
      "On-time delivery rate tracked per supplier per month",
      "Supplier performance review conducted quarterly",
      "Alternative suppliers identified for critical materials",
    ],
    antiPatterns: [
      "Sole-sourcing critical materials without backup suppliers",
      "Accepting repeated late deliveries without formal escalation",
    ],
    highLeverageFix: "Introduce supplier scorecards with automatic escalation at threshold breaches.",
    preventionStrategy: "Dual-sourcing strategy for all critical material categories.",
    caseReferences: [],
    symptomTags: ["SUPPLY_DISRUPTION", "MISSED_DEADLINES", "CUSTOMER_COMPLAINTS", "FREQUENT_ESCALATIONS"],
  },
  {
    id: "rc-mt003",
    title: "Excess inventory tying up working capital",
    category: "Materials",
    applicableIndustries: ["Manufacturing", "Retail", "F&B", "Hospitality"],
    primaryContext: "Supply",
    symptoms: [
      "excess stock",
      "overstock",
      "inventory cost",
      "storage",
      "dead stock",
    ],
    interventionType: "self-fixable",
    baseConfidence: 70,
    archetypeIds: [
      "ra-im-overstock-001",
      "ra-st-overstock-001",
      "ra-pr-overstock-001",
    ],
    whyItMatters:
      "Excess inventory immobilises capital and increases holding costs.",
    interventionDirection:
      "Ordering parameters aligned to actual demand levels.",
  },
  {
    id: "rc-mt004",
    title: "Material waste and spoilage",
    category: "Materials",
    applicableIndustries: ["Manufacturing", "F&B", "Hospitality", "Healthcare"],
    primaryContext: "Process",
    symptoms: ["waste", "spoilage", "expiry", "scrap", "loss"],
    interventionType: "advisory",
    baseConfidence: 72,
    archetypeIds: ["ra-im-waste-001", "ra-st-waste-001", "ra-pr-waste-001"],
    whyItMatters: "Waste directly reduces margin and increases material costs.",
    interventionDirection:
      "Primary waste source identification and reduction measures.",
  },
  {
    id: "rc-mt005",
    title: "Quality issues with incoming materials",
    category: "Materials",
    applicableIndustries: [
      "Manufacturing",
      "Construction",
      "F&B",
      "Healthcare",
    ],
    primaryContext: "Supply",
    symptoms: ["quality", "defect", "incoming", "specification", "rejection"],
    interventionType: "advisory",
    baseConfidence: 76,
    archetypeIds: [
      "ra-im-quality-001",
      "ra-st-quality-001",
      "ra-pr-quality-001",
    ],
    whyItMatters: "Poor input quality propagates defects downstream.",
    interventionDirection:
      "Incoming inspection protocols and supplier quality agreements.",
  },
  {
    id: "rc-mt006",
    title: "Single supplier dependency risk",
    category: "Materials",
    applicableIndustries: [
      "Manufacturing",
      "Construction",
      "Oil & Gas",
      "Healthcare",
    ],
    primaryContext: "Supply",
    symptoms: ["single source", "supplier risk", "dependency", "sole supplier"],
    interventionType: "consultant-required",
    baseConfidence: 74,
    archetypeIds: [
      "ra-im-singlesource-001",
      "ra-st-singlesource-001",
      "ra-pr-singlesource-001",
    ],
    whyItMatters:
      "Single-source dependency exposes operations to supply disruption.",
    interventionDirection:
      "Alternative sourcing options for critical materials.",
  },
  {
    id: "rc-mt007",
    title: "Inaccurate demand forecasting",
    category: "Materials",
    applicableIndustries: ["Manufacturing", "Retail", "F&B", "Logistics"],
    primaryContext: "Process",
    symptoms: ["forecast", "demand", "prediction", "planning", "seasonality"],
    interventionType: "advisory",
    baseConfidence: 68,
    archetypeIds: [
      "ra-im-forecast-001",
      "ra-st-forecast-001",
      "ra-pr-forecast-001",
    ],
    whyItMatters: "Forecast errors lead to stockouts or excess inventory.",
    interventionDirection:
      "Demand planning methods using historical data and market signals.",
  },
  {
    id: "rc-mt008",
    title: "Inadequate storage and handling procedures",
    category: "Materials",
    applicableIndustries: [
      "Manufacturing",
      "F&B",
      "Healthcare",
      "Logistics",
      "Hospitality",
    ],
    primaryContext: "Process",
    symptoms: ["storage", "handling", "damage", "conditions", "preservation"],
    interventionType: "self-fixable",
    baseConfidence: 66,
    archetypeIds: [
      "ra-im-storage-001",
      "ra-st-storage-001",
      "ra-pr-storage-001",
    ],
    whyItMatters:
      "Poor storage conditions accelerate deterioration and damage.",
    interventionDirection:
      "Storage practices and handling procedures for compliance.",
  },

  // ============================================
  // MACHINERY - Equipment & Systems Root Causes
  // ============================================

  // Generic root causes are split into specific failure mechanisms to improve diagnostic precision.
  // Equipment Breakdowns (split from rc-mc001)
  {
    id: "rc-mc001a",
    title: "Equipment breakdowns caused by deferred preventive maintenance",
    category: "Machinery",
    applicableIndustries: [
      "Manufacturing",
      "Construction",
      "Healthcare",
      "F&B",
      "Hospitality",
      "Logistics",
    ],
    primaryContext: "Systems",
    symptoms: [
      "skipped maintenance",
      "maintenance backlog",
      "deferred servicing",
      "overdue PM",
      "neglected equipment",
    ],
    interventionType: "advisory",
    baseConfidence: 85,
    archetypeIds: [
      "ra-im-breakdown-001",
      "ra-st-maintenance-001",
      "ra-pr-breakdown-001",
    ],
    whyItMatters:
      "Deferred maintenance accelerates equipment wear and increases failure probability.",
    interventionDirection:
      "Preventive maintenance scheduling with compliance tracking.",
    // RCI Brain v2 pattern card fields
    validationChecklist: [
      "Preventive maintenance schedule exists and is current",
      "PM completion rate exceeds 90% per month",
      "Unplanned breakdown frequency tracked and trending down",
    ],
    antiPatterns: [
      "Deferring maintenance to meet production deadlines",
      "Treating preventive maintenance as optional when equipment appears functional",
    ],
    highLeverageFix: "Lock PM schedules into production planning as non-negotiable time blocks.",
    preventionStrategy: "Condition-based monitoring to supplement calendar-based PM schedules.",
    caseReferences: [],
    symptomTags: ["QUALITY_ESCAPES", "FIRE_FIGHTING_CULTURE", "CAPACITY_BOTTLENECK", "MISSED_DEADLINES"],
  },
  {
    id: "rc-mc001b",
    title: "Equipment breakdowns caused by obsolete or end-of-life assets",
    category: "Machinery",
    applicableIndustries: [
      "Manufacturing",
      "Healthcare",
      "Construction",
      "Oil & Gas",
    ],
    primaryContext: "Systems",
    symptoms: [
      "old equipment",
      "obsolete",
      "end of life",
      "spare parts unavailable",
      "aging assets",
    ],
    interventionType: "consultant-required",
    baseConfidence: 80,
    archetypeIds: [
      "ra-im-breakdown-001",
      "ra-st-breakdown-001",
      "ra-pr-breakdown-001",
    ],
    whyItMatters:
      "Obsolete equipment lacks manufacturer support and reliable spare parts supply.",
    interventionDirection: "Asset lifecycle review and replacement planning.",
    // RCI Brain v2 pattern card fields
    validationChecklist: [
      "Asset age and remaining useful life documented",
      "Spare parts availability confirmed with suppliers",
      "Replacement timeline and budget allocated",
    ],
    antiPatterns: [
      "Running equipment beyond manufacturer-recommended service life without assessment",
      "Stockpiling spare parts for discontinued models instead of planning replacement",
    ],
    highLeverageFix: "Conduct asset criticality assessment to prioritise replacement sequencing.",
    preventionStrategy: "Asset lifecycle register with proactive replacement triggers.",
    caseReferences: [],
    symptomTags: ["FIRE_FIGHTING_CULTURE", "COST_OVERRUNS", "CAPACITY_BOTTLENECK"],
  },
  {
    id: "rc-mc001c",
    title: "Equipment breakdowns caused by improper operator usage",
    category: "Machinery",
    applicableIndustries: [
      "Manufacturing",
      "Construction",
      "F&B",
      "Hospitality",
      "Logistics",
    ],
    primaryContext: "People",
    symptoms: [
      "operator error",
      "misuse",
      "improper handling",
      "untrained operators",
      "equipment abuse",
    ],
    interventionType: "advisory",
    baseConfidence: 77,
    archetypeIds: [
      "ra-im-breakdown-001",
      "ra-st-training-001",
      "ra-pr-breakdown-001",
    ],
    whyItMatters:
      "Improper usage accelerates wear and causes avoidable failures.",
    interventionDirection:
      "Operator training and usage protocols for critical equipment.",
  },
  {
    id: "rc-mc002",
    title: "Lack of preventive maintenance schedule",
    category: "Machinery",
    applicableIndustries: [
      "Manufacturing",
      "Construction",
      "Oil & Gas",
      "Logistics",
      "Healthcare",
    ],
    primaryContext: "Systems",
    symptoms: ["maintenance", "preventive", "schedule", "servicing", "upkeep"],
    interventionType: "advisory",
    baseConfidence: 78,
    archetypeIds: [
      "ra-im-maintenance-001",
      "ra-st-maintenance-001",
      "ra-pr-maintenance-001",
    ],
    whyItMatters: "Reactive-only maintenance leads to unplanned downtime.",
    interventionDirection:
      "Preventive maintenance calendar for critical equipment.",
  },
  {
    id: "rc-mc003",
    title: "Legacy systems lacking real-time visibility",
    category: "Machinery",
    applicableIndustries: [
      "Manufacturing",
      "Healthcare",
      "Logistics",
      "Retail",
      "Property Development",
    ],
    primaryContext: "Systems",
    symptoms: [
      "legacy system",
      "ERP",
      "software",
      "integration",
      "real-time",
      "visibility",
    ],
    interventionType: "consultant-required",
    baseConfidence: 76,
    archetypeIds: ["ra-im-legacy-001", "ra-st-legacy-001", "ra-pr-legacy-001"],
    whyItMatters:
      "Outdated systems delay information flow and limit visibility.",
    interventionDirection: "System modernisation or integration pathways.",
  },
  {
    id: "rc-mc004",
    title: "Bottleneck equipment limiting throughput",
    category: "Machinery",
    applicableIndustries: ["Manufacturing", "F&B", "Logistics", "Construction"],
    primaryContext: "Process",
    symptoms: [
      "bottleneck",
      "capacity",
      "throughput",
      "constraint",
      "slowdown",
    ],
    interventionType: "consultant-required",
    baseConfidence: 74,
    archetypeIds: [
      "ra-im-bottleneck-001",
      "ra-st-bottleneck-001",
      "ra-pr-bottleneck-001",
    ],
    whyItMatters: "Bottleneck equipment constrains overall output capacity.",
    interventionDirection:
      "Capacity constraints addressed at the bottleneck point.",
  },
  {
    id: "rc-mc005",
    title: "Poor equipment utilization rates",
    category: "Machinery",
    applicableIndustries: [
      "Manufacturing",
      "Construction",
      "Logistics",
      "Oil & Gas",
    ],
    primaryContext: "Systems",
    symptoms: ["utilization", "idle", "underused", "efficiency", "OEE"],
    interventionType: "advisory",
    baseConfidence: 70,
    archetypeIds: [
      "ra-im-utilization-001",
      "ra-st-utilization-001",
      "ra-pr-utilization-001",
    ],
    whyItMatters:
      "Low utilisation means invested capital is not generating returns.",
    interventionDirection:
      "Scheduling and work allocation for improved asset utilisation.",
  },
  {
    id: "rc-mc006",
    title: "Inadequate calibration and quality controls",
    category: "Machinery",
    applicableIndustries: [
      "Manufacturing",
      "Healthcare",
      "F&B",
      "Construction",
    ],
    primaryContext: "Process",
    symptoms: [
      "calibration",
      "accuracy",
      "precision",
      "quality control",
      "measurement",
    ],
    interventionType: "advisory",
    baseConfidence: 72,
    archetypeIds: [
      "ra-im-calibration-001",
      "ra-st-calibration-001",
      "ra-pr-calibration-001",
    ],
    whyItMatters:
      "Uncalibrated equipment produces inconsistent output quality.",
    interventionDirection:
      "Regular calibration schedules and verification procedures.",
  },
  {
    id: "rc-mc007",
    title: "Missing or outdated operating procedures",
    category: "Machinery",
    applicableIndustries: [
      "Manufacturing",
      "Oil & Gas",
      "Healthcare",
      "Construction",
    ],
    primaryContext: "Process",
    symptoms: ["procedures", "SOP", "documentation", "instructions", "manual"],
    interventionType: "self-fixable",
    baseConfidence: 68,
    archetypeIds: ["ra-im-sop-001", "ra-st-sop-001", "ra-pr-sop-001"],
    whyItMatters:
      "Outdated procedures lead to operational inconsistencies and errors.",
    interventionDirection:
      "Standard operating procedures aligned to current practices.",
  },
  {
    id: "rc-mc008",
    title: "Technology gaps hindering productivity",
    category: "Machinery",
    applicableIndustries: [
      "Manufacturing",
      "Retail",
      "Logistics",
      "Professional Services",
    ],
    primaryContext: "Systems",
    symptoms: [
      "technology",
      "automation",
      "digital",
      "manual process",
      "modernization",
    ],
    interventionType: "consultant-required",
    baseConfidence: 80,
    archetypeIds: ["ra-im-tech-001", "ra-st-tech-001", "ra-pr-tech-001"],
    whyItMatters:
      "Manual processes limit scalability and increase error rates.",
    interventionDirection: "Technology adoption for high-impact processes.",
  },
];

import type { EvidenceSignal } from "./evidence-signals";

export interface SelectionContext {
  industry: string;
  symptoms: string[];
  problemStatement?: string;
  /**
   * User's selected focus context for context weighting.
   * Context weighting ensures diagnostics reflect the user's stated focus.
   */
  selectedContext?: PrimaryContext;
  /**
   * Keywords/phrases extracted from uploaded documents.
   * Used for document-aware confidence scoring in Deep Analysis mode.
   * Document evidence strengthens or weakens confidence but does not create new root causes.
   */
  documentSignals?: string[];
  /**
   * Structured evidence signals extracted from uploaded documents.
   * Used for evidence-based confidence weighting in Deep Analysis mode.
   * Document evidence reinforces or suppresses root cause confidence based on factual signals.
   */
  evidenceSignals?: EvidenceSignal[];
}

const industryNormalizationMap: Record<string, string[]> = {
  manufacturing: ["Manufacturing"],
  construction: ["Construction"],
  healthcare: ["Healthcare"],
  hospitality: ["Hospitality"],
  hotels_airbnb: ["Hospitality"],
  logistics: ["Logistics"],
  oil_gas: ["Oil & Gas"],
  property_development: ["Property Development"],
  fnb_full_service: ["F&B"],
  fnb_qsr: ["F&B"],
  fnb_fast_food: ["F&B"],
  fnb_franchise: ["F&B"],
  fnb_independent: ["F&B"],
  retail: ["Retail"],
  education: ["Education"],
  professional_services: ["Professional Services"],
  technology: ["Technology"],
};

function normalizeIndustry(industry: string): string[] {
  const normalized = industryNormalizationMap[industry.toLowerCase()];
  if (normalized) return normalized;
  return [industry.charAt(0).toUpperCase() + industry.slice(1).toLowerCase()];
}

export interface SelectedRootCause {
  id: string;
  title: string;
  category: FourMCategory;
  confidence: number;
  intervention: InterventionType;
  symptoms: string[];
  archetypeIds: string[];
  whyItMatters: string;
  interventionDirection: string;
  isOverridden?: boolean;
}

export interface RootCauseSelection {
  categories: {
    id: string;
    name: FourMCategory;
    causes: SelectedRootCause[];
  }[];
  totalMatches: number;
}

/**
 * CONTEXT WEIGHTING CONSTANTS
 * Context weighting ensures diagnostics reflect the user's stated focus.
 */
const CONTEXT_MATCH_BONUS = 8; // Increase score when context matches
const CONTEXT_MISMATCH_PENALTY = 4; // Decrease score when context does not match

/**
 * EVIDENCE SIGNAL WEIGHTING CONSTANTS
 * Document evidence reinforces or suppresses root cause confidence based on factual signals.
 * Evidence weighting applies ONLY in Deep Analysis mode.
 */
const EVIDENCE_WEAK_BONUS = 4; // Weak signal (+4)
const EVIDENCE_MEDIUM_BONUS = 8; // Medium signal (+8)
const EVIDENCE_STRONG_BONUS = 12; // Strong signal (+12)
const EVIDENCE_MAX_BONUS = 15; // Cap total evidence-based adjustment at +15 per root cause
const EVIDENCE_NO_MATCH_PENALTY = 3; // Penalty when signals exist but none match category

/**
 * CONFIDENCE CAPS BY INTERVENTION TYPE
 * Confidence caps prevent overconfidence and preserve diagnostic credibility.
 * Self-fixable issues have lower caps because they are less complex.
 * Consultant-required issues have higher caps as they need expert validation.
 */
export const CONFIDENCE_CAPS: Record<InterventionType, number> = {
  "self-fixable": 75,
  advisory: 85,
  "consultant-required": 95,
};

function calculateConfidence(
  cause: RootCauseEntry,
  context: SelectionContext,
): number {
  let confidence = cause.baseConfidence;

  const normalizedIndustries = normalizeIndustry(context.industry);
  // Root causes must be industry-relevant to avoid generic diagnostics
  const industryMatch = cause.applicableIndustries.some((ind: string) =>
    normalizedIndustries.some((n) => ind.toLowerCase() === n.toLowerCase()),
  );
  if (industryMatch) {
    confidence += 5;
  }

  // Context weighting ensures diagnostics reflect the user's stated focus.
  // Increase relevance score when selected context matches primaryContext.
  // Decrease score when it does not.
  if (context.selectedContext) {
    if (cause.primaryContext === context.selectedContext) {
      // User's stated focus matches this root cause's primary context
      confidence += CONTEXT_MATCH_BONUS;
    } else {
      // Context mismatch - reduce priority (but don't exclude)
      confidence -= CONTEXT_MISMATCH_PENALTY;
    }
  }

  const symptomText = [...context.symptoms, context.problemStatement || ""]
    .join(" ")
    .toLowerCase();

  let symptomMatches = 0;
  for (const symptom of cause.symptoms) {
    if (symptomText.includes(symptom.toLowerCase())) {
      symptomMatches++;
    }
  }

  confidence += Math.min(symptomMatches * 3, 12);

  // Document-aware confidence adjustment (Deep Analysis only).
  // Document evidence strengthens or weakens confidence but does not create new root causes.
  // Only applies when documentSignals are provided from uploaded documents.
  if (context.documentSignals && context.documentSignals.length > 0) {
    const documentText = context.documentSignals.join(" ").toLowerCase();
    let documentMatches = 0;
    for (const symptom of cause.symptoms) {
      if (documentText.includes(symptom.toLowerCase())) {
        documentMatches++;
      }
    }
    // +4 per symptom match found in documents, capped at +16
    confidence += Math.min(documentMatches * 4, 16);
  }

  // Document evidence reinforces or suppresses root cause confidence based on factual signals.
  // Evidence weighting applies ONLY in Deep Analysis (when evidenceSignals are provided).
  if (context.evidenceSignals && context.evidenceSignals.length > 0) {
    // Find signals that match this root cause's 4M category
    const matchingSignals = context.evidenceSignals.filter(
      (signal) => signal.category === cause.category,
    );

    if (matchingSignals.length > 0) {
      // Calculate total evidence bonus from matching signals
      let evidenceBonus = 0;
      for (const signal of matchingSignals) {
        switch (signal.strength) {
          case "weak":
            evidenceBonus += EVIDENCE_WEAK_BONUS;
            break;
          case "medium":
            evidenceBonus += EVIDENCE_MEDIUM_BONUS;
            break;
          case "strong":
            evidenceBonus += EVIDENCE_STRONG_BONUS;
            break;
        }
      }
      // Cap total evidence-based adjustment at +15 per root cause
      confidence += Math.min(evidenceBonus, EVIDENCE_MAX_BONUS);
    } else {
      // Signals exist but none match this root cause category
      // Apply small penalty to prevent unrelated causes from dominating
      confidence -= EVIDENCE_NO_MATCH_PENALTY;
    }
  }

  // Apply confidence cap based on intervention type.
  // Confidence caps prevent overconfidence and preserve diagnostic credibility.
  const interventionCap = CONFIDENCE_CAPS[cause.interventionType];
  confidence = Math.min(confidence, interventionCap);

  // Ensure confidence stays within valid range (0-99)
  return Math.max(0, Math.min(confidence, 99));
}

/**
 * Extract base ID prefix for sibling grouping.
 * e.g., "rc-m001a" → "rc-m001", "rc-mc001b" → "rc-mc001"
 * Sibling root causes represent alternative failure mechanisms and must not be reported concurrently.
 */
function getSiblingGroupId(id: string): string {
  // Match pattern: letters/numbers followed by a trailing letter (a, b, c, etc.)
  const match = id.match(/^(.+?)[a-z]$/);
  return match ? match[1] : id;
}

/**
 * Normalize V2 category to standard 4M category.
 * V2 uses "Material" (singular) which maps to "Materials" (plural).
 */
function normalizeV2Category(category: string): FourMCategory {
  if (category === "Material") return "Materials";
  return category as FourMCategory;
}

/**
 * Calculate confidence for V2 root causes.
 * V2 entries use `evidenceSignals` instead of `symptoms` for matching.
 */
function calculateConfidenceV2(
  cause: (typeof manufacturingRootCausesV2)[0],
  context: SelectionContext
): number {
  // V2 entries don't have baseConfidence, use 50 as default
  let confidence = 50;

  // Match evidence signals against problem statement and document signals
  const searchText = [
    context.problemStatement || "",
    ...(context.documentSignals || []),
  ]
    .join(" ")
    .toLowerCase();

  // Score based on evidence signal matches
  let signalMatches = 0;
  for (const signal of cause.evidenceSignals || []) {
    if (searchText.includes(signal.toLowerCase())) {
      signalMatches++;
    }
  }
  
  // Boost confidence based on signal matches
  if (signalMatches > 0) {
    confidence += Math.min(signalMatches * 5, 15);
  }

  // Context weighting: boost if primary context matches selected context
  if (context.selectedContext) {
    const contextMapping: Record<string, PrimaryContext[]> = {
      Money: ["Money"],
      Manpower: ["People"],
      Operations: ["Process", "Supply"],
      Systems: ["Systems"],
      Compliance: ["Money", "People"],
    };
    
    // selectedContext is a single PrimaryContext value
    const boostedContexts = contextMapping[context.selectedContext] || [];
    
    if (boostedContexts.includes(cause.primaryContext as PrimaryContext)) {
      confidence += CONTEXT_MATCH_BONUS;
    }
  }

  // Apply evidence signals from document analysis
  if (context.evidenceSignals && context.evidenceSignals.length > 0) {
    const normalizedCategory = normalizeV2Category(cause.category);
    const matchingSignals = context.evidenceSignals.filter(
      (signal) => signal.category === normalizedCategory
    );

    if (matchingSignals.length > 0) {
      let evidenceBonus = 0;
      for (const signal of matchingSignals) {
        switch (signal.strength) {
          case "weak":
            evidenceBonus += EVIDENCE_WEAK_BONUS;
            break;
          case "medium":
            evidenceBonus += EVIDENCE_MEDIUM_BONUS;
            break;
          case "strong":
            evidenceBonus += EVIDENCE_STRONG_BONUS;
            break;
        }
      }
      confidence += Math.min(evidenceBonus, EVIDENCE_MAX_BONUS);
    } else {
      confidence -= EVIDENCE_NO_MATCH_PENALTY;
    }
  }

  // Manufacturing causality reweighting (safe: this function is only called
  // from selectFromManufacturingV2 which is gated to Manufacturing industry):
  // Operational root causes (Machinery, Manpower) are weighted higher because
  // they are upstream causes; Money findings are downstream financial outcomes.
  const normalizedCat = normalizeV2Category(cause.category);
  if (normalizedCat === "Machinery" || normalizedCat === "Materials") {
    confidence = Math.round(confidence * 1.20);
  } else if (normalizedCat === "Manpower") {
    confidence = Math.round(confidence * 1.10);
  } else if (normalizedCat === "Money") {
    const hasFinancialEvidence = context.evidenceSignals?.some(
      s => s.category === "Money" && (s.strength === "medium" || s.strength === "strong")
    );
    if (!hasFinancialEvidence) {
      confidence = Math.round(confidence * 0.85);
    }
  }

  // Apply intervention type cap
  const interventionCap = CONFIDENCE_CAPS[cause.interventionType as InterventionType] || 99;
  confidence = Math.min(confidence, interventionCap);

  return Math.max(0, Math.min(confidence, 99));
}

/**
 * Manufacturing V2 Root Cause Selection
 * 
 * EXCLUSIVE selection from manufacturingRootCausesV2 for Manufacturing industry.
 * - NO fallback to generic root cause library
 * - NO cross-industry causes
 * - Uses V2 field structure (evidenceSignals instead of symptoms)
 */
function selectFromManufacturingV2(
  context: SelectionContext,
  maxPerCategory: number = 3
): RootCauseSelection {
  const categoryMap: Record<FourMCategory, SelectedRootCause[]> = {
    Money: [],
    Manpower: [],
    Materials: [],
    Machinery: [],
  };

  // Score and sort all V2 causes
  const scoredCauses = manufacturingRootCausesV2
    .map((cause) => ({
      ...cause,
      normalizedCategory: normalizeV2Category(cause.category),
      calculatedConfidence: calculateConfidenceV2(cause, context),
    }))
    .sort((a, b) => b.calculatedConfidence - a.calculatedConfidence);

  // Sibling resolution for V2 causes
  const siblingGroups = new Map<string, typeof scoredCauses>();
  for (const cause of scoredCauses) {
    const groupId = getSiblingGroupId(cause.id);
    if (!siblingGroups.has(groupId)) {
      siblingGroups.set(groupId, []);
    }
    siblingGroups.get(groupId)!.push(cause);
  }

  // Resolve siblings: highest confidence is primary
  const resolvedCauses: Array<
    (typeof scoredCauses)[0] & { isSecondaryContributor: boolean }
  > = [];
  for (const [_groupId, siblings] of Array.from(siblingGroups.entries())) {
    if (siblings.length === 1) {
      resolvedCauses.push({ ...siblings[0], isSecondaryContributor: false });
    } else {
      const primary = siblings[0];
      resolvedCauses.push({ ...primary, isSecondaryContributor: false });
      for (let i = 1; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (primary.calculatedConfidence - sibling.calculatedConfidence <= 5) {
          resolvedCauses.push({ ...sibling, isSecondaryContributor: true });
        }
      }
    }
  }

  // Re-sort resolved causes
  resolvedCauses.sort(
    (a, b) => b.calculatedConfidence - a.calculatedConfidence
  );

  // Populate category map
  for (const cause of resolvedCauses) {
    const category = cause.normalizedCategory;
    const primaryCount = categoryMap[category].filter(
      (c) => !c.isOverridden
    ).length;

    const selectedCause: SelectedRootCause = {
      id: cause.id,
      title: cause.title,
      category: category,
      confidence: cause.calculatedConfidence,
      intervention: cause.interventionType as InterventionType,
      symptoms: cause.evidenceSignals || [], // Map evidenceSignals to symptoms
      archetypeIds: [], // V2 entries don't use archetypes
      whyItMatters: cause.whyItMatters,
      interventionDirection: cause.interventionDirection,
      isOverridden: cause.isSecondaryContributor,
    };

    if (cause.isSecondaryContributor) {
      categoryMap[category].push(selectedCause);
    } else if (primaryCount < maxPerCategory) {
      categoryMap[category].push(selectedCause);
    }
  }

  const categories = (
    ["Money", "Manpower", "Materials", "Machinery"] as FourMCategory[]
  )
    .filter((cat) => categoryMap[cat].length > 0)
    .map((cat) => ({
      id: cat.toLowerCase(),
      name: cat,
      causes: categoryMap[cat],
    }));

  const totalMatches = categories.reduce(
    (sum, cat) => sum + cat.causes.length,
    0
  );

  return {
    categories,
    totalMatches,
  };
}

export function selectRootCausesFromLibrary(
  context: SelectionContext,
  maxPerCategory: number = 3,
): RootCauseSelection {
  // MANUFACTURING V2: Use manufacturingRootCausesV2 exclusively for Manufacturing industry
  // No fallback to generic library, no cross-industry causes
  const normalizedIndustries = normalizeIndustry(context.industry);
  const isManufacturing = normalizedIndustries.some(
    (ind) => ind.toLowerCase() === "manufacturing"
  );

  if (isManufacturing) {
    return selectFromManufacturingV2(context, maxPerCategory);
  }

  const categoryMap: Record<FourMCategory, SelectedRootCause[]> = {
    Money: [],
    Manpower: [],
    Materials: [],
    Machinery: [],
  };

  // Root causes must be industry-relevant to avoid generic diagnostics.
  // Selection is rule-based: only root causes where applicableIndustries
  // includes client.industry are selected. Cross-industry root causes
  // (crossIndustry: true) are allowed only if explicitly marked.
  const scoredCauses = rootCauseLibrary
    .filter((cause) => {
      // Rule-based industry matching: exact match required
      const industryMatch = cause.applicableIndustries.some((ind: string) =>
        normalizedIndustries.some((n) => ind.toLowerCase() === n.toLowerCase()),
      );

      // If exact industry match exists, include this root cause
      if (industryMatch) return true;

      // Allow cross-industry root causes ONLY if explicitly marked
      if (cause.crossIndustry === true) return true;

      // No match and not cross-industry: exclude
      return false;
    })
    .map((cause) => ({
      ...cause,
      calculatedConfidence: calculateConfidence(cause, context),
    }))
    .sort((a, b) => b.calculatedConfidence - a.calculatedConfidence);

  // Sibling root causes represent alternative failure mechanisms and must not be reported concurrently.
  // Group siblings by base ID prefix and resolve to single primary per group.
  const siblingGroups = new Map<string, typeof scoredCauses>();
  for (const cause of scoredCauses) {
    const groupId = getSiblingGroupId(cause.id);
    if (!siblingGroups.has(groupId)) {
      siblingGroups.set(groupId, []);
    }
    siblingGroups.get(groupId)!.push(cause);
  }

  // Resolve siblings: keep highest-confidence as primary, mark close competitors as secondary
  const resolvedCauses: Array<
    (typeof scoredCauses)[0] & { isSecondaryContributor: boolean }
  > = [];
  for (const [groupId, siblings] of Array.from(siblingGroups.entries())) {
    if (siblings.length === 1) {
      // No siblings, include directly
      resolvedCauses.push({ ...siblings[0], isSecondaryContributor: false });
    } else {
      // Multiple siblings: select highest-confidence as primary
      const primary = siblings[0]; // Already sorted by confidence
      resolvedCauses.push({ ...primary, isSecondaryContributor: false });

      // Mark close competitors (within 5 points) as secondary contributors
      for (let i = 1; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (primary.calculatedConfidence - sibling.calculatedConfidence <= 5) {
          resolvedCauses.push({ ...sibling, isSecondaryContributor: true });
        }
        // Siblings beyond 5-point threshold are suppressed entirely
      }
    }
  }

  // Re-sort resolved causes by confidence for category limiting
  resolvedCauses.sort(
    (a, b) => b.calculatedConfidence - a.calculatedConfidence,
  );

  for (const cause of resolvedCauses) {
    const category = cause.category;
    // Only count non-secondary causes toward category limit
    const primaryCount = categoryMap[category].filter(
      (c) => !c.isOverridden,
    ).length;

    if (cause.isSecondaryContributor) {
      // Secondary contributors are marked but don't count toward limit
      categoryMap[category].push({
        id: cause.id,
        title: cause.title,
        category: cause.category,
        confidence: cause.calculatedConfidence,
        intervention: cause.interventionType,
        symptoms: cause.symptoms,
        archetypeIds: cause.archetypeIds,
        whyItMatters: cause.whyItMatters,
        interventionDirection: cause.interventionDirection,
        isOverridden: true,
      });
    } else if (primaryCount < maxPerCategory) {
      categoryMap[category].push({
        id: cause.id,
        title: cause.title,
        category: cause.category,
        confidence: cause.calculatedConfidence,
        intervention: cause.interventionType,
        symptoms: cause.symptoms,
        archetypeIds: cause.archetypeIds,
        whyItMatters: cause.whyItMatters,
        interventionDirection: cause.interventionDirection,
        isOverridden: false,
      });
    }
  }

  const categories = (
    ["Money", "Manpower", "Materials", "Machinery"] as FourMCategory[]
  )
    .filter((cat) => categoryMap[cat].length > 0)
    .map((cat) => ({
      id: cat.toLowerCase(),
      name: cat,
      causes: categoryMap[cat],
    }));

  const totalMatches = categories.reduce(
    (sum, cat) => sum + cat.causes.length,
    0,
  );

  return {
    categories,
    totalMatches,
  };
}

export function getAllCausesByCategory(
  category: FourMCategory,
): RootCauseEntry[] {
  return rootCauseLibrary.filter((cause) => cause.category === category);
}

export function getCauseById(id: string): RootCauseEntry | undefined {
  return rootCauseLibrary.find((cause) => cause.id === id);
}

/**
 * Get root causes applicable to a specific industry.
 * Root causes must be industry-relevant to avoid generic diagnostics.
 * Includes cross-industry root causes if explicitly marked.
 */
export function getCausesByIndustry(industry: string): RootCauseEntry[] {
  return rootCauseLibrary.filter((cause) => {
    // Exact industry match
    const industryMatch = cause.applicableIndustries.some(
      (ind: string) => ind.toLowerCase() === industry.toLowerCase(),
    );
    if (industryMatch) return true;

    // Allow cross-industry root causes if explicitly marked
    if (cause.crossIndustry === true) return true;

    return false;
  });
}
// ======================================================
// RCI Brain v2: SYMPTOM → ROOT CAUSE MAPPING ENGINE
// ======================================================
// Scores root causes by symptom tag overlap, with optional industry/category boosting.
// Returns ranked results for use in future diagnostic workflow UI.

export interface ScoredRootCause {
  entry: RootCauseEntry;
  confidenceScore: number; // 0–100 scale
  matchedTags: SymptomTag[];
}

export interface GetLikelyRootCausesOptions {
  industry?: string;
  category?: FourMCategory;
}

export function getLikelyRootCauses(
  observedSymptoms: SymptomTag[],
  options?: GetLikelyRootCausesOptions,
): ScoredRootCause[] {
  if (observedSymptoms.length === 0) return [];

  const results: ScoredRootCause[] = [];

  for (const entry of rootCauseLibrary) {
    const entryTags = entry.symptomTags;
    if (!entryTags || entryTags.length === 0) continue;

    const matchedTags = observedSymptoms.filter((s) => entryTags.includes(s));
    if (matchedTags.length === 0) continue;

    // Base score: proportion of observed symptoms that match this entry's tags
    let score = (matchedTags.length / observedSymptoms.length) * 70;

    // Boost: proportion of entry's tags that are covered (rewards specificity)
    score += (matchedTags.length / entryTags.length) * 15;

    // Industry match boost
    if (options?.industry) {
      const industryMatch = entry.applicableIndustries.some(
        (ind) => ind.toLowerCase() === options.industry!.toLowerCase(),
      );
      if (industryMatch) {
        score += 10;
      } else if (entry.crossIndustry) {
        score += 5;
      }
    }

    // Category match boost
    if (options?.category && entry.category === options.category) {
      score += 5;
    }

    results.push({
      entry,
      confidenceScore: Math.min(Math.round(score), 100),
      matchedTags: matchedTags as SymptomTag[],
    });
  }

  // Sort by confidence descending, then by baseConfidence as tiebreaker
  results.sort((a, b) => {
    if (b.confidenceScore !== a.confidenceScore) {
      return b.confidenceScore - a.confidenceScore;
    }
    return b.entry.baseConfidence - a.entry.baseConfidence;
  });

  return results;
}

// ======================================================
// RCI MANUFACTURING ROOT CAUSE LIBRARY v2 (PERNAS-GRADE)
// ======================================================

export const manufacturingRootCausesV2 = [
  {
    id: "mfg-m-01",
    industry: "Manufacturing",
    category: "Money",
    primaryContext: "Money",
    title:
      "Cash flow pressure caused by production costs incurred before billing milestones",
    evidenceSignals: [
      "production costs incurred before invoicing",
      "billing milestones delayed",
      "negative operating cash flow during active production",
    ],
    whyItMatters:
      "Cash is consumed well before revenue is realised, increasing reliance on short-term funding.",
    interventionDirection: "Alignment of cost incurrence and billing triggers.",
    interventionType: "consultant-required",
  },
  {
    id: "mfg-m-02",
    industry: "Manufacturing",
    category: "Money",
    primaryContext: "Money",
    title: "Margin erosion from untracked material cost increases",
    evidenceSignals: [
      "supplier price increases not reflected in costing",
      "material cost variance against estimates",
      "actual costs exceeding bill of materials assumptions",
    ],
    whyItMatters:
      "Margins deteriorate as input costs rise without pricing adjustment.",
    interventionDirection:
      "Visibility of material cost movements against pricing assumptions.",
    interventionType: "consultant-required",
  },
  {
    id: "mfg-p-01",
    industry: "Manufacturing",
    category: "Manpower",
    primaryContext: "People",
    title:
      "Supervisory oversight gaps allowing quality defects to pass downstream",
    evidenceSignals: [
      "late-stage defect detection",
      "rework after final inspection",
      "lack of documented escalation actions",
    ],
    whyItMatters:
      "Defects propagate across stages, increasing rework and scrap.",
    interventionDirection:
      "Clear supervisory accountability for quality control.",
    interventionType: "advisory",
  },
  {
    id: "mfg-p-02",
    industry: "Manufacturing",
    category: "Manpower",
    primaryContext: "People",
    title: "Operational dependency on a small number of experienced operators",
    evidenceSignals: [
      "overtime concentrated on specific individuals",
      "production delays during key staff absence",
      "limited cross-training coverage",
    ],
    whyItMatters:
      "Production continuity is vulnerable to individual availability.",
    interventionDirection: "Reduction of single-point human dependency.",
    interventionType: "advisory",
  },
  {
    id: "mfg-mat-01",
    industry: "Manufacturing",
    category: "Material",
    primaryContext: "Supply",
    title:
      "Stockouts caused by fixed inventory thresholds despite demand variability",
    evidenceSignals: [
      "urgent material purchases",
      "repeated stockout incidents",
      "static inventory min-max settings",
    ],
    whyItMatters: "Production halts despite available demand and capacity.",
    interventionDirection:
      "Inventory parameters responsive to demand fluctuations.",
    interventionType: "self-fixable",
  },
  {
    id: "mfg-mat-02",
    industry: "Manufacturing",
    category: "Material",
    primaryContext: "Supply",
    title:
      "Excess inventory accumulation due to forecast and production mismatch",
    evidenceSignals: [
      "slow-moving or ageing inventory",
      "forecast variance against actual output",
      "materials held beyond normal turnover",
    ],
    whyItMatters:
      "Capital is tied up in materials that do not convert into revenue.",
    interventionDirection: "Alignment of forecasts with production planning.",
    interventionType: "advisory",
  },
  {
    id: "mfg-e-01",
    industry: "Manufacturing",
    category: "Machinery",
    primaryContext: "Systems",
    title:
      "Unplanned downtime from maintenance performed only after breakdowns",
    evidenceSignals: [
      "frequent emergency repairs",
      "absence of preventive maintenance records",
      "downtime during peak production periods",
    ],
    whyItMatters: "Equipment failures interrupt output at critical periods.",
    interventionDirection: "Shift from reactive to preventive maintenance.",
    interventionType: "consultant-required",
  },
  {
    id: "mfg-e-02",
    industry: "Manufacturing",
    category: "Machinery",
    primaryContext: "Systems",
    title: "Production bottlenecks limiting overall output capacity",
    evidenceSignals: [
      "queue build-up at specific workstations",
      "uneven utilisation across equipment",
      "recurring delays at the same process step",
    ],
    whyItMatters: "One constrained step caps total factory throughput.",
    interventionDirection: "Constraint-focused capacity management.",
    interventionType: "consultant-required",
  },
  {
    id: "mfg-s-01",
    industry: "Manufacturing",
    category: "Machinery",
    primaryContext: "Process",
    title:
      "Delayed management response due to lack of real-time production visibility",
    evidenceSignals: [
      "end-of-day production reporting only",
      "manual tracking of output",
      "issues identified after performance loss",
    ],
    whyItMatters:
      "Management reacts after losses occur instead of during execution.",
    interventionDirection: "Timely visibility into production performance.",
    interventionType: "advisory",
  },
  {
    id: "mfg-s-02",
    industry: "Manufacturing",
    category: "Machinery",
    primaryContext: "Process",
    title: "Specification changes not fully reflected on the production floor",
    evidenceSignals: [
      "scrap increase after design changes",
      "outdated drawings in circulation",
      "engineering change notices not acknowledged",
    ],
    whyItMatters: "Work is executed against outdated requirements.",
    interventionDirection: "Controlled propagation of specification changes.",
    interventionType: "advisory",
  },
  {
    id: "mfg-s-03",
    industry: "Manufacturing",
    category: "Machinery",
    primaryContext: "Process",
    title: "Recurring defects without a structured resolution mechanism",
    evidenceSignals: [
      "repeat non-conformance reports",
      "lack of permanent corrective actions",
      "issues reopened multiple times",
    ],
    whyItMatters: "The same problems recur without structural resolution.",
    interventionDirection: "Formal closure of recurring defect causes.",
    interventionType: "consultant-required",
  },
  {
    id: "mfg-s-04",
    industry: "Manufacturing",
    category: "Machinery",
    primaryContext: "Process",
    title: "Production planning misaligned with sales order volatility",
    evidenceSignals: [
      "frequent production rescheduling",
      "rush orders disrupting plans",
      "idle capacity alternating with overload",
    ],
    whyItMatters: "Capacity utilisation becomes inconsistent and inefficient.",
    interventionDirection:
      "Integration of sales volatility into production planning.",
    interventionType: "consultant-required",
  },
];
