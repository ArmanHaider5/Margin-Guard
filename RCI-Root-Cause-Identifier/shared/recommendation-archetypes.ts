/**
 * ============================================================================
 * RCI RECOMMENDATION ARCHETYPES - INSTITUTIONAL INTERVENTION PATTERNS
 * ============================================================================
 * 
 * This is the AUTHORITATIVE source of recommendations for RCI diagnostics.
 * 
 * GOVERNANCE RULES:
 * 
 * 1. AI MUST assemble recommendations from these archetypes ONLY
 *    - No invented recommendations allowed
 *    - Each recommendation must reference an archetype ID
 * 
 * 2. STRUCTURE:
 *    - Each archetype has a unique ID (e.g., "ra-im-cashflow-001")
 *    - applicable_root_cause_ids define which causes this addresses
 *    - action_type categorises: Immediate, Structural, Prevention
 * 
 * 3. ADDING NEW ARCHETYPES:
 *    - Requires consultant review and approval
 *    - Must link to applicable root causes
 *    - Must specify consultant requirement level
 * 
 * 4. AI ROLE:
 *    - Select archetypes linked to matched root causes
 *    - Filter by industry applicability
 *    - Assemble into layered recommendations
 *    - DO NOT invent new recommendations
 * 
 * ARCHETYPE CATEGORIES:
 *    - Immediate: Quick fixes the client can do now
 *    - Structural: Process/system changes requiring planning
 *    - Prevention: Long-term measures to avoid recurrence
 * 
 * ============================================================================
 * VARIATION RULES - PREVENTING IDENTICAL RECOMMENDATION SETS
 * ============================================================================
 * 
 * RULE: No two diagnostics across different industries may return identical
 * recommendation sets. If similarity is unavoidable, wording must differ
 * materially.
 * 
 * VARIATION MECHANISMS:
 * 
 * 1. INDUSTRY-SPECIFIC WORDING (industryVariations):
 *    - Each archetype can have industry-specific description variants
 *    - Uses terminology and context relevant to that industry
 *    - Same core recommendation, different framing
 * 
 * 2. SEVERITY-BASED PRIORITISATION (severityWeight):
 *    - Higher severity findings get more urgent action types first
 *    - Critical: Prioritise Immediate actions
 *    - High: Balance Immediate and Structural
 *    - Medium/Low: Include more Prevention focus
 * 
 * 3. CATEGORY-BASED ORDERING:
 *    - Money issues: Financial-focused archetypes first
 *    - Manpower issues: People/training archetypes first
 *    - Material issues: Supply chain archetypes first
 *    - Machinery issues: Equipment/systems archetypes first
 * 
 * 4. UNIQUENESS HASH:
 *    - Each recommendation set includes industry+category fingerprint
 *    - Ensures traceability and prevents accidental duplication
 * 
 * ============================================================================
 */

export type ActionType = "Immediate" | "Structural" | "Prevention";
export type ConsultantRequired = "Yes" | "Sometimes" | "No";
export type SeverityLevel = "low" | "medium" | "high" | "critical";

/**
 * Industry-specific wording variations for recommendations.
 * Key = industry name (normalised), Value = alternative description.
 * If industry not in map, use default description.
 */
export type IndustryVariations = Record<string, string>;

export interface RecommendationArchetype {
  archetype_id: string;
  archetype_name: string;
  action_type: ActionType;
  description: string;
  applicable_root_cause_ids: string[];
  applicable_industries: string[] | "All";
  consultant_required: ConsultantRequired;
  /**
   * VARIATION: Industry-specific description variants.
   * Ensures different industries receive materially different wording
   * even when the core recommendation is the same.
   */
  industryVariations?: IndustryVariations;
  /**
   * VARIATION: Severity weight (1-10).
   * Higher weight = prioritised for critical/high severity findings.
   * Lower weight = better suited for medium/low severity findings.
   */
  severityWeight?: number;
}

