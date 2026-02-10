import type { ProblemLibraryEntry, DiagnosticCategory, FourMCategory, ManagementIndicator } from "./schema";

// RCI Problem Library - Comprehensive operational problems organized by 8 Diagnostic Categories
// Based on decades of Redhawk Consulting experience helping SMEs

export const problemLibrary: ProblemLibraryEntry[] = [
  // ============================================
  // CATEGORY 1: FINANCIAL CONTROL (Money)
  // ============================================
  {
    id: "fin-001",
    title: "Poor Budget Planning",
    description: "Budgets are inaccurate, unrealistic, or not followed, leading to unexpected cost overruns and cash flow problems.",
    diagnosticCategory: "financial_control",
    dominantM: "Money",
    indicator: "Money Indicator",
    commonCauses: [
      "No historical data used for planning",
      "Unrealistic revenue projections",
      "Hidden costs not accounted for",
      "No regular budget reviews"
    ],
    impactNotes: { cost: "5-15% cost overruns", time: "Hours spent on emergency cash management", efficiency: "Delayed projects due to funding gaps" }
  },
  {
    id: "fin-002",
    title: "Weak Credit Control",
    description: "Customers pay late or don't pay at all, causing cash flow problems and increased bad debts.",
    diagnosticCategory: "financial_control",
    dominantM: "Money",
    indicator: "Money Indicator",
    commonCauses: [
      "No credit checks on new customers",
      "Invoice follow-up is inconsistent",
      "Payment terms too generous",
      "No consequence for late payment"
    ],
    impactNotes: { cost: "2-5% revenue tied up in receivables", time: "Staff time chasing payments", efficiency: "Working capital shortage" }
  },
  {
    id: "fin-003",
    title: "Inadequate Financial Records",
    description: "Financial records are incomplete, outdated, or poorly organized, making it impossible to know the true financial position.",
    diagnosticCategory: "financial_control",
    dominantM: "Money",
    indicator: "Money Indicator",
    commonCauses: [
      "Manual record-keeping with errors",
      "Delayed data entry",
      "No reconciliation process",
      "Staff not trained on financial systems"
    ],
    impactNotes: { cost: "Unknown losses due to poor visibility", time: "Hours searching for information", efficiency: "Poor decision-making from bad data" }
  },
  {
    id: "fin-004",
    title: "Over-Borrowing or Excessive Credit",
    description: "Business relies too heavily on borrowed money, creating high interest costs and repayment pressure.",
    diagnosticCategory: "financial_control",
    dominantM: "Money",
    indicator: "Money Indicator",
    commonCauses: [
      "Growth funded by debt instead of profits",
      "Poor cash flow management",
      "High interest rates on existing loans",
      "No debt reduction plan"
    ],
    impactNotes: { cost: "High interest expenses eating profits", time: "Management time on lender negotiations", efficiency: "Limited flexibility for growth" }
  },
  {
    id: "fin-005",
    title: "Loose Control of Cash and Liquid Assets",
    description: "Cash and valuable assets are not properly tracked, leading to losses, theft, or misuse.",
    diagnosticCategory: "financial_control",
    dominantM: "Money",
    indicator: "Money Indicator",
    commonCauses: [
      "No petty cash controls",
      "Multiple people with access to cash",
      "No regular cash counts",
      "Expenses not properly approved"
    ],
    impactNotes: { cost: "Cash shrinkage and theft", time: "Time investigating discrepancies", efficiency: "Trust issues affecting morale" }
  },
  {
    id: "fin-006",
    title: "Under-Pricing of Products or Services",
    description: "Prices are set too low, failing to cover true costs and leaving no profit margin.",
    diagnosticCategory: "financial_control",
    dominantM: "Money",
    indicator: "Money Indicator",
    commonCauses: [
      "True costs not calculated correctly",
      "Overhead not included in pricing",
      "Fear of losing customers to competitors",
      "No regular price reviews"
    ],
    impactNotes: { cost: "Lost profit on every sale", time: "High effort for low returns", efficiency: "Unsustainable business model" }
  },
  {
    id: "fin-007",
    title: "Growth Without Adequate Capital",
    description: "Business is expanding faster than cash flow can support, creating dangerous cash shortages.",
    diagnosticCategory: "financial_control",
    dominantM: "Money",
    indicator: "Money Indicator",
    commonCauses: [
      "Taking on large orders without working capital",
      "Expanding locations before profitable",
      "Hiring ahead of revenue",
      "No growth funding strategy"
    ],
    impactNotes: { cost: "Emergency funding at high rates", time: "Crisis management", efficiency: "Failed expansion damaging reputation" }
  },

  // ============================================
  // CATEGORY 2: INVENTORY & MATERIALS
  // ============================================
  {
    id: "mat-001",
    title: "Poor Stock Control",
    description: "Stock levels are inaccurate, leading to stockouts or excess inventory tying up cash.",
    diagnosticCategory: "inventory_materials",
    dominantM: "Materials",
    indicator: "Material Indicator",
    commonCauses: [
      "No stock management system",
      "Stock not counted regularly",
      "Multiple storage locations",
      "No minimum stock levels set"
    ],
    impactNotes: { cost: "Capital tied up in excess stock", time: "Lost sales from stockouts", efficiency: "Production delays from missing materials" }
  },
  {
    id: "mat-002",
    title: "Missing or Mislabeled Stock",
    description: "Items cannot be found because they're in the wrong location, wrongly labeled, or have no identification.",
    diagnosticCategory: "inventory_materials",
    dominantM: "Materials",
    indicator: "Material Indicator",
    commonCauses: [
      "No labeling system",
      "Items moved without updating records",
      "Overcrowded storage areas",
      "Staff not following put-away procedures"
    ],
    impactNotes: { cost: "Re-purchasing items already in stock", time: "Hours searching for items", efficiency: "Production delays" }
  },
  {
    id: "mat-003",
    title: "High Scrap and Wastage",
    description: "Too much raw material is being wasted as scrap, spoilage, or rejected output.",
    diagnosticCategory: "inventory_materials",
    dominantM: "Materials",
    indicator: "Material Indicator",
    commonCauses: [
      "Poor quality raw materials",
      "Operator errors in handling",
      "Machine settings incorrect",
      "Materials stored improperly"
    ],
    impactNotes: { cost: "Material costs wasted", time: "Rework time", efficiency: "Lower output from same input" }
  },
  {
    id: "mat-004",
    title: "Low Material-to-Finished Goods Conversion",
    description: "Too little finished product is being produced from the raw materials used.",
    diagnosticCategory: "inventory_materials",
    dominantM: "Materials",
    indicator: "Material Indicator",
    commonCauses: [
      "Inefficient cutting or processing methods",
      "Poor quality raw materials requiring trimming",
      "Outdated recipes or formulas",
      "No measurement of conversion rates"
    ],
    impactNotes: { cost: "Lost value in unconverted materials", time: "Extra processing time", efficiency: "Higher unit costs" }
  },
  {
    id: "mat-005",
    title: "Material Not Pre-Staged",
    description: "Workers finish a job and sit idle because the next materials or work inputs are not ready.",
    diagnosticCategory: "inventory_materials",
    dominantM: "Materials",
    indicator: "Material Indicator",
    commonCauses: [
      "No production scheduling coordination",
      "Store staff not aware of production schedule",
      "Materials kept too far from work stations",
      "No standard work preparation procedure"
    ],
    impactNotes: { cost: "Labor cost for idle time", time: "15-30 minutes per incident", efficiency: "Lower daily output" }
  },
  {
    id: "mat-006",
    title: "Waiting for Material Movement",
    description: "Production waits while raw materials or finished goods are being moved between areas.",
    diagnosticCategory: "inventory_materials",
    dominantM: "Materials",
    indicator: "Material Indicator",
    commonCauses: [
      "Insufficient material handling equipment",
      "Poor factory layout requiring long movements",
      "Material handlers assigned to other tasks",
      "No scheduled material delivery runs"
    ],
    impactNotes: { cost: "Idle labor and equipment", time: "Multiple waits daily", efficiency: "Reduced throughput" }
  },
  {
    id: "mat-007",
    title: "Needed Material Out of Stock",
    description: "Production stops because required materials were not ordered or delivery was not followed up.",
    diagnosticCategory: "inventory_materials",
    dominantM: "Materials",
    indicator: "Material Indicator",
    commonCauses: [
      "No reorder point system",
      "Purchase orders not followed up",
      "Supplier lead times not considered",
      "No safety stock for critical items"
    ],
    impactNotes: { cost: "Rush order premiums, idle labor", time: "Production downtime", efficiency: "Missed delivery dates" }
  },
  {
    id: "mat-008",
    title: "Inaccurate Inventory Data",
    description: "System shows different quantities than actual physical stock, causing planning errors.",
    diagnosticCategory: "inventory_materials",
    dominantM: "Materials",
    indicator: "Material Indicator",
    commonCauses: [
      "Transactions not recorded promptly",
      "Damaged goods not written off",
      "Returns not processed correctly",
      "Multiple systems not synchronized"
    ],
    impactNotes: { cost: "Phantom stock causing stockouts", time: "Time investigating discrepancies", efficiency: "Poor production planning" }
  },
  {
    id: "mat-009",
    title: "Supplier Reliability Issues",
    description: "Suppliers deliver late, deliver wrong quantities, or provide inconsistent quality materials.",
    diagnosticCategory: "inventory_materials",
    dominantM: "Materials",
    indicator: "Material Indicator",
    commonCauses: [
      "Over-reliance on single supplier",
      "No supplier performance tracking",
      "Poor communication of requirements",
      "Choosing suppliers on price alone"
    ],
    impactNotes: { cost: "Production disruption costs", time: "Management time resolving issues", efficiency: "Unpredictable production" }
  },

  // ============================================
  // CATEGORY 3: PRODUCTION EFFICIENCY
  // ============================================
  {
    id: "prod-001",
    title: "Recurring Machine Breakdowns",
    description: "Machines break down frequently, causing production stoppages and missed deadlines.",
    diagnosticCategory: "production_efficiency",
    dominantM: "Machinery",
    indicator: "Machine Indicator",
    commonCauses: [
      "No preventive maintenance schedule",
      "Equipment past service life",
      "Operators not trained on proper use",
      "Spare parts not available"
    ],
    impactNotes: { cost: "Repair costs plus lost production", time: "Hours to days per breakdown", efficiency: "Unpredictable output" }
  },
  {
    id: "prod-002",
    title: "Low Machine Utilisation",
    description: "Machines sit idle or run at reduced capacity, not producing at their potential.",
    diagnosticCategory: "production_efficiency",
    dominantM: "Machinery",
    indicator: "Machine Indicator",
    commonCauses: [
      "Poor production scheduling",
      "Waiting for materials or operators",
      "Long changeover times between products",
      "Insufficient orders to fill capacity"
    ],
    impactNotes: { cost: "Fixed costs spread over less output", time: "Wasted capacity", efficiency: "Higher unit costs" }
  },
  {
    id: "prod-003",
    title: "Long Waiting Between Processes",
    description: "Work sits idle between production steps, extending lead times unnecessarily.",
    diagnosticCategory: "production_efficiency",
    dominantM: "Machinery",
    indicator: "Machine Indicator",
    commonCauses: [
      "Unbalanced line capacities",
      "Batch processing creating queues",
      "No flow between work stations",
      "Inspection bottlenecks"
    ],
    impactNotes: { cost: "Work-in-progress tying up cash", time: "Extended lead times", efficiency: "Customer delivery delays" }
  },
  {
    id: "prod-004",
    title: "Line Imbalance or Mismatched Capacities",
    description: "Some workstations are overloaded while others wait, creating bottlenecks and hidden idle time.",
    diagnosticCategory: "production_efficiency",
    dominantM: "Machinery",
    indicator: "Machine Indicator",
    commonCauses: [
      "Line not designed for current products",
      "Staff deployed without considering capacity",
      "One slow process limiting entire line",
      "No measurement of individual station output"
    ],
    impactNotes: { cost: "Paying for more capacity than you use", time: "Lost output from bottlenecks", efficiency: "Frustration and low morale" }
  },
  {
    id: "prod-005",
    title: "Slow Maintenance Response",
    description: "When machines break or need attention, maintenance takes too long to respond.",
    diagnosticCategory: "production_efficiency",
    dominantM: "Machinery",
    indicator: "Machine Indicator",
    commonCauses: [
      "Maintenance staff doing other tasks",
      "No way to quickly report breakdowns",
      "Spare parts not immediately available",
      "Maintenance prioritizing wrong jobs"
    ],
    impactNotes: { cost: "Every minute of downtime costs money", time: "Extended production stoppages", efficiency: "Operator frustration" }
  },
  {
    id: "prod-006",
    title: "Improper Machine Scheduling",
    description: "Work is scheduled without considering machine capabilities, changeovers, or optimal sequencing.",
    diagnosticCategory: "production_efficiency",
    dominantM: "Machinery",
    indicator: "Machine Indicator",
    commonCauses: [
      "Scheduler not familiar with production",
      "No production planning system",
      "Rush orders disrupting schedule",
      "Sales making delivery promises without checking capacity"
    ],
    impactNotes: { cost: "Excessive changeover costs", time: "Chaos on production floor", efficiency: "Missed deliveries" }
  },
  {
    id: "prod-007",
    title: "No Daily Production Plan",
    description: "Each day starts without a clear plan of what to produce, in what sequence, or who does what.",
    diagnosticCategory: "production_efficiency",
    dominantM: "Machinery",
    indicator: "Machine Indicator",
    commonCauses: [
      "Reactive rather than planned production",
      "No production planning function",
      "Schedule changes constantly",
      "Supervisor decides on the fly"
    ],
    impactNotes: { cost: "Lost output from confusion", time: "Time finding out what to do", efficiency: "Low morale and motivation" }
  },
  {
    id: "prod-008",
    title: "Excessive Setup or Changeover Time",
    description: "Too much time is spent changing machines between different products or jobs.",
    diagnosticCategory: "production_efficiency",
    dominantM: "Machinery",
    indicator: "Machine Indicator",
    commonCauses: [
      "No standardized changeover process",
      "Tools and materials not prepared in advance",
      "One person doing changeover alone",
      "Equipment not designed for quick changes"
    ],
    impactNotes: { cost: "Lost production during changeovers", time: "Could save 30-50% of changeover time", efficiency: "More flexibility for small batches" }
  },

  // ============================================
  // CATEGORY 4: WORKFORCE
  // ============================================
  {
    id: "wf-001",
    title: "Poorly Trained Workers",
    description: "Staff lack the skills to do their jobs efficiently, working slowly and making mistakes.",
    diagnosticCategory: "workforce",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "No formal training program",
      "Learning by watching only",
      "Training not updated for new products",
      "No skills assessment"
    ],
    impactNotes: { cost: "Lower productivity and more errors", time: "Weeks to become productive", efficiency: "50-70% of experienced worker output" }
  },
  {
    id: "wf-002",
    title: "Weak Supervision",
    description: "Supervisors are absent, unavailable, or don't provide the direction workers need.",
    diagnosticCategory: "workforce",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "Supervisor doing operator work instead",
      "Too many people to supervise",
      "Supervisor not trained to lead",
      "No clear supervisor responsibilities"
    ],
    impactNotes: { cost: "Lost productivity from unsupervised work", time: "Worker time waiting for decisions", efficiency: "Problems not caught early" }
  },
  {
    id: "wf-003",
    title: "Poor Work Discipline",
    description: "Workers take excessive breaks, leave early, chat instead of working, or don't follow rules.",
    diagnosticCategory: "workforce",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "No clear expectations set",
      "Rules not enforced consistently",
      "No consequence for poor discipline",
      "Low morale or engagement"
    ],
    impactNotes: { cost: "Paying for time not worked", time: "5-15% of work time lost", efficiency: "Negative impact on good workers" }
  },
  {
    id: "wf-004",
    title: "Workers Looking for Work",
    description: "Employees wander around looking for their next task, supervisor, or materials.",
    diagnosticCategory: "workforce",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "No work assignment system",
      "Work not prepared in advance",
      "Supervisor not available to assign work",
      "Poor communication of priorities"
    ],
    impactNotes: { cost: "Compound effect - lost time multiplies", time: "10-30 minutes per incident", efficiency: "Disruption to other workers" }
  },
  {
    id: "wf-005",
    title: "Lack of Cross-Training",
    description: "Workers can only do one job, creating bottlenecks when absent and limiting flexibility.",
    diagnosticCategory: "workforce",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "No training plan beyond current job",
      "Workers resistant to learning new skills",
      "No incentive for multi-skilling",
      "Short-term focus on immediate output"
    ],
    impactNotes: { cost: "Overtime when key person absent", time: "Bottlenecks when skills unavailable", efficiency: "Reduced flexibility" }
  },
  {
    id: "wf-006",
    title: "Loss of Key Personnel",
    description: "Critical staff members leave, taking important knowledge and skills with them.",
    diagnosticCategory: "workforce",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "No retention efforts for key staff",
      "Salary below market rate",
      "Limited career development",
      "Poor working conditions"
    ],
    impactNotes: { cost: "Recruitment and training costs", time: "Months to replace specialized skills", efficiency: "Knowledge loss affecting quality" }
  },
  {
    id: "wf-007",
    title: "Over-Staffed Positions",
    description: "More workers assigned to a task than needed, hiding inefficiency and wasting labor cost.",
    diagnosticCategory: "workforce",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "No measurement of labor needs",
      "Historical staffing never questioned",
      "Hiding other problems with extra people",
      "Avoiding conflict by not reducing staff"
    ],
    impactNotes: { cost: "Paying for unnecessary labor", time: "Hidden inefficiency", efficiency: "Workers filling time not adding value" }
  },
  {
    id: "wf-008",
    title: "No Work Reassignment",
    description: "When workers finish their task early or their area is slow, they sit idle instead of helping elsewhere.",
    diagnosticCategory: "workforce",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "Workers only trained on one job",
      "Supervisor not aware of idle time",
      "No system for reassigning work",
      "Workers resist helping other areas"
    ],
    impactNotes: { cost: "Idle labor cost", time: "Lost productive hours", efficiency: "Imbalanced workload" }
  },

  // ============================================
  // CATEGORY 5: QUALITY
  // ============================================
  {
    id: "qual-001",
    title: "High Rework Rate",
    description: "Too many products need to be fixed or redone because they didn't meet quality standards first time.",
    diagnosticCategory: "quality",
    dominantM: "Materials",
    indicator: "Material Indicator",
    commonCauses: [
      "Unclear quality standards",
      "Operator errors not caught early",
      "Poor raw material quality",
      "Equipment not calibrated properly"
    ],
    impactNotes: { cost: "Double labor cost for reworked items", time: "Extended lead times", efficiency: "Capacity lost to fixing problems" }
  },
  {
    id: "qual-002",
    title: "Missed Quality Checks",
    description: "Quality inspections are skipped or rushed, allowing defects to reach customers.",
    diagnosticCategory: "quality",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "Pressure to meet output targets",
      "Inspection seen as slowing production",
      "No checklist or procedure",
      "Inspector not skilled enough"
    ],
    impactNotes: { cost: "Customer returns and complaints", time: "Time handling quality escapes", efficiency: "Damaged customer relationships" }
  },
  {
    id: "qual-003",
    title: "Wrong Specifications or Blueprints",
    description: "Production works to incorrect or outdated specifications, creating wrong products.",
    diagnosticCategory: "quality",
    dominantM: "Materials",
    indicator: "Material Indicator",
    commonCauses: [
      "Old specs not replaced",
      "Changes not communicated",
      "Multiple versions in circulation",
      "No document control system"
    ],
    impactNotes: { cost: "Scrapped production", time: "Time making wrong product", efficiency: "Delayed correct production" }
  },
  {
    id: "qual-004",
    title: "Poor Customer Handling",
    description: "Staff are rude, unhelpful, or ignore customers, damaging the company's reputation.",
    diagnosticCategory: "quality",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "No customer service training",
      "Staff stressed or overworked",
      "No standards for customer interaction",
      "Hiring without checking customer skills"
    ],
    impactNotes: { cost: "Lost customers and sales", time: "Management time handling complaints", efficiency: "Staff turnover from stress" }
  },
  {
    id: "qual-005",
    title: "Incorrect Machine Settings",
    description: "Machines run with wrong settings, producing out-of-spec products.",
    diagnosticCategory: "quality",
    dominantM: "Machinery",
    indicator: "Machine Indicator",
    commonCauses: [
      "Settings not documented for each product",
      "Operators not trained on adjustments",
      "Settings changed without authorization",
      "No verification after changeover"
    ],
    impactNotes: { cost: "Defective production run", time: "Detection and correction time", efficiency: "Lost output" }
  },

  // ============================================
  // CATEGORY 6: SALES & CUSTOMER
  // ============================================
  {
    id: "sales-001",
    title: "Declining Sales Momentum",
    description: "Sales have slowed or plateaued, with less energy and activity in the sales process.",
    diagnosticCategory: "sales_customer",
    dominantM: "Money",
    indicator: "Money Indicator",
    commonCauses: [
      "Sales team complacent",
      "No new lead generation",
      "Product becoming outdated",
      "Competitors gaining ground"
    ],
    impactNotes: { cost: "Revenue decline", time: "Takes months to rebuild momentum", efficiency: "Underutilized capacity" }
  },
  {
    id: "sales-002",
    title: "Weak Customer Relationships",
    description: "Customer relationships are transactional, with little loyalty or repeat business.",
    diagnosticCategory: "sales_customer",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "No follow-up after sale",
      "Issues not resolved satisfactorily",
      "No personal relationship building",
      "Customers feel like a number"
    ],
    impactNotes: { cost: "Lost repeat sales", time: "Cost of acquiring new customers", efficiency: "Lower lifetime value" }
  },
  {
    id: "sales-003",
    title: "Lack of Product Knowledge",
    description: "Sales staff don't know the products well enough to answer customer questions or sell effectively.",
    diagnosticCategory: "sales_customer",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "No product training for sales team",
      "Product range too wide to know all",
      "Product changes not communicated",
      "Sales hired for personality not knowledge"
    ],
    impactNotes: { cost: "Lost sales from poor answers", time: "Time finding information", efficiency: "Reduced confidence in selling" }
  },
  {
    id: "sales-004",
    title: "Ignoring Competition",
    description: "Company is not aware of or responding to competitive threats.",
    diagnosticCategory: "sales_customer",
    dominantM: "Money",
    indicator: "Money Indicator",
    commonCauses: [
      "Complacency from past success",
      "No competitor monitoring",
      "Believing we're always the best",
      "Internal focus instead of market focus"
    ],
    impactNotes: { cost: "Market share loss", time: "Time to catch up once behind", efficiency: "Wasted investment in wrong areas" }
  },
  {
    id: "sales-005",
    title: "Failure to Anticipate Market Trends",
    description: "Company is caught off guard by changes in customer preferences or market conditions.",
    diagnosticCategory: "sales_customer",
    dominantM: "Money",
    indicator: "Money Indicator",
    commonCauses: [
      "No market research",
      "Not listening to customer feedback",
      "Too focused on current products",
      "Slow to adapt to change"
    ],
    impactNotes: { cost: "Investment in obsolete products", time: "Time to pivot", efficiency: "Missed opportunities" }
  },

  // ============================================
  // CATEGORY 7: STRATEGIC & MANAGEMENT
  // ============================================
  {
    id: "strat-001",
    title: "Inability to Make Decisions",
    description: "Management delays or avoids making important decisions, causing paralysis.",
    diagnosticCategory: "strategic_management",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "Fear of making mistakes",
      "No clear decision authority",
      "Too many people involved",
      "Analysis paralysis"
    ],
    impactNotes: { cost: "Opportunities missed", time: "Delays cascade through organization", efficiency: "Frustration and disengagement" }
  },
  {
    id: "strat-002",
    title: "Management Complacency",
    description: "Success has led to complacency, with management not pushing for improvement.",
    diagnosticCategory: "strategic_management",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "Past success breeds comfort",
      "No burning platform for change",
      "Leadership not challenging status quo",
      "Metrics not showing decline yet"
    ],
    impactNotes: { cost: "Gradual decline in competitiveness", time: "Years to recognize problem", efficiency: "Erosion of capabilities" }
  },
  {
    id: "strat-003",
    title: "Poor Interdepartmental Communication",
    description: "Departments don't share information, causing confusion and working at cross purposes.",
    diagnosticCategory: "strategic_management",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "Silos and turf protection",
      "No cross-functional meetings",
      "Information seen as power",
      "Physical separation of departments"
    ],
    impactNotes: { cost: "Rework from miscommunication", time: "Delays waiting for information", efficiency: "Duplicated efforts" }
  },
  {
    id: "strat-004",
    title: "System Non-Compliance",
    description: "Staff don't follow established systems and procedures, leading to inconsistency and errors.",
    diagnosticCategory: "strategic_management",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "Systems too complicated",
      "Training inadequate",
      "No enforcement of compliance",
      "Workarounds become normal"
    ],
    impactNotes: { cost: "Errors and inconsistency", time: "Time correcting problems", efficiency: "Systems not delivering value" }
  },
  {
    id: "strat-005",
    title: "No Performance Expectations",
    description: "Workers don't know what's expected of them or how their performance is measured.",
    diagnosticCategory: "strategic_management",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "Job descriptions outdated or missing",
      "No performance metrics",
      "Feedback never given",
      "Managers avoid difficult conversations"
    ],
    impactNotes: { cost: "Underperformance tolerated", time: "Time managing ambiguity", efficiency: "Low motivation and engagement" }
  },

  // ============================================
  // CATEGORY 8: WORK EXECUTION
  // ============================================
  {
    id: "exec-001",
    title: "Running Wrong Product",
    description: "Production runs excess of one product while another critical product waits in backlog.",
    diagnosticCategory: "work_execution",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "Production not following schedule",
      "Operators choosing easier products",
      "No visibility of priorities",
      "Changeover avoidance"
    ],
    impactNotes: { cost: "Overtime to catch up on urgent items", time: "Missed delivery dates", efficiency: "Customer dissatisfaction" }
  },
  {
    id: "exec-002",
    title: "Poorly Set Up Workstations",
    description: "Work stations lack materials, tools, or supplies, causing workers to walk away frequently.",
    diagnosticCategory: "work_execution",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "No standard layout for workstations",
      "Materials stored far from point of use",
      "Tools missing or borrowed",
      "No restocking process"
    ],
    impactNotes: { cost: "Lost productive time", time: "Multiple trips per hour", efficiency: "Worker frustration" }
  },
  {
    id: "exec-003",
    title: "Jobs Not Laid Out Properly",
    description: "Work arrives at the operator without proper preparation, requiring them to organize before starting.",
    diagnosticCategory: "work_execution",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "No work preparation process",
      "Previous step not completing properly",
      "Materials mixed together",
      "No job packets or work orders"
    ],
    impactNotes: { cost: "Lost productive time", time: "10-20 minutes per job", efficiency: "Errors from confusion" }
  },
  {
    id: "exec-004",
    title: "Processing Out of Sequence",
    description: "Work is done in wrong order because priorities were not communicated or assigned.",
    diagnosticCategory: "work_execution",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "No visible priorities",
      "Workers choosing own sequence",
      "Rush orders not communicated",
      "FIFO not enforced"
    ],
    impactNotes: { cost: "Expediting costs", time: "Delayed deliveries", efficiency: "Disruption to flow" }
  },
  {
    id: "exec-005",
    title: "No Alarm Signals for Problems",
    description: "There are no visual or audio signals to alert when production falls behind schedule or problems occur.",
    diagnosticCategory: "work_execution",
    dominantM: "Machinery",
    indicator: "Machine Indicator",
    commonCauses: [
      "No measurement of real-time progress",
      "Problems discovered too late",
      "Supervisors not aware of issues",
      "Manual reporting only"
    ],
    impactNotes: { cost: "Problems grow while undetected", time: "Late discovery means bigger fix", efficiency: "Reactive instead of proactive" }
  },
  {
    id: "exec-006",
    title: "Tooling Not Available",
    description: "Required tools cannot be found or the tool room inventory is depleted when needed.",
    diagnosticCategory: "work_execution",
    dominantM: "Materials",
    indicator: "Material Indicator",
    commonCauses: [
      "No tool inventory system",
      "Tools borrowed and not returned",
      "Damaged tools not replaced",
      "No reorder point for consumables"
    ],
    impactNotes: { cost: "Production delays", time: "Searching or waiting for tools", efficiency: "Improvised solutions causing quality issues" }
  },
  {
    id: "exec-007",
    title: "Production Reporting Delays",
    description: "Production data is reported the next day or later, preventing real-time decisions.",
    diagnosticCategory: "work_execution",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "Manual paper-based reporting",
      "End-of-shift data entry only",
      "No one assigned to update",
      "Systems not user-friendly"
    ],
    impactNotes: { cost: "Decisions made on old data", time: "Problems continue unreported", efficiency: "Missed improvement opportunities" }
  },
  {
    id: "exec-008",
    title: "Supervisor Doing Operator Work",
    description: "Supervisors spend their time doing production work instead of managing their team.",
    diagnosticCategory: "work_execution",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "Understaffed team",
      "Supervisor promoted from operator role",
      "Unclear supervisor responsibilities",
      "Pressure to meet output targets"
    ],
    impactNotes: { cost: "Team underperforms without supervision", time: "Problems not caught early", efficiency: "Supervisor becomes bottleneck" }
  },
  {
    id: "exec-009",
    title: "Material Handling Equipment Shortages",
    description: "Not enough forklifts, trolleys, or other handling equipment causing workers to wait or improvise.",
    diagnosticCategory: "work_execution",
    dominantM: "Machinery",
    indicator: "Machine Indicator",
    commonCauses: [
      "Equipment broken and not repaired",
      "Not enough equipment purchased",
      "Equipment being used elsewhere",
      "Poor scheduling of shared equipment"
    ],
    impactNotes: { cost: "Waiting time adds up", time: "Manual handling slower", efficiency: "Safety risks from improvising" }
  },
  {
    id: "exec-010",
    title: "No Defined Tasks for Support Staff",
    description: "Maintenance or support staff have no scheduled work and wait to be called for problems.",
    diagnosticCategory: "work_execution",
    dominantM: "Manpower",
    indicator: "Manpower Indicator",
    commonCauses: [
      "Only reactive maintenance",
      "No PM schedule",
      "Support staff seen as on-call only",
      "No productive work assigned during quiet times"
    ],
    impactNotes: { cost: "Paying for idle time", time: "Lost improvement opportunities", efficiency: "Reactive culture persists" }
  }
];

// Helper function to get problems by diagnostic category
export function getProblemsByCategory(category: DiagnosticCategory): ProblemLibraryEntry[] {
  return problemLibrary.filter(p => p.diagnosticCategory === category);
}

// Helper function to get problems by 4M category
export function getProblemsByM(m: FourMCategory): ProblemLibraryEntry[] {
  return problemLibrary.filter(p => p.dominantM === m);
}

// Helper function to get problem by ID
export function getProblemById(id: string): ProblemLibraryEntry | undefined {
  return problemLibrary.find(p => p.id === id);
}

// Get category label from ID
export function getCategoryLabel(categoryId: DiagnosticCategory): string {
  const category = [
    { id: "financial_control", label: "Financial Control" },
    { id: "inventory_materials", label: "Inventory & Materials" },
    { id: "production_efficiency", label: "Production Efficiency" },
    { id: "workforce", label: "Workforce & Staff" },
    { id: "quality", label: "Quality Control" },
    { id: "sales_customer", label: "Sales & Customer" },
    { id: "strategic_management", label: "Strategic & Management" },
    { id: "work_execution", label: "Work Execution" },
  ].find(c => c.id === categoryId);
  return category?.label || categoryId;
}