export const recommendationArchetypes: RecommendationArchetype[] = [
  // ============================================
  // RCI RECOMMENDATION ARCHETYPES
  // ============================================
  {
    archetype_id: "RCI-REC-01",
    archetype_name: "Clarify Immediate Ownership and Accountability",
    action_type: "Immediate",
    description: "Assign clear ownership for key issues to prevent delay and confusion.",
    applicable_root_cause_ids: ["RCI-PROC-05", "RCI-GOV-01", "RCI-PEOP-01"],
    applicable_industries: "All",
    consultant_required: "Sometimes",
    severityWeight: 9,
    industryVariations: {
      "Manufacturing": "Designate a single point of accountability for production line issues.",
      "Healthcare": "Assign clinical ownership for patient flow bottlenecks.",
      "Hospitality": "Clarify front-of-house responsibility for guest experience issues.",
      "F&B": "Define kitchen vs service ownership boundaries for order delays.",
      "Construction": "Assign site-level accountability for schedule deviations.",
      "Retail": "Clarify store manager accountability for inventory discrepancies."
    }
  },
  {
    archetype_id: "RCI-REC-02",
    archetype_name: "Tighten Short-Term Controls and Oversight",
    action_type: "Immediate",
    description: "Strengthen basic controls and visibility to stabilise operations.",
    applicable_root_cause_ids: ["RCI-PROC-06", "RCI-SYS-03", "RCI-GOV-02"],
    applicable_industries: "All",
    consultant_required: "Sometimes",
    severityWeight: 8,
    industryVariations: {
      "Manufacturing": "Implement daily production reporting and variance tracking.",
      "Healthcare": "Establish shift handover checklists and compliance monitoring.",
      "Hospitality": "Introduce daily occupancy and service quality reviews.",
      "Logistics": "Tighten dispatch tracking and delivery confirmation procedures.",
      "Retail": "Strengthen daily cash reconciliation and stock movement logging."
    }
  },
  {
    archetype_id: "RCI-REC-03",
    archetype_name: "Reduce Operational Noise and Rework",
    action_type: "Immediate",
    description: "Remove obvious sources of rework and interruption slowing execution.",
    applicable_root_cause_ids: ["RCI-PROC-01", "RCI-PROC-03"],
    applicable_industries: ["Manufacturing", "Logistics", "Healthcare"],
    consultant_required: "No",
    severityWeight: 7,
    industryVariations: {
      "Manufacturing": "Eliminate common defect sources causing line stoppages.",
      "Logistics": "Reduce return-to-sender incidents through address verification.",
      "Healthcare": "Minimise documentation rework through standardised templates."
    }
  },

  // ============================================
  // IMMEDIATE ACTION ARCHETYPES
  // ============================================
  {
    archetype_id: "ra-im-cashflow-001",
    archetype_name: "Stop Work for Overdue Accounts",
    action_type: "Immediate",
    description: "Stop all work for customers with overdue payments over 60 days.",
    applicable_root_cause_ids: ["rc-m001"],
    applicable_industries: "All",
    consultant_required: "No",
    severityWeight: 10,
    industryVariations: {
      "Manufacturing": "Halt production orders for accounts with payments over 60 days overdue.",
      "Construction": "Suspend site work for projects with outstanding progress claims.",
      "Retail": "Discontinue credit terms for accounts exceeding payment thresholds.",
      "Logistics": "Hold shipments for customers with significant receivables arrears.",
      "F&B": "Suspend catering orders for corporate accounts with overdue balances."
    }
  },
  {
    archetype_id: "ra-im-cost-001",
    archetype_name: "Freeze Discretionary Spending",
    action_type: "Immediate",
    description: "Freeze all discretionary spending until cost drivers are identified.",
    applicable_root_cause_ids: ["rc-m002"],
    applicable_industries: "All",
    consultant_required: "Sometimes",
    severityWeight: 9,
    industryVariations: {
      "Manufacturing": "Suspend non-essential equipment purchases and overtime approvals.",
      "Hospitality": "Freeze renovations and marketing spend pending cost review.",
      "Healthcare": "Hold non-critical equipment acquisitions and agency staffing.",
      "Retail": "Suspend store improvement projects and promotional campaigns.",
      "Construction": "Freeze plant purchases and subcontractor additions."
    }
  },
  {
    archetype_id: "ra-im-budget-001",
    archetype_name: "List Committed Expenses",
    action_type: "Immediate",
    description: "List all committed expenses for next 90 days.",
    applicable_root_cause_ids: ["rc-m003"],
    applicable_industries: "All",
    consultant_required: "No",
    severityWeight: 6,
    industryVariations: {
      "Manufacturing": "Document all purchase orders, maintenance contracts, and payroll commitments.",
      "Healthcare": "List medical supply orders, staffing costs, and equipment leases.",
      "Hospitality": "Compile bookings, supplier commitments, and seasonal staffing costs.",
      "Retail": "Inventory committed stock orders, lease payments, and marketing spend."
    }
  },
  {
    archetype_id: "ra-im-credit-001",
    archetype_name: "Call Overdue Accounts",
    action_type: "Immediate",
    description: "Call all accounts over 30 days overdue today.",
    applicable_root_cause_ids: ["rc-m004"],
    applicable_industries: "All",
    consultant_required: "No",
    severityWeight: 8,
    industryVariations: {
      "Manufacturing": "Contact overdue trade customers with production-dependent relationships.",
      "Construction": "Follow up on outstanding progress claims with project owners.",
      "Retail": "Pursue overdue wholesale and corporate credit accounts.",
      "Healthcare": "Follow up on outstanding insurance and corporate billings."
    }
  },
  {
    archetype_id: "ra-im-pricing-001",
    archetype_name: "Calculate True Unit Cost",
    action_type: "Immediate",
    description: "Calculate true cost per unit including overhead and time.",
    applicable_root_cause_ids: ["rc-m005"],
    applicable_industries: "All",
    consultant_required: "Sometimes"
  },
  {
    archetype_id: "ra-im-debt-001",
    archetype_name: "Negotiate Loan Rates",
    action_type: "Immediate",
    description: "List all loans with rates and negotiate lower rates with banks.",
    applicable_root_cause_ids: ["rc-m006"],
    applicable_industries: "All",
    consultant_required: "Sometimes"
  },
  {
    archetype_id: "ra-im-cash-001",
    archetype_name: "Cash Reconciliation",
    action_type: "Immediate",
    description: "Count all cash and reconcile to sales records today.",
    applicable_root_cause_ids: ["rc-m007"],
    applicable_industries: ["Retail", "F&B", "Hospitality"],
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-growth-001",
    archetype_name: "Pause New Acquisition",
    action_type: "Immediate",
    description: "Pause new customer acquisition until cash position stabilizes.",
    applicable_root_cause_ids: ["rc-m008"],
    applicable_industries: "All",
    consultant_required: "Sometimes"
  },
  {
    archetype_id: "ra-im-training-001",
    archetype_name: "Buddy System Pairing",
    action_type: "Immediate",
    description: "Pair untrained staff with experienced operators for current tasks.",
    applicable_root_cause_ids: ["rc-mp001"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-turnover-001",
    archetype_name: "Exit Interview Review",
    action_type: "Immediate",
    description: "Conduct exit interviews with last three supervisors who left.",
    applicable_root_cause_ids: ["rc-mp002"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-ownership-001",
    archetype_name: "Assign Problem Owners",
    action_type: "Immediate",
    description: "Assign one name to own each recurring cross-department problem.",
    applicable_root_cause_ids: ["rc-mp003"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-knowledge-001",
    archetype_name: "Document Before Departure",
    action_type: "Immediate",
    description: "Have departing staff document their top five tasks before leaving.",
    applicable_root_cause_ids: ["rc-mp004"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-standards-001",
    archetype_name: "Observe Best Performer",
    action_type: "Immediate",
    description: "Observe best-performing team and note what they do differently.",
    applicable_root_cause_ids: ["rc-mp005"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-comms-001",
    archetype_name: "Direct Contact Setup",
    action_type: "Immediate",
    description: "Set up direct contact between department leads for urgent issues.",
    applicable_root_cause_ids: ["rc-mp006"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-staffing-001",
    archetype_name: "Redeploy from Low Activity",
    action_type: "Immediate",
    description: "Pull staff from low-activity areas during peak hours.",
    applicable_root_cause_ids: ["rc-mp007"],
    applicable_industries: ["Hospitality", "Retail", "F&B", "Healthcare"],
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-supervision-001",
    archetype_name: "Supervisor Presence Requirement",
    action_type: "Immediate",
    description: "Require supervisors to be present during critical operations.",
    applicable_root_cause_ids: ["rc-mp008"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-inventory-001",
    archetype_name: "Physical Count High Value",
    action_type: "Immediate",
    description: "Count high-value items physically and reconcile to records.",
    applicable_root_cause_ids: ["rc-mt001"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-supplier-001",
    archetype_name: "Confirm Delivery Dates",
    action_type: "Immediate",
    description: "Contact late suppliers and get confirmed new delivery dates.",
    applicable_root_cause_ids: ["rc-mt002"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-overstock-001",
    archetype_name: "Discount Slow Movers",
    action_type: "Immediate",
    description: "Discount slow-moving stock to convert to cash within 30 days.",
    applicable_root_cause_ids: ["rc-mt003"],
    applicable_industries: ["Retail", "F&B", "Hospitality"],
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-waste-001",
    archetype_name: "FIFO Enforcement",
    action_type: "Immediate",
    description: "Use oldest stock first and flag items approaching expiry.",
    applicable_root_cause_ids: ["rc-mt004"],
    applicable_industries: ["F&B", "Healthcare", "Hospitality"],
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-quality-001",
    archetype_name: "Reject Substandard Materials",
    action_type: "Immediate",
    description: "Reject substandard materials on arrival and document issues.",
    applicable_root_cause_ids: ["rc-mt005"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-singlesource-001",
    archetype_name: "Identify Backup Supplier",
    action_type: "Immediate",
    description: "Identify second supplier for critical materials and get quotes.",
    applicable_root_cause_ids: ["rc-mt006"],
    applicable_industries: "All",
    consultant_required: "Sometimes"
  },
  {
    archetype_id: "ra-im-forecast-001",
    archetype_name: "Use Last Year Baseline",
    action_type: "Immediate",
    description: "Use last year same period as baseline for next month.",
    applicable_root_cause_ids: ["rc-mt007"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-storage-001",
    archetype_name: "Move Sensitive Items",
    action_type: "Immediate",
    description: "Move sensitive items to proper storage conditions now.",
    applicable_root_cause_ids: ["rc-mt008"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-breakdown-001",
    archetype_name: "Schedule Critical Repairs",
    action_type: "Immediate",
    description: "Identify equipment causing most downtime and schedule repair.",
    applicable_root_cause_ids: ["rc-mc001"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-maintenance-001",
    archetype_name: "Service Overdue Equipment",
    action_type: "Immediate",
    description: "Service overdue equipment before next production run.",
    applicable_root_cause_ids: ["rc-mc002"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-legacy-001",
    archetype_name: "Daily Data Export",
    action_type: "Immediate",
    description: "Export critical data from legacy system daily.",
    applicable_root_cause_ids: ["rc-mc003"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-bottleneck-001",
    archetype_name: "Extend Bottleneck Hours",
    action_type: "Immediate",
    description: "Run bottleneck equipment longer hours or extra shifts.",
    applicable_root_cause_ids: ["rc-mc004"],
    applicable_industries: ["Manufacturing", "F&B", "Logistics"],
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-utilization-001",
    archetype_name: "Reduce Changeover Time",
    action_type: "Immediate",
    description: "Reduce changeover time to increase productive hours.",
    applicable_root_cause_ids: ["rc-mc005"],
    applicable_industries: ["Manufacturing", "Construction", "Logistics"],
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-calibration-001",
    archetype_name: "Calibrate Before Next Batch",
    action_type: "Immediate",
    description: "Calibrate critical measurement equipment before next batch.",
    applicable_root_cause_ids: ["rc-mc006"],
    applicable_industries: ["Manufacturing", "Healthcare", "F&B"],
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-sop-001",
    archetype_name: "Write Error-Prone Procedure",
    action_type: "Immediate",
    description: "Write procedure for task causing most errors this month.",
    applicable_root_cause_ids: ["rc-mc007"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-im-tech-001",
    archetype_name: "Automate High-Volume Task",
    action_type: "Immediate",
    description: "Automate highest-volume manual task with available tools.",
    applicable_root_cause_ids: ["rc-mc008"],
    applicable_industries: "All",
    consultant_required: "Sometimes"
  },

  // ============================================
  // STRUCTURAL CHANGE ARCHETYPES
  // ============================================
  {
    archetype_id: "ra-st-cashflow-001",
    archetype_name: "Payment Terms at Order",
    action_type: "Structural",
    description: "Set payment terms at order stage with deposit requirements.",
    applicable_root_cause_ids: ["rc-m001"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-st-cost-001",
    archetype_name: "Budget Authority Limits",
    action_type: "Structural",
    description: "Assign budget authority limits by role with approval gates.",
    applicable_root_cause_ids: ["rc-m002"],
    applicable_industries: "All",
    consultant_required: "Yes"
  },
  {
    archetype_id: "ra-st-budget-001",
    archetype_name: "Build from Actuals",
    action_type: "Structural",
    description: "Build budget from last year actuals plus known changes only.",
    applicable_root_cause_ids: ["rc-m003"],
    applicable_industries: "All",
    consultant_required: "Sometimes"
  },
  {
    archetype_id: "ra-st-credit-001",
    archetype_name: "Credit Limits by History",
    action_type: "Structural",
    description: "Set credit limits based on payment history before new orders.",
    applicable_root_cause_ids: ["rc-m004"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-st-pricing-001",
    archetype_name: "Reprice Bottom Products",
    action_type: "Structural",
    description: "Reprice bottom 20% of products based on full cost plus margin.",
    applicable_root_cause_ids: ["rc-m005"],
    applicable_industries: "All",
    consultant_required: "Yes"
  },
  {
    archetype_id: "ra-st-debt-001",
    archetype_name: "Consolidate Short-Term Debt",
    action_type: "Structural",
    description: "Consolidate short-term debt into longer-term facility.",
    applicable_root_cause_ids: ["rc-m006"],
    applicable_industries: "All",
    consultant_required: "Yes"
  },
  {
    archetype_id: "ra-st-cash-001",
    archetype_name: "Dual Signature Requirement",
    action_type: "Structural",
    description: "Require dual signatures for cash withdrawals over threshold.",
    applicable_root_cause_ids: ["rc-m007"],
    applicable_industries: ["Retail", "F&B", "Hospitality"],
    consultant_required: "No"
  },
  {
    archetype_id: "ra-st-growth-001",
    archetype_name: "Secure Credit Before Growth",
    action_type: "Structural",
    description: "Secure credit facility before next growth phase.",
    applicable_root_cause_ids: ["rc-m008"],
    applicable_industries: "All",
    consultant_required: "Yes"
  },
  {
    archetype_id: "ra-st-training-001",
    archetype_name: "Step-by-Step Guides",
    action_type: "Structural",
    description: "Write step-by-step guides for the five most error-prone tasks.",
    applicable_root_cause_ids: ["rc-mp001"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-st-turnover-001",
    archetype_name: "Supervisor Career Path",
    action_type: "Structural",
    description: "Define supervisor career path with compensation milestones.",
    applicable_root_cause_ids: ["rc-mp002"],
    applicable_industries: "All",
    consultant_required: "Yes"
  },
  {
    archetype_id: "ra-st-ownership-001",
    archetype_name: "Responsibility Matrix",
    action_type: "Structural",
    description: "Publish responsibility matrix for all shared processes.",
    applicable_root_cause_ids: ["rc-mp003"],
    applicable_industries: "All",
    consultant_required: "Yes"
  },
  {
    archetype_id: "ra-st-knowledge-001",
    archetype_name: "Backup Person Assignment",
    action_type: "Structural",
    description: "Create backup person for every critical role.",
    applicable_root_cause_ids: ["rc-mp004"],
    applicable_industries: "All",
    consultant_required: "Sometimes"
  },
  {
    archetype_id: "ra-st-standards-001",
    archetype_name: "Standardize Best Methods",
    action_type: "Structural",
    description: "Standardize methods across teams based on best performer.",
    applicable_root_cause_ids: ["rc-mp005"],
    applicable_industries: "All",
    consultant_required: "Sometimes"
  },
  {
    archetype_id: "ra-st-comms-001",
    archetype_name: "Shared Workspace Creation",
    action_type: "Structural",
    description: "Create shared workspace or board for cross-department projects.",
    applicable_root_cause_ids: ["rc-mp006"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-st-staffing-001",
    archetype_name: "Part-Time Pool",
    action_type: "Structural",
    description: "Build part-time pool for predictable peak periods.",
    applicable_root_cause_ids: ["rc-mp007"],
    applicable_industries: ["Hospitality", "Retail", "F&B", "Healthcare"],
    consultant_required: "No"
  },
  {
    archetype_id: "ra-st-supervision-001",
    archetype_name: "Define Verification Points",
    action_type: "Structural",
    description: "Define what supervisors must verify at each stage.",
    applicable_root_cause_ids: ["rc-mp008"],
    applicable_industries: "All",
    consultant_required: "Sometimes"
  },
  {
    archetype_id: "ra-st-inventory-001",
    archetype_name: "Barcode System Implementation",
    action_type: "Structural",
    description: "Implement barcode or bin location system for fast-moving items.",
    applicable_root_cause_ids: ["rc-mt001"],
    applicable_industries: "All",
    consultant_required: "Sometimes"
  },
  {
    archetype_id: "ra-st-supplier-001",
    archetype_name: "Penalty Clauses in Contracts",
    action_type: "Structural",
    description: "Set penalty clauses in supplier contracts for late delivery.",
    applicable_root_cause_ids: ["rc-mt002"],
    applicable_industries: "All",
    consultant_required: "Sometimes"
  },
  {
    archetype_id: "ra-st-overstock-001",
    archetype_name: "Maximum Stock Levels",
    action_type: "Structural",
    description: "Set maximum stock levels based on actual consumption rate.",
    applicable_root_cause_ids: ["rc-mt003"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-st-waste-001",
    archetype_name: "Match Order to Consumption",
    action_type: "Structural",
    description: "Match order quantities to actual consumption patterns.",
    applicable_root_cause_ids: ["rc-mt004"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-st-quality-001",
    archetype_name: "Quality Requirements in PO",
    action_type: "Structural",
    description: "Specify quality requirements in purchase orders with samples.",
    applicable_root_cause_ids: ["rc-mt005"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-st-singlesource-001",
    archetype_name: "Split Orders Between Suppliers",
    action_type: "Structural",
    description: "Split orders between two suppliers to maintain relationships.",
    applicable_root_cause_ids: ["rc-mt006"],
    applicable_industries: "All",
    consultant_required: "Sometimes"
  },
  {
    archetype_id: "ra-st-forecast-001",
    archetype_name: "Pipeline-Based Forecast",
    action_type: "Structural",
    description: "Build forecast from sales pipeline and historical patterns.",
    applicable_root_cause_ids: ["rc-mt007"],
    applicable_industries: "All",
    consultant_required: "Sometimes"
  },
  {
    archetype_id: "ra-st-storage-001",
    archetype_name: "Label Storage Requirements",
    action_type: "Structural",
    description: "Label storage areas with handling requirements.",
    applicable_root_cause_ids: ["rc-mt008"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-st-breakdown-001",
    archetype_name: "Budget Equipment Replacement",
    action_type: "Structural",
    description: "Budget for replacement of highest-failure equipment.",
    applicable_root_cause_ids: ["rc-mc001"],
    applicable_industries: "All",
    consultant_required: "Yes"
  },
  {
    archetype_id: "ra-st-maintenance-001",
    archetype_name: "Maintenance Calendar",
    action_type: "Structural",
    description: "Create maintenance calendar based on manufacturer intervals.",
    applicable_root_cause_ids: ["rc-mc002"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-st-legacy-001",
    archetype_name: "Middleware Implementation",
    action_type: "Structural",
    description: "Implement middleware to connect legacy to modern systems.",
    applicable_root_cause_ids: ["rc-mc003"],
    applicable_industries: "All",
    consultant_required: "Yes"
  },
  {
    archetype_id: "ra-st-bottleneck-001",
    archetype_name: "Add Bottleneck Capacity",
    action_type: "Structural",
    description: "Add capacity at bottleneck with second unit or upgrade.",
    applicable_root_cause_ids: ["rc-mc004"],
    applicable_industries: ["Manufacturing", "F&B", "Logistics"],
    consultant_required: "Yes"
  },
  {
    archetype_id: "ra-st-utilization-001",
    archetype_name: "Minimize Idle Scheduling",
    action_type: "Structural",
    description: "Schedule equipment to minimize idle time between jobs.",
    applicable_root_cause_ids: ["rc-mc005"],
    applicable_industries: "All",
    consultant_required: "Sometimes"
  },
  {
    archetype_id: "ra-st-calibration-001",
    archetype_name: "Calibration Schedule",
    action_type: "Structural",
    description: "Set calibration schedule with documented tolerance limits.",
    applicable_root_cause_ids: ["rc-mc006"],
    applicable_industries: ["Manufacturing", "Healthcare", "F&B"],
    consultant_required: "No"
  },
  {
    archetype_id: "ra-st-sop-001",
    archetype_name: "Document Critical Tasks",
    action_type: "Structural",
    description: "Document all critical tasks with step-by-step instructions.",
    applicable_root_cause_ids: ["rc-mc007"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-st-tech-001",
    archetype_name: "Invest in Error Reduction",
    action_type: "Structural",
    description: "Invest in technology for tasks with highest error rates.",
    applicable_root_cause_ids: ["rc-mc008"],
    applicable_industries: "All",
    consultant_required: "Yes"
  },

  // ============================================
  // PREVENTION ARCHETYPES
  // ============================================
  {
    archetype_id: "ra-pr-cashflow-001",
    archetype_name: "Same Day Invoicing",
    action_type: "Prevention",
    description: "Invoice same day as delivery with clear due dates.",
    applicable_root_cause_ids: ["rc-m001"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-cost-001",
    archetype_name: "Job Completion Review",
    action_type: "Prevention",
    description: "Compare actual vs budget at job completion before starting new work.",
    applicable_root_cause_ids: ["rc-m002"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-budget-001",
    archetype_name: "Quarterly Budget Lock",
    action_type: "Prevention",
    description: "Lock budgets quarterly with formal change requests required.",
    applicable_root_cause_ids: ["rc-m003"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-credit-001",
    archetype_name: "COD for Slow Payers",
    action_type: "Prevention",
    description: "Move slow payers to cash-on-delivery terms.",
    applicable_root_cause_ids: ["rc-m004"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-pricing-001",
    archetype_name: "Quarterly Pricing Review",
    action_type: "Prevention",
    description: "Review pricing quarterly against material and labor cost changes.",
    applicable_root_cause_ids: ["rc-m005"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-debt-001",
    archetype_name: "Earnings-First Growth",
    action_type: "Prevention",
    description: "Fund growth from retained earnings before taking new debt.",
    applicable_root_cause_ids: ["rc-m006"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-cash-001",
    archetype_name: "Daily Banking with Handover",
    action_type: "Prevention",
    description: "Bank cash daily with documented handover between shifts.",
    applicable_root_cause_ids: ["rc-m007"],
    applicable_industries: ["Retail", "F&B", "Hospitality"],
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-growth-001",
    archetype_name: "Match Growth to Cash",
    action_type: "Prevention",
    description: "Match growth rate to cash generation capacity.",
    applicable_root_cause_ids: ["rc-m008"],
    applicable_industries: "All",
    consultant_required: "Sometimes"
  },
  {
    archetype_id: "ra-pr-training-001",
    archetype_name: "Certification Before Independence",
    action_type: "Prevention",
    description: "Certify staff on procedures before allowing independent work.",
    applicable_root_cause_ids: ["rc-mp001"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-turnover-001",
    archetype_name: "Internal Promotion Path",
    action_type: "Prevention",
    description: "Promote from within with structured handover periods.",
    applicable_root_cause_ids: ["rc-mp002"],
    applicable_industries: "All",
    consultant_required: "Sometimes"
  },
  {
    archetype_id: "ra-pr-ownership-001",
    archetype_name: "24-Hour Dispute Resolution",
    action_type: "Prevention",
    description: "Resolve ownership disputes within 24 hours at management level.",
    applicable_root_cause_ids: ["rc-mp003"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-knowledge-001",
    archetype_name: "Procedure Video Recording",
    action_type: "Prevention",
    description: "Record how-to videos for complex procedures.",
    applicable_root_cause_ids: ["rc-mp004"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-standards-001",
    archetype_name: "Staff Rotation",
    action_type: "Prevention",
    description: "Rotate staff between teams to spread good practices.",
    applicable_root_cause_ids: ["rc-mp005"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-comms-001",
    archetype_name: "Early Department Inclusion",
    action_type: "Prevention",
    description: "Include affected departments at project start, not at handover.",
    applicable_root_cause_ids: ["rc-mp006"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-staffing-001",
    archetype_name: "Demand-Based Scheduling",
    action_type: "Prevention",
    description: "Schedule shifts based on historical demand patterns.",
    applicable_root_cause_ids: ["rc-mp007"],
    applicable_industries: ["Hospitality", "Retail", "F&B", "Healthcare"],
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-supervision-001",
    archetype_name: "Output-Based Accountability",
    action_type: "Prevention",
    description: "Hold supervisors accountable for team output, not just attendance.",
    applicable_root_cause_ids: ["rc-mp008"],
    applicable_industries: "All",
    consultant_required: "Sometimes"
  },
  {
    archetype_id: "ra-pr-inventory-001",
    archetype_name: "Update at Every Movement",
    action_type: "Prevention",
    description: "Require stock update at every movement in and out.",
    applicable_root_cause_ids: ["rc-mt001"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-supplier-001",
    archetype_name: "Backup Supplier Qualification",
    action_type: "Prevention",
    description: "Qualify backup supplier for critical materials.",
    applicable_root_cause_ids: ["rc-mt002"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-overstock-001",
    archetype_name: "Data-Based Ordering",
    action_type: "Prevention",
    description: "Order based on usage data, not gut feel or supplier deals.",
    applicable_root_cause_ids: ["rc-mt003"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-waste-001",
    archetype_name: "Proper Storage and Labeling",
    action_type: "Prevention",
    description: "Store materials in correct conditions with clear labeling.",
    applicable_root_cause_ids: ["rc-mt004"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-quality-001",
    archetype_name: "Inspect Before Acceptance",
    action_type: "Prevention",
    description: "Inspect before accepting delivery into inventory.",
    applicable_root_cause_ids: ["rc-mt005"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-singlesource-001",
    archetype_name: "Regular Backup Testing",
    action_type: "Prevention",
    description: "Test backup suppliers regularly with small orders.",
    applicable_root_cause_ids: ["rc-mt006"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-forecast-001",
    archetype_name: "Monthly Forecast vs Actual",
    action_type: "Prevention",
    description: "Compare forecast to actual each month and adjust method.",
    applicable_root_cause_ids: ["rc-mt007"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-storage-001",
    archetype_name: "Handling Training Before Work",
    action_type: "Prevention",
    description: "Train new staff on handling before they touch inventory.",
    applicable_root_cause_ids: ["rc-mt008"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-breakdown-001",
    archetype_name: "Early Retirement Policy",
    action_type: "Prevention",
    description: "Retire equipment before it becomes unreliable.",
    applicable_root_cause_ids: ["rc-mc001"],
    applicable_industries: "All",
    consultant_required: "Sometimes"
  },
  {
    archetype_id: "ra-pr-maintenance-001",
    archetype_name: "Lockout for Overdue Maintenance",
    action_type: "Prevention",
    description: "Lock equipment from use when maintenance is overdue.",
    applicable_root_cause_ids: ["rc-mc002"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-legacy-001",
    archetype_name: "Integration Requirements",
    action_type: "Prevention",
    description: "Include integration requirements in all new system purchases.",
    applicable_root_cause_ids: ["rc-mc003"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-bottleneck-001",
    archetype_name: "Balance Line Capacity",
    action_type: "Prevention",
    description: "Balance line capacity so no single point limits output.",
    applicable_root_cause_ids: ["rc-mc004"],
    applicable_industries: ["Manufacturing", "F&B", "Logistics"],
    consultant_required: "Yes"
  },
  {
    archetype_id: "ra-pr-utilization-001",
    archetype_name: "Redeploy Idle Equipment",
    action_type: "Prevention",
    description: "Sell or redeploy equipment sitting idle more than 50%.",
    applicable_root_cause_ids: ["rc-mc005"],
    applicable_industries: "All",
    consultant_required: "Sometimes"
  },
  {
    archetype_id: "ra-pr-calibration-001",
    archetype_name: "Stop for Out-of-Spec",
    action_type: "Prevention",
    description: "Stop production if calibration is overdue or out of spec.",
    applicable_root_cause_ids: ["rc-mc006"],
    applicable_industries: ["Manufacturing", "Healthcare", "F&B"],
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-sop-001",
    archetype_name: "Procedure Update on Change",
    action_type: "Prevention",
    description: "Review and update procedures when equipment or process changes.",
    applicable_root_cause_ids: ["rc-mc007"],
    applicable_industries: "All",
    consultant_required: "No"
  },
  {
    archetype_id: "ra-pr-tech-001",
    archetype_name: "Productivity-Based Decisions",
    action_type: "Prevention",
    description: "Include productivity gains in all technology purchase decisions.",
    applicable_root_cause_ids: ["rc-mc008"],
    applicable_industries: "All",
    consultant_required: "No"
  }
];

export function getArchetypeById(id: string): RecommendationArchetype | undefined {
  return recommendationArchetypes.find(a => a.archetype_id === id);
}

export function getArchetypesByRootCauseId(rootCauseId: string): RecommendationArchetype[] {
  return recommendationArchetypes.filter(a => 
    a.applicable_root_cause_ids.includes(rootCauseId)
  );
}

export function getArchetypesByActionType(actionType: ActionType): RecommendationArchetype[] {
  return recommendationArchetypes.filter(a => a.action_type === actionType);
}

export function getArchetypesByIndustry(industry: string): RecommendationArchetype[] {
  return recommendationArchetypes.filter(a => 
    a.applicable_industries === "All" || 
    a.applicable_industries.includes(industry)
  );
}

export function getConsultantRequiredArchetypes(): RecommendationArchetype[] {
  return recommendationArchetypes.filter(a => a.consultant_required === "Yes");
}
