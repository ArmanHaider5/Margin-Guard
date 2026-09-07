import type { FourMCategory, ManagementIndicator } from "./schema";

// Industry types supported by RCI
export type Industry = 
  | "construction"
  | "fnb_full_service"
  | "fnb_qsr"
  | "fnb_fast_food"
  | "fnb_franchise"
  | "fnb_independent"
  | "healthcare"
  | "hospitality"
  | "hotels_airbnb"
  | "logistics"
  | "manufacturing"
  | "oil_gas"
  | "property_development";

export const industryLabels: Record<Industry, string> = {
  construction: "Construction",
  fnb_full_service: "F&B - Full Service Restaurant",
  fnb_qsr: "F&B - Quick Service Restaurant (QSR)",
  fnb_fast_food: "F&B - Fast Food Chain",
  fnb_franchise: "F&B - Franchise",
  fnb_independent: "F&B - Independent Restaurant",
  healthcare: "Healthcare, Hospitals & Pharmacies",
  hospitality: "Hospitality",
  hotels_airbnb: "Hotels & Airbnb",
  logistics: "Logistics",
  manufacturing: "Manufacturing",
  oil_gas: "Oil & Gas",
  property_development: "Property Development",
};

// Structure for each industry problem
export interface IndustryProblem {
  id: string;
  industry: Industry;
  title: string;
  description: string;
  dominantM: FourMCategory[];
  indicator: ManagementIndicator;
  commonCauses: string[];
}

// Helper to map M categories to indicators
function getIndicator(categories: FourMCategory[]): ManagementIndicator {
  const primary = categories[0];
  const indicatorMap: Record<FourMCategory, ManagementIndicator> = {
    Money: "Money Indicator",
    Materials: "Material Indicator",
    Manpower: "Manpower Indicator",
    Machinery: "Machine Indicator",
  };
  return indicatorMap[primary];
}

// ============================================
// CONSTRUCTION INDUSTRY PROBLEMS
// ============================================
export const constructionProblems: IndustryProblem[] = [
  {
    id: "construction_001",
    industry: "construction",
    title: "Project Delays",
    description: "Construction progress fails to meet scheduled milestones.",
    dominantM: ["Manpower", "Materials", "Machinery"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Poor project planning and scheduling",
      "Shortage of workers or skilled labour",
      "Material delivery delays"
    ]
  },
  {
    id: "construction_002",
    industry: "construction",
    title: "Cost Overruns",
    description: "Actual cost exceeds planned budget.",
    dominantM: ["Money"],
    indicator: "Money Indicator",
    commonCauses: [
      "Underestimation of initial costs",
      "Frequent variation orders",
      "Poor material cost control"
    ]
  },
  {
    id: "construction_003",
    industry: "construction",
    title: "Labour Shortage",
    description: "Insufficient workers to meet project needs.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Poor labour retention",
      "Foreign worker permit issues",
      "No manpower planning"
    ]
  },
  {
    id: "construction_004",
    industry: "construction",
    title: "Poor Workmanship",
    description: "Construction work does not meet required standards.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Unskilled subcontractors",
      "Lack of supervision",
      "No quality control system"
    ]
  },
  {
    id: "construction_005",
    industry: "construction",
    title: "Safety Incidents on Site",
    description: "Accidents or injuries occur during operations.",
    dominantM: ["Manpower", "Machinery"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Workers not trained in safety",
      "Lack of PPE",
      "Unsafe equipment"
    ]
  },
  {
    id: "construction_006",
    industry: "construction",
    title: "Material Shortages",
    description: "Materials unavailable, delaying progress.",
    dominantM: ["Materials"],
    indicator: "Material Indicator",
    commonCauses: [
      "Poor inventory planning",
      "Supplier reliability issues",
      "Overuse compared to BOQ"
    ]
  },
  {
    id: "construction_007",
    industry: "construction",
    title: "Equipment Breakdown",
    description: "Machinery stops functioning, affecting construction progress.",
    dominantM: ["Machinery"],
    indicator: "Machine Indicator",
    commonCauses: [
      "Poor equipment maintenance",
      "Overuse beyond capacity",
      "Lack of spare parts"
    ]
  },
  {
    id: "construction_008",
    industry: "construction",
    title: "Rework & Rectification",
    description: "Work has to be redone due to errors or failure to meet requirements.",
    dominantM: ["Manpower", "Materials"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Miscommunication of specifications",
      "Poor site supervision",
      "Rushed work"
    ]
  },
  {
    id: "construction_009",
    industry: "construction",
    title: "Theft/Vandalism on Site",
    description: "Tools, equipment, or materials go missing or get damaged.",
    dominantM: ["Materials", "Machinery"],
    indicator: "Material Indicator",
    commonCauses: [
      "Weak site security",
      "No perimeter fencing",
      "Poor inventory control"
    ]
  },
  {
    id: "construction_010",
    industry: "construction",
    title: "Poor Communication Between Stakeholders",
    description: "Misalignment between contractors, consultants, and project owner.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "No centralized communication channel",
      "Missed documentation",
      "Confusing authority lines"
    ]
  },
  {
    id: "construction_011",
    industry: "construction",
    title: "Slow Permit or Inspection Approvals",
    description: "Work halted due to pending approvals from authorities.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Poor document preparation",
      "Delayed submissions",
      "Inexperienced compliance staff"
    ]
  },
  {
    id: "construction_012",
    industry: "construction",
    title: "Variation Order Disputes",
    description: "Conflicts with clients or contractors over scope changes.",
    dominantM: ["Money"],
    indicator: "Money Indicator",
    commonCauses: [
      "Vague work scope",
      "Poor documentation",
      "No cost justification"
    ]
  },
  {
    id: "construction_013",
    industry: "construction",
    title: "Weather Delays",
    description: "Rain, storms, or haze disrupt construction progress.",
    dominantM: ["Manpower", "Materials", "Machinery"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "No contingency plan",
      "Outdoor work dependency",
      "Poor sequencing"
    ]
  },
  {
    id: "construction_014",
    industry: "construction",
    title: "Site Congestion",
    description: "Overcrowded work areas slowing down progress.",
    dominantM: ["Manpower", "Machinery"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Poor work sequencing",
      "Too many trades working simultaneously",
      "Material storage blocking work areas"
    ]
  },
  {
    id: "construction_015",
    industry: "construction",
    title: "Documentation Errors",
    description: "Incorrect drawings, missing documents, or outdated plans used.",
    dominantM: ["Manpower", "Materials"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "No document control system",
      "Staff using old versions",
      "Poor coordination between consultants"
    ]
  }
];

// ============================================
// F&B - FULL SERVICE RESTAURANT PROBLEMS
// ============================================
export const fnbFullServiceProblems: IndustryProblem[] = [
  {
    id: "fnb_fs_001",
    industry: "fnb_full_service",
    title: "Long Waiting Time for Food",
    description: "Customers wait too long for their meals.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Kitchen understaffed",
      "Slow prep process"
    ]
  },
  {
    id: "fnb_fs_002",
    industry: "fnb_full_service",
    title: "Inconsistent Food Quality",
    description: "Same dish tastes different on different days.",
    dominantM: ["Materials", "Manpower"],
    indicator: "Material Indicator",
    commonCauses: [
      "No fixed recipe",
      "Different chefs preparing the dish"
    ]
  },
  {
    id: "fnb_fs_003",
    industry: "fnb_full_service",
    title: "High Food Wastage",
    description: "Too much raw material or cooked food thrown away.",
    dominantM: ["Materials"],
    indicator: "Material Indicator",
    commonCauses: [
      "Over-preparation",
      "Poor demand forecasting"
    ]
  },
  {
    id: "fnb_fs_004",
    industry: "fnb_full_service",
    title: "Slow Table Turnover",
    description: "Tables are occupied too long, reducing sales.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Slow service staff",
      "Inefficient billing process"
    ]
  },
  {
    id: "fnb_fs_005",
    industry: "fnb_full_service",
    title: "Poor Cost Control",
    description: "Food cost too high compared to revenue.",
    dominantM: ["Money", "Materials"],
    indicator: "Money Indicator",
    commonCauses: [
      "No cost tracking",
      "Over-purchasing"
    ]
  },
  {
    id: "fnb_fs_006",
    industry: "fnb_full_service",
    title: "Underperforming Staff",
    description: "Waiters and kitchen staff not meeting service standards.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Lack of training",
      "No KPI measurement"
    ]
  },
  {
    id: "fnb_fs_007",
    industry: "fnb_full_service",
    title: "Customer Complaints Increase",
    description: "More customers complain about service or food.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Inconsistent service",
      "Poor communication"
    ]
  },
  {
    id: "fnb_fs_008",
    industry: "fnb_full_service",
    title: "Inventory Shortage",
    description: "Ingredients run out mid-service.",
    dominantM: ["Materials"],
    indicator: "Material Indicator",
    commonCauses: [
      "Wrong forecasting",
      "Poor inventory tracking"
    ]
  },
  {
    id: "fnb_fs_009",
    industry: "fnb_full_service",
    title: "High Labour Cost",
    description: "Staff costs exceed target %.",
    dominantM: ["Money"],
    indicator: "Money Indicator",
    commonCauses: [
      "Overstaffing",
      "Unplanned overtime"
    ]
  },
  {
    id: "fnb_fs_010",
    industry: "fnb_full_service",
    title: "Slow Billing Process",
    description: "Customers wait long to pay, blocking tables.",
    dominantM: ["Machinery", "Manpower"],
    indicator: "Machine Indicator",
    commonCauses: [
      "Single cashier counter",
      "Manual receipts"
    ]
  }
];

// ============================================
// F&B - QUICK SERVICE RESTAURANT (QSR) PROBLEMS
// ============================================
export const fnbQsrProblems: IndustryProblem[] = [
  {
    id: "fnb_qsr_001",
    industry: "fnb_qsr",
    title: "Slow Order Fulfillment",
    description: "Orders take too long for a QSR environment.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Staff not fast enough",
      "Poor workflow design"
    ]
  },
  {
    id: "fnb_qsr_002",
    industry: "fnb_qsr",
    title: "Wrong Orders / Mispacking",
    description: "Customers receive incorrect orders.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Staff confusion during peak hours",
      "No double-checking"
    ]
  },
  {
    id: "fnb_qsr_003",
    industry: "fnb_qsr",
    title: "Peak-Hour Congestion",
    description: "Overcrowding and long queues during peak hours.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Slow front-line staff",
      "No queue-flow system"
    ]
  },
  {
    id: "fnb_qsr_004",
    industry: "fnb_qsr",
    title: "Shelf-Life Expiry",
    description: "Pre-cooked food exceeds shelf life.",
    dominantM: ["Materials"],
    indicator: "Material Indicator",
    commonCauses: [
      "Overproduction",
      "No timing system"
    ]
  },
  {
    id: "fnb_qsr_005",
    industry: "fnb_qsr",
    title: "Poor Cleanliness",
    description: "Dining area not cleaned fast enough.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Insufficient number of cleaners",
      "No cleaning schedule"
    ]
  }
];

// ============================================
// F&B - FAST FOOD CHAIN PROBLEMS
// ============================================
export const fnbFastFoodProblems: IndustryProblem[] = [
  {
    id: "fnb_ff_001",
    industry: "fnb_fast_food",
    title: "Inconsistent Speed Across Outlets",
    description: "Some outlets operate much slower.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Different staffing levels",
      "Poor training"
    ]
  },
  {
    id: "fnb_ff_002",
    industry: "fnb_fast_food",
    title: "Stock-Out of Key Menu Items",
    description: "Bestsellers unavailable.",
    dominantM: ["Materials"],
    indicator: "Material Indicator",
    commonCauses: [
      "Supplier delays",
      "Poor forecasting"
    ]
  },
  {
    id: "fnb_ff_003",
    industry: "fnb_fast_food",
    title: "Drive-Thru Inefficiency",
    description: "Slow drive-thru service.",
    dominantM: ["Manpower", "Machinery"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Slow payment",
      "Slow packing"
    ]
  },
  {
    id: "fnb_ff_004",
    industry: "fnb_fast_food",
    title: "Failure to Follow SOP",
    description: "Different outlets follow different styles.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Weak enforcement",
      "Lack of staff training"
    ]
  },
  {
    id: "fnb_ff_005",
    industry: "fnb_fast_food",
    title: "High Energy Consumption",
    description: "Utility bills too high.",
    dominantM: ["Money", "Machinery"],
    indicator: "Money Indicator",
    commonCauses: [
      "Old equipment",
      "Inefficient usage"
    ]
  }
];

// ============================================
// F&B - FRANCHISE PROBLEMS
// ============================================
export const fnbFranchiseProblems: IndustryProblem[] = [
  {
    id: "fnb_fr_001",
    industry: "fnb_franchise",
    title: "Franchisee Non-Compliance",
    description: "Franchisees don't follow SOP.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Weak training",
      "No monitoring"
    ]
  },
  {
    id: "fnb_fr_002",
    industry: "fnb_franchise",
    title: "Reporting Inaccuracy",
    description: "Franchisees submit wrong sales reports.",
    dominantM: ["Money"],
    indicator: "Money Indicator",
    commonCauses: [
      "Manual entry",
      "Lack of oversight"
    ]
  },
  {
    id: "fnb_fr_003",
    industry: "fnb_franchise",
    title: "Quality Inconsistency Across Outlets",
    description: "Same menu item differs between stores.",
    dominantM: ["Materials", "Manpower"],
    indicator: "Material Indicator",
    commonCauses: [
      "Different suppliers",
      "Staff not trained"
    ]
  },
  {
    id: "fnb_fr_004",
    industry: "fnb_franchise",
    title: "Franchisee-Headquarters Conflict",
    description: "Disputes about fees, marketing, or support.",
    dominantM: ["Money"],
    indicator: "Money Indicator",
    commonCauses: [
      "Poor communication",
      "Unclear contract terms"
    ]
  },
  {
    id: "fnb_fr_005",
    industry: "fnb_franchise",
    title: "Poor Franchisee Performance",
    description: "Some outlets underperform.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Bad location",
      "Poor management"
    ]
  }
];

// ============================================
// F&B - INDEPENDENT RESTAURANT PROBLEMS
// ============================================
export const fnbIndependentProblems: IndustryProblem[] = [
  {
    id: "fnb_ind_001",
    industry: "fnb_independent",
    title: "Owner Dependency",
    description: "Business cannot operate without the owner.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "No trained manager",
      "Owner handles everything"
    ]
  },
  {
    id: "fnb_ind_002",
    industry: "fnb_independent",
    title: "Poor Marketing Reach",
    description: "Not enough customers due to low visibility.",
    dominantM: ["Money"],
    indicator: "Money Indicator",
    commonCauses: [
      "Weak social media",
      "No promotions"
    ]
  }
];

// ============================================
// HEALTHCARE INDUSTRY PROBLEMS
// ============================================
export const healthcareProblems: IndustryProblem[] = [
  {
    id: "healthcare_001",
    industry: "healthcare",
    title: "Long Patient Waiting Time",
    description: "Patients wait too long for registration, consultation, treatment, or payment.",
    dominantM: ["Machinery", "Manpower"],
    indicator: "Machine Indicator",
    commonCauses: [
      "Manual registration processes",
      "Doctors not following appointment schedule",
      "Insufficient counters",
      "Poor workflow design",
      "Slow system response"
    ]
  },
  {
    id: "healthcare_002",
    industry: "healthcare",
    title: "Poor Patient Experience & Low Satisfaction",
    description: "Complaints about service, facilities, staff behaviour, or unclear instructions.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Staff communication gaps",
      "No service scripts",
      "Unclear navigation in hospital",
      "Lack of empathy training"
    ]
  },
  {
    id: "healthcare_003",
    industry: "healthcare",
    title: "Medication Errors (Pharmacies)",
    description: "Wrong dosage, wrong drug, labeling errors, or miscommunication.",
    dominantM: ["Manpower", "Machinery"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Human error during dispensing",
      "Poor storage labeling",
      "Pharmacist overloaded",
      "No double-check system"
    ]
  },
  {
    id: "healthcare_004",
    industry: "healthcare",
    title: "Inefficient Inventory & Drug Stock Management",
    description: "Frequent stockouts, expired drugs, or inaccurate inventory levels.",
    dominantM: ["Materials", "Machinery"],
    indicator: "Material Indicator",
    commonCauses: [
      "Manual stock counts",
      "No reorder level",
      "Poor supplier coordination",
      "Over-ordering or under-ordering"
    ]
  },
  {
    id: "healthcare_005",
    industry: "healthcare",
    title: "High Staff Turnover (Doctors, Nurses, Pharmacists)",
    description: "Constant loss of skilled staff affects service quality and safety.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Overwork and burnout",
      "Unclear career progression",
      "Unattractive salary or benefits",
      "Toxic departments"
    ]
  },
  {
    id: "healthcare_006",
    industry: "healthcare",
    title: "Poor Cross-Department Coordination",
    description: "Delays between lab → doctor → pharmacy → billing creates bottlenecks.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "No defined workflow",
      "Missing handover processes",
      "Delayed test results"
    ]
  },
  {
    id: "healthcare_007",
    industry: "healthcare",
    title: "Billing Errors & Revenue Leakage",
    description: "Missed charges, incorrect billing, or uninsured items.",
    dominantM: ["Machinery"],
    indicator: "Machine Indicator",
    commonCauses: [
      "Manual billing inputs",
      "Inconsistent coding",
      "Undertrained staff"
    ]
  },
  {
    id: "healthcare_008",
    industry: "healthcare",
    title: "Appointment Scheduling Inefficiency",
    description: "Overbooking, doctor idle time, or empty slots.",
    dominantM: ["Machinery"],
    indicator: "Machine Indicator",
    commonCauses: [
      "Manual scheduling",
      "Patients not showing up",
      "Doctor's inconsistent timing"
    ]
  },
  {
    id: "healthcare_009",
    industry: "healthcare",
    title: "Poor Facility Maintenance & Hygiene",
    description: "Equipment downtime, unclean toilets, broken lights, outdated ward conditions.",
    dominantM: ["Machinery", "Materials"],
    indicator: "Machine Indicator",
    commonCauses: [
      "No preventive maintenance",
      "Overloaded housekeeping team",
      "Aging equipment"
    ]
  },
  {
    id: "healthcare_010",
    industry: "healthcare",
    title: "Lack of Regulatory Compliance",
    description: "Issues with MOH requirements, licensing, waste disposal, or safety standards.",
    dominantM: ["Materials"],
    indicator: "Material Indicator",
    commonCauses: [
      "No compliance officer",
      "Poor documentation",
      "Staff unaware of regulations"
    ]
  },
  {
    id: "healthcare_011",
    industry: "healthcare",
    title: "Delayed Lab Results & Diagnostic Reports",
    description: "Slow turnaround affects patient treatment decisions.",
    dominantM: ["Machinery", "Manpower"],
    indicator: "Machine Indicator",
    commonCauses: [
      "Overloaded lab",
      "Poor sample tracking",
      "Machine downtime"
    ]
  },
  {
    id: "healthcare_012",
    industry: "healthcare",
    title: "Poor Pharmacy Sales & Counselling Performance",
    description: "Pharmacy not maximizing retail potential or providing proper patient education.",
    dominantM: ["Manpower", "Money"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Staff not trained to upsell",
      "No category management",
      "Poor product placement"
    ]
  },
  {
    id: "healthcare_013",
    industry: "healthcare",
    title: "Claims Rejection & Insurance Processing Issues",
    description: "Insurance companies reject claims due to documentation or coding errors.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Missing documents",
      "Wrong coding",
      "Delayed submissions"
    ]
  },
  {
    id: "healthcare_014",
    industry: "healthcare",
    title: "Patient Safety Incidents",
    description: "Falls, wrong treatment, infections, or cross-contamination.",
    dominantM: ["Manpower", "Materials"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Poor monitoring of high-risk patients",
      "No incident reporting",
      "Unsafe facility design"
    ]
  }
];

// ============================================
// HOSPITALITY INDUSTRY PROBLEMS
// ============================================
export const hospitalityProblems: IndustryProblem[] = [
  {
    id: "hospitality_001",
    industry: "hospitality",
    title: "Inconsistent Guest Experience",
    description: "Guest service varies by staff, shift, and location, reducing loyalty and online ratings.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Lack of standardized service scripts",
      "Poor training for new hires",
      "High staff turnover",
      "Different managers enforcing different standards"
    ]
  },
  {
    id: "hospitality_002",
    industry: "hospitality",
    title: "High Staff Turnover",
    description: "Employees frequently resign, causing service disruptions and retraining costs.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Low salaries or no progression",
      "Poor management communication",
      "Overwork / burn-out",
      "Unclear KPIs"
    ]
  },
  {
    id: "hospitality_003",
    industry: "hospitality",
    title: "Poor Reservation & Booking Management",
    description: "Overbooking, duplicate bookings, and lost bookings affect occupancy and reputation.",
    dominantM: ["Machinery"],
    indicator: "Machine Indicator",
    commonCauses: [
      "Manual booking processes",
      "No centralized system",
      "Human error during peak hours"
    ]
  },
  {
    id: "hospitality_004",
    industry: "hospitality",
    title: "Weak Upselling & Revenue Optimization",
    description: "Staff miss opportunities to upsell rooms, packages, F&B, or activities.",
    dominantM: ["Manpower", "Money"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "No upselling scripts",
      "Staff fear rejection",
      "No commissions",
      "No dynamic pricing"
    ]
  },
  {
    id: "hospitality_005",
    industry: "hospitality",
    title: "Slow Check-In & Check-Out Process",
    description: "Long queues frustrate guests and reduce overall satisfaction.",
    dominantM: ["Machinery"],
    indicator: "Machine Indicator",
    commonCauses: [
      "Manual forms",
      "Slow systems",
      "Insufficient counters",
      "Staff not trained on fast processing"
    ]
  },
  {
    id: "hospitality_006",
    industry: "hospitality",
    title: "Poor Housekeeping Quality & Delays",
    description: "Rooms take too long to clean or have inconsistent cleanliness.",
    dominantM: ["Manpower", "Materials"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "No housekeeping SOP",
      "Lack of QC checks",
      "Inadequate use of cleaning chemicals",
      "Poor room assignment planning"
    ]
  },
  {
    id: "hospitality_007",
    industry: "hospitality",
    title: "Facility & Equipment Breakdowns",
    description: "Aircon, lifts, kitchens, or amenities frequently break.",
    dominantM: ["Machinery", "Materials"],
    indicator: "Machine Indicator",
    commonCauses: [
      "No preventive maintenance plan",
      "Old equipment",
      "Reactive fixes only"
    ]
  },
  {
    id: "hospitality_008",
    industry: "hospitality",
    title: "Customer Complaints Not Handled Properly",
    description: "Complaints escalate to social media and damage brand image.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Staff defensive",
      "No resolution SOP",
      "Complaints not recorded"
    ]
  },
  {
    id: "hospitality_009",
    industry: "hospitality",
    title: "Poor Inventory & Cost Control (Laundry, Linen, Amenities, F&B)",
    description: "High wastage, missing items, inaccurate stock levels.",
    dominantM: ["Materials"],
    indicator: "Material Indicator",
    commonCauses: [
      "No stock monitoring",
      "Theft / pilferage",
      "Usage not tracked"
    ]
  },
  {
    id: "hospitality_010",
    industry: "hospitality",
    title: "Low Online Ratings Affect Revenue",
    description: "Ratings impact booking volume on Agoda, Booking.com, Airbnb.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Slow responses",
      "No service standards",
      "Unresolved guest issues"
    ]
  },
  {
    id: "hospitality_011",
    industry: "hospitality",
    title: "Inefficient Event & Banquet Management",
    description: "Poor coordination affects weddings, corporate events, or functions.",
    dominantM: ["Manpower", "Materials"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "No event timeline",
      "No communication between banquet/service/kitchen",
      "Last-minute changes not logged"
    ]
  },
  {
    id: "hospitality_012",
    industry: "hospitality",
    title: "Safety & Compliance Issues",
    description: "Accidents, fire hazards, expired certifications, or unsafe practices.",
    dominantM: ["Materials", "Manpower"],
    indicator: "Material Indicator",
    commonCauses: [
      "Lack of safety training",
      "No audits",
      "Broken emergency equipment"
    ]
  }
];

// ============================================
// HOTELS & AIRBNB INDUSTRY PROBLEMS
// ============================================
export const hotelsAirbnbProblems: IndustryProblem[] = [
  {
    id: "hotels_001",
    industry: "hotels_airbnb",
    title: "Low Room Occupancy",
    description: "Rooms remain vacant despite market demand.",
    dominantM: ["Money"],
    indicator: "Money Indicator",
    commonCauses: [
      "Poor pricing strategy",
      "Weak online visibility",
      "No dynamic rate adjustment"
    ]
  },
  {
    id: "hotels_002",
    industry: "hotels_airbnb",
    title: "Poor Guest Reviews",
    description: "Guests leave negative feedback online.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Inconsistent service quality",
      "Slow response to complaints",
      "Dirty rooms or poor maintenance"
    ]
  },
  {
    id: "hotels_003",
    industry: "hotels_airbnb",
    title: "Inefficient Housekeeping Turnover",
    description: "Rooms take too long to clean, delaying check-ins.",
    dominantM: ["Manpower", "Machinery"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Poor housekeeping workflow",
      "Insufficient cleaners",
      "Lack of cleaning equipment & supplies"
    ]
  },
  {
    id: "hotels_004",
    industry: "hotels_airbnb",
    title: "Overbooking Issues",
    description: "Rooms sold exceed actual available units.",
    dominantM: ["Money", "Machinery"],
    indicator: "Money Indicator",
    commonCauses: [
      "Poor OTA sync",
      "Manual bookings outside the system",
      "Miscommunication with staff"
    ]
  },
  {
    id: "hotels_005",
    industry: "hotels_airbnb",
    title: "Maintenance Backlogs",
    description: "Facilities break down or repairs are delayed.",
    dominantM: ["Machinery", "Materials"],
    indicator: "Machine Indicator",
    commonCauses: [
      "No preventive maintenance plan",
      "Understaffed maintenance team",
      "Dependence on external contractors"
    ]
  },
  {
    id: "hotels_006",
    industry: "hotels_airbnb",
    title: "High Operational Costs",
    description: "Running costs exceed budget expectations.",
    dominantM: ["Money"],
    indicator: "Money Indicator",
    commonCauses: [
      "Utility wastage",
      "Overstaffing",
      "Poor purchasing control"
    ]
  },
  {
    id: "hotels_007",
    industry: "hotels_airbnb",
    title: "Inefficient Check-in/Check-out",
    description: "Long queues or slow processes at the front desk.",
    dominantM: ["Manpower", "Machinery"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Manual documentation",
      "Understaffed reception",
      "Slow system software"
    ]
  },
  {
    id: "hotels_008",
    industry: "hotels_airbnb",
    title: "Inconsistent Room Quality",
    description: "Standard varies from room to room.",
    dominantM: ["Manpower", "Materials"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "No room setup SOP",
      "Housekeeping inconsistencies",
      "Old or mismatched furniture"
    ]
  },
  {
    id: "hotels_009",
    industry: "hotels_airbnb",
    title: "Poor Bed & Linen Hygiene",
    description: "Guests complain about stained sheets or smells.",
    dominantM: ["Materials"],
    indicator: "Material Indicator",
    commonCauses: [
      "Laundry not inspected",
      "Reuse due to low stock",
      "Poor-quality detergent or washing SOP"
    ]
  },
  {
    id: "hotels_010",
    industry: "hotels_airbnb",
    title: "Security Vulnerabilities",
    description: "Guest safety compromised (theft, break-ins, etc.).",
    dominantM: ["Machinery", "Manpower"],
    indicator: "Machine Indicator",
    commonCauses: [
      "Weak CCTV coverage",
      "Faulty door locks",
      "Untrained staff on security protocols"
    ]
  },
  {
    id: "hotels_011",
    industry: "hotels_airbnb",
    title: "High Airbnb Cancellation Rate",
    description: "Guests cancel last-minute causing empty nights.",
    dominantM: ["Money"],
    indicator: "Money Indicator",
    commonCauses: [
      "Weak cancellation policy",
      "Poor communication with guests",
      "No reminders sent"
    ]
  },
  {
    id: "hotels_012",
    industry: "hotels_airbnb",
    title: "Poor Communication With Guests",
    description: "Slow replies reduce booking confidence.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "No dedicated guest communication SOP",
      "Host unavailable",
      "Messages not centralized"
    ]
  },
  {
    id: "hotels_013",
    industry: "hotels_airbnb",
    title: "Inadequate Amenities",
    description: "Guests complain about missing or poor-quality amenities.",
    dominantM: ["Materials"],
    indicator: "Material Indicator",
    commonCauses: [
      "No stock monitoring",
      "Cost-cutting on amenities",
      "Lack of standard bundle (towel, toiletries, etc.)"
    ]
  },
  {
    id: "hotels_014",
    industry: "hotels_airbnb",
    title: "Noise Complaints",
    description: "Guests unable to sleep due to noise.",
    dominantM: ["Manpower", "Materials"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Poor insulation",
      "Disruptive guests",
      "No quiet-hours policy"
    ]
  },
  {
    id: "hotels_015",
    industry: "hotels_airbnb",
    title: "Poor Cleanliness Ratings (Airbnb)",
    description: "Guests rate cleanliness low, affecting ranking.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Rushed cleaning",
      "Lack of photo-proof after cleaning",
      "No cleaning checklist"
    ]
  }
];

// ============================================
// LOGISTICS INDUSTRY PROBLEMS
// ============================================
export const logisticsProblems: IndustryProblem[] = [
  {
    id: "logistics_001",
    industry: "logistics",
    title: "Delayed Deliveries",
    description: "Goods often arrive later than promised, reducing customer trust.",
    dominantM: ["Manpower", "Machinery"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Poor route planning",
      "Vehicle breakdown"
    ]
  },
  {
    id: "logistics_002",
    industry: "logistics",
    title: "High Fuel Consumption",
    description: "Fuel cost increases beyond acceptable levels.",
    dominantM: ["Money"],
    indicator: "Money Indicator",
    commonCauses: [
      "Inefficient routes",
      "Driver speeding/idling"
    ]
  },
  {
    id: "logistics_003",
    industry: "logistics",
    title: "Warehouse Picking Errors",
    description: "Incorrect items picked, causing returns or customer complaints.",
    dominantM: ["Materials"],
    indicator: "Material Indicator",
    commonCauses: [
      "Poor labelling",
      "No double-check system"
    ]
  },
  {
    id: "logistics_004",
    industry: "logistics",
    title: "Inventory Inaccuracy",
    description: "System stock differs from physical count.",
    dominantM: ["Materials"],
    indicator: "Material Indicator",
    commonCauses: [
      "Manual updates",
      "Unrecorded stock movement"
    ]
  },
  {
    id: "logistics_005",
    industry: "logistics",
    title: "Vehicle Downtime",
    description: "Trucks frequently break down, affecting deliveries.",
    dominantM: ["Machinery"],
    indicator: "Machine Indicator",
    commonCauses: [
      "Inconsistent maintenance",
      "Aged fleet"
    ]
  },
  {
    id: "logistics_006",
    industry: "logistics",
    title: "High Driver Turnover",
    description: "Difficult to retain drivers, causing delivery unreliability.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Long working hours",
      "Low pay competitiveness"
    ]
  },
  {
    id: "logistics_007",
    industry: "logistics",
    title: "Damage During Transit",
    description: "Goods arrive broken or damaged.",
    dominantM: ["Materials"],
    indicator: "Material Indicator",
    commonCauses: [
      "Poor packaging",
      "Rough handling"
    ]
  },
  {
    id: "logistics_008",
    industry: "logistics",
    title: "Inefficient Route Planning",
    description: "Drivers take longer routes or unnecessary detours.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "No GPS guidance",
      "Poor planning"
    ]
  },
  {
    id: "logistics_009",
    industry: "logistics",
    title: "Missing Proof of Delivery (POD)",
    description: "POD lost or incomplete, causing disputes.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Manual paperwork",
      "Low discipline"
    ]
  },
  {
    id: "logistics_010",
    industry: "logistics",
    title: "Customer Complaints Increase",
    description: "Rising complaints about delivery quality.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Poor communication",
      "Late deliveries"
    ]
  },
  {
    id: "logistics_011",
    industry: "logistics",
    title: "Excessive Loading/Unloading Time",
    description: "Time wasted at warehouse bays.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "No proper scheduling",
      "Untrained loaders"
    ]
  },
  {
    id: "logistics_012",
    industry: "logistics",
    title: "Poor Fleet Utilisation",
    description: "Some vehicles overused while others underused.",
    dominantM: ["Machinery"],
    indicator: "Machine Indicator",
    commonCauses: [
      "No utilisation tracking",
      "Poor assignment"
    ]
  },
  {
    id: "logistics_013",
    industry: "logistics",
    title: "High Repair Costs",
    description: "Frequent mechanical problems lead to expensive repairs.",
    dominantM: ["Money", "Machinery"],
    indicator: "Money Indicator",
    commonCauses: [
      "Delayed maintenance",
      "Poor driving behaviour"
    ]
  },
  {
    id: "logistics_014",
    industry: "logistics",
    title: "Lost Parcels / Missing Stock",
    description: "Parcels go missing in the warehouse or during transport.",
    dominantM: ["Materials"],
    indicator: "Material Indicator",
    commonCauses: [
      "No tracking system",
      "Manual handling"
    ]
  },
  {
    id: "logistics_015",
    industry: "logistics",
    title: "Unplanned Overtime",
    description: "Staff often work overtime unexpectedly.",
    dominantM: ["Money", "Manpower"],
    indicator: "Money Indicator",
    commonCauses: [
      "Poor planning",
      "Bottlenecks"
    ]
  },
  {
    id: "logistics_016",
    industry: "logistics",
    title: "No Real-Time Tracking",
    description: "Customers cannot track their deliveries.",
    dominantM: ["Machinery"],
    indicator: "Machine Indicator",
    commonCauses: [
      "No tracking system",
      "Poor IT integration"
    ]
  },
  {
    id: "logistics_017",
    industry: "logistics",
    title: "Overloading Vehicles",
    description: "Trucks exceed weight limits, risking penalties.",
    dominantM: ["Machinery", "Money"],
    indicator: "Machine Indicator",
    commonCauses: [
      "No weighing system",
      "Staff negligence"
    ]
  },
  {
    id: "logistics_018",
    industry: "logistics",
    title: "Poor Documentation",
    description: "Delivery notes, invoices and manifests filled incorrectly.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Handwritten forms",
      "Rushing work"
    ]
  },
  {
    id: "logistics_019",
    industry: "logistics",
    title: "Inaccurate Delivery ETA",
    description: "Promised delivery time often inaccurate.",
    dominantM: ["Machinery"],
    indicator: "Machine Indicator",
    commonCauses: [
      "Poor forecasting",
      "Traffic not accounted"
    ]
  },
  {
    id: "logistics_020",
    industry: "logistics",
    title: "High Customer Churn",
    description: "Customers switch suppliers due to poor logistics performance.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Late deliveries",
      "Frequent errors"
    ]
  }
];

// ============================================
// MANUFACTURING INDUSTRY PROBLEMS
// ============================================
export const manufacturingProblems: IndustryProblem[] = [
  {
    id: "manufacturing_001",
    industry: "manufacturing",
    title: "Production Delays & Low Output",
    description: "Actual production output does not meet target, causing late deliveries.",
    dominantM: ["Manpower", "Machinery", "Materials"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Machine downtime",
      "Poor production planning",
      "Insufficient manpower",
      "Raw material shortage"
    ]
  },
  {
    id: "manufacturing_002",
    industry: "manufacturing",
    title: "High Machine Downtime",
    description: "Frequent breakdowns cause output losses and quality issues.",
    dominantM: ["Machinery", "Materials"],
    indicator: "Machine Indicator",
    commonCauses: [
      "No preventive maintenance program",
      "Worn-out parts",
      "Old machines",
      "Untrained operators"
    ]
  },
  {
    id: "manufacturing_003",
    industry: "manufacturing",
    title: "Excessive Rejects & Quality Issues",
    description: "Defects, rework, scrap, or customer complaints due to inconsistent output.",
    dominantM: ["Materials", "Manpower", "Machinery"],
    indicator: "Material Indicator",
    commonCauses: [
      "Raw material inconsistency",
      "Operator error",
      "Incorrect machine settings",
      "Poor quality inspection"
    ]
  },
  {
    id: "manufacturing_004",
    industry: "manufacturing",
    title: "Poor Inventory Control (Raw Material, WIP, Finished Goods)",
    description: "Overstock, stockouts, expired materials or inaccurate balances.",
    dominantM: ["Materials"],
    indicator: "Material Indicator",
    commonCauses: [
      "Manual counting",
      "No tracking system",
      "Poor warehouse arrangement"
    ]
  },
  {
    id: "manufacturing_005",
    industry: "manufacturing",
    title: "Inefficient Production Layout",
    description: "Material movement takes too long; workflow is illogical.",
    dominantM: ["Materials", "Manpower"],
    indicator: "Material Indicator",
    commonCauses: [
      "No layout planning",
      "Departments placed far apart",
      "Blocking/traffic in work floor"
    ]
  },
  {
    id: "manufacturing_006",
    industry: "manufacturing",
    title: "Lack of Standard Operating Procedures (SOPs)",
    description: "Inconsistent production methods and variable quality.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "SOPs outdated or missing",
      "Operators not trained on SOPs",
      "No audits"
    ]
  },
  {
    id: "manufacturing_007",
    industry: "manufacturing",
    title: "Overdependence on Key Operators",
    description: "Only certain senior staff know certain processes.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "No cross-training",
      "No documentation",
      "Senior operators resist sharing knowledge"
    ]
  },
  {
    id: "manufacturing_008",
    industry: "manufacturing",
    title: "Poor Production Planning & Scheduling",
    description: "No visibility on capacity → leading to delays or idle time.",
    dominantM: ["Manpower", "Machinery"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "No real-time data",
      "Inaccurate demand forecasting",
      "Manual planning"
    ]
  },
  {
    id: "manufacturing_009",
    industry: "manufacturing",
    title: "High Material Wastage",
    description: "Raw materials wasted due to overproduction, wrong cuts, or defects.",
    dominantM: ["Materials", "Manpower"],
    indicator: "Material Indicator",
    commonCauses: [
      "Inaccurate cutting plan",
      "Poor storage conditions",
      "Overproduction beyond demand"
    ]
  },
  {
    id: "manufacturing_010",
    industry: "manufacturing",
    title: "Poor Workplace Safety & Accidents",
    description: "Injuries, unsafe practices, or lack of PPE affect operation stability.",
    dominantM: ["Manpower", "Machinery"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Lack of safety training",
      "No enforcement",
      "Unsafe machine guards"
    ]
  },
  {
    id: "manufacturing_011",
    industry: "manufacturing",
    title: "High Utility Cost & Inefficient Energy Use",
    description: "Electricity, water, and gas costs rising due to inefficient operations.",
    dominantM: ["Machinery", "Money"],
    indicator: "Machine Indicator",
    commonCauses: [
      "Old motors & machines",
      "Wasteful operator habits",
      "No energy monitoring"
    ]
  },
  {
    id: "manufacturing_012",
    industry: "manufacturing",
    title: "Slow Changeover Time",
    description: "Switching machines between different products takes too long.",
    dominantM: ["Manpower", "Machinery"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "No standardized process",
      "Poor tool arrangement",
      "Untrained workers"
    ]
  },
  {
    id: "manufacturing_013",
    industry: "manufacturing",
    title: "Weak Supplier Performance",
    description: "Late deliveries, poor quality materials, inconsistent supply.",
    dominantM: ["Materials"],
    indicator: "Material Indicator",
    commonCauses: [
      "No supplier evaluation",
      "Overdependence on one supplier",
      "Poor communication"
    ]
  },
  {
    id: "manufacturing_014",
    industry: "manufacturing",
    title: "Inaccurate Reporting & Lack of Real-Time Data",
    description: "Management cannot see real performance; decisions delayed.",
    dominantM: ["Machinery"],
    indicator: "Machine Indicator",
    commonCauses: [
      "Manual reporting",
      "Data entered late",
      "No digital dashboard"
    ]
  }
];

// ============================================
// OIL & GAS INDUSTRY PROBLEMS
// ============================================
export const oilGasProblems: IndustryProblem[] = [
  {
    id: "oilgas_001",
    industry: "oil_gas",
    title: "Equipment Failure & Unplanned Downtime",
    description: "Critical equipment like pumps, compressors, turbines, rigs, or pipelines fail unexpectedly.",
    dominantM: ["Machinery", "Materials", "Manpower"],
    indicator: "Machine Indicator",
    commonCauses: [
      "Poor maintenance schedule",
      "Aging equipment",
      "Harsh operating conditions",
      "Incorrect calibration"
    ]
  },
  {
    id: "oilgas_002",
    industry: "oil_gas",
    title: "Low Production Efficiency / Low OPEX Performance",
    description: "Output from wells, rigs, or processing units not meeting targets.",
    dominantM: ["Machinery", "Materials"],
    indicator: "Machine Indicator",
    commonCauses: [
      "Poor production planning",
      "Subsurface issues (upstream)",
      "Inefficient refinery processes",
      "Operator errors"
    ]
  },
  {
    id: "oilgas_003",
    industry: "oil_gas",
    title: "Safety Incidents & Non-Compliance",
    description: "Accidents, leaks, fires, near-misses, unsafe behaviours, HSE audit failures.",
    dominantM: ["Manpower", "Materials", "Machinery"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Inconsistent safety practices",
      "Lack of hazard identification",
      "PPE not used",
      "Improper lifting or hot work"
    ]
  },
  {
    id: "oilgas_004",
    industry: "oil_gas",
    title: "Pipeline Integrity Issues & Leakages",
    description: "Corrosion, leaks, pressure loss, or pipeline bursts.",
    dominantM: ["Materials", "Machinery"],
    indicator: "Material Indicator",
    commonCauses: [
      "Poor coating",
      "Corrosion under insulation",
      "Lack of pigging",
      "Aging steel"
    ]
  },
  {
    id: "oilgas_005",
    industry: "oil_gas",
    title: "Poor Supply Chain & Logistics Coordination",
    description: "Delays in delivering materials, tools, spare parts to offshore/onshore sites.",
    dominantM: ["Materials", "Manpower"],
    indicator: "Material Indicator",
    commonCauses: [
      "No inventory visibility",
      "Poor vendor planning",
      "Transport scheduling issues"
    ]
  },
  {
    id: "oilgas_006",
    industry: "oil_gas",
    title: "Weak Contractor & Vendor Management",
    description: "Contractors deliver substandard work or fail safety audits.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "No performance scoring",
      "Infrequent audits",
      "Low supervision"
    ]
  },
  {
    id: "oilgas_007",
    industry: "oil_gas",
    title: "High Cost of Operations (OPEX)",
    description: "Excessive spending on production, maintenance, manpower, or logistics.",
    dominantM: ["Money"],
    indicator: "Money Indicator",
    commonCauses: [
      "Inefficient processes",
      "High energy consumption",
      "Poor cost visibility"
    ]
  },
  {
    id: "oilgas_008",
    industry: "oil_gas",
    title: "Poor Asset & Facility Management",
    description: "Rigs, platforms, refineries, storage tanks not maintained properly.",
    dominantM: ["Machinery", "Materials"],
    indicator: "Machine Indicator",
    commonCauses: [
      "Poor inspection routines",
      "Corrosion",
      "Aging facilities"
    ]
  },
  {
    id: "oilgas_009",
    industry: "oil_gas",
    title: "Skilled Workforce Shortage",
    description: "Lack of experienced engineers, technicians, HSE officers & rig crew.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "High turnover",
      "Aging workforce",
      "Insufficient training"
    ]
  },
  {
    id: "oilgas_010",
    industry: "oil_gas",
    title: "Documentation & Compliance Errors",
    description: "Missing permits, incomplete reports, wrong HSE documentation.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Poor admin processes",
      "Missing version control",
      "Last-minute documentation"
    ]
  },
  {
    id: "oilgas_011",
    industry: "oil_gas",
    title: "Inefficient Turnarounds / Shutdowns",
    description: "Shutdowns take too long, exceed budget, or cause production losses.",
    dominantM: ["Manpower", "Machinery"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Poor planning",
      "Contractor delays",
      "Wrong sequencing"
    ]
  },
  {
    id: "oilgas_012",
    industry: "oil_gas",
    title: "Inaccurate Forecasting (Demand, Production, Maintenance)",
    description: "Leads to supply issues, lost revenue, or customer dissatisfaction.",
    dominantM: ["Machinery"],
    indicator: "Machine Indicator",
    commonCauses: [
      "Old forecasting models",
      "No historical data analysis",
      "Manual reporting"
    ]
  },
  {
    id: "oilgas_013",
    industry: "oil_gas",
    title: "Poor Chemical & Material Handling",
    description: "Hazards in handling drilling fluids, chemicals, fuels, or gas.",
    dominantM: ["Materials", "Manpower"],
    indicator: "Material Indicator",
    commonCauses: [
      "Improper storage",
      "Incorrect PPE",
      "No chemical inventory"
    ]
  },
  {
    id: "oilgas_014",
    industry: "oil_gas",
    title: "Environmental Compliance Issues",
    description: "Pollution, emissions, spills, and waste management issues.",
    dominantM: ["Materials", "Manpower"],
    indicator: "Material Indicator",
    commonCauses: [
      "Improper disposal",
      "Outdated equipment",
      "No monitoring"
    ]
  }
];

// ============================================
// PROPERTY DEVELOPMENT INDUSTRY PROBLEMS
// ============================================
export const propertyDevelopmentProblems: IndustryProblem[] = [
  {
    id: "property_001",
    industry: "property_development",
    title: "Project Delays",
    description: "Construction timeline extends beyond planned schedule.",
    dominantM: ["Manpower", "Materials", "Machinery"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Slow contractor performance",
      "Material delivery delays",
      "Poor project scheduling"
    ]
  },
  {
    id: "property_002",
    industry: "property_development",
    title: "Budget Overruns",
    description: "Actual project cost exceeds approved budget.",
    dominantM: ["Money"],
    indicator: "Money Indicator",
    commonCauses: [
      "Underestimation during planning",
      "Unexpected variation orders",
      "Inefficient procurement"
    ]
  },
  {
    id: "property_003",
    industry: "property_development",
    title: "Poor Contractor Performance",
    description: "Contractors deliver substandard quality or work slowly.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Weak contractor selection process",
      "No performance KPIs",
      "Miscommunication"
    ]
  },
  {
    id: "property_004",
    industry: "property_development",
    title: "Regulatory Approval Delays",
    description: "Authority approval takes longer than expected.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Incomplete documentation",
      "Inexperienced submission team",
      "Poor authority follow-up"
    ]
  },
  {
    id: "property_005",
    industry: "property_development",
    title: "Low Sales of New Units",
    description: "Completed projects struggle to sell units.",
    dominantM: ["Money", "Manpower"],
    indicator: "Money Indicator",
    commonCauses: [
      "Weak marketing strategy",
      "Poor project positioning",
      "Economy slowdown"
    ]
  },
  {
    id: "property_006",
    industry: "property_development",
    title: "Cash Flow Issues",
    description: "Insufficient liquidity to fund project phases.",
    dominantM: ["Money"],
    indicator: "Money Indicator",
    commonCauses: [
      "Slow buyer loan approvals",
      "High receivables",
      "Poor payment scheduling"
    ]
  },
  {
    id: "property_007",
    industry: "property_development",
    title: "Material Shortages",
    description: "Construction materials unavailable or insufficient.",
    dominantM: ["Materials"],
    indicator: "Material Indicator",
    commonCauses: [
      "Supply chain disruptions",
      "Poor inventory planning",
      "Price fluctuation making suppliers unresponsive"
    ]
  },
  {
    id: "property_008",
    industry: "property_development",
    title: "Poor Quality Workmanship",
    description: "Finished units have defects, causing complaint and rectification.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Unskilled subcontractors",
      "Lack of supervision",
      "Weak quality inspection process"
    ]
  },
  {
    id: "property_009",
    industry: "property_development",
    title: "High Defects During Handover",
    description: "Buyers report many defects after VP (vacant possession).",
    dominantM: ["Manpower", "Materials"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Rushed completion",
      "Low-quality materials",
      "No pre-handover QC"
    ]
  },
  {
    id: "property_010",
    industry: "property_development",
    title: "Environmental / Safety Non-Compliance",
    description: "Project violates safety or environmental guidelines.",
    dominantM: ["Manpower", "Machinery"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "No site safety officer",
      "Poor housekeeping",
      "Lack of safety training"
    ]
  },
  {
    id: "property_011",
    industry: "property_development",
    title: "Land Acquisition Delays",
    description: "Slow progress in acquiring or transferring land titles.",
    dominantM: ["Money", "Manpower"],
    indicator: "Money Indicator",
    commonCauses: [
      "Legal complications",
      "Disputes with landowners",
      "Slow documentation"
    ]
  },
  {
    id: "property_011",
    industry: "property_development",
    title: "Poor Communication Between Teams",
    description: "Information breakdown between construction, sales, finance, etc.",
    dominantM: ["Manpower"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "No centralized communication platform",
      "Silo working culture",
      "Unclear reporting hierarchy"
    ]
  },
  {
    id: "property_013",
    industry: "property_development",
    title: "Contractor Payment Disputes",
    description: "Contractors dispute progress claims and billing.",
    dominantM: ["Money"],
    indicator: "Money Indicator",
    commonCauses: [
      "Poorly defined work scope",
      "Unclear progress measurement",
      "Missing documentation"
    ]
  },
  {
    id: "property_014",
    industry: "property_development",
    title: "Procurement Delays",
    description: "Slow purchase approvals or long lead times for materials.",
    dominantM: ["Materials", "Money"],
    indicator: "Material Indicator",
    commonCauses: [
      "Complex approval process",
      "Last-minute procurement",
      "Overdependence on one vendor"
    ]
  },
  {
    id: "property_015",
    industry: "property_development",
    title: "Inaccurate Project Reporting",
    description: "Reports submitted to management are inconsistent or outdated.",
    dominantM: ["Manpower", "Machinery"],
    indicator: "Manpower Indicator",
    commonCauses: [
      "Manual reporting",
      "No standard template",
      "Staff untrained in reporting"
    ]
  }
];

// ============================================
// COMBINED INDUSTRY PROBLEMS DATABASE
// ============================================
export const allIndustryProblems: IndustryProblem[] = [
  ...constructionProblems,
  ...fnbFullServiceProblems,
  ...fnbQsrProblems,
  ...fnbFastFoodProblems,
  ...fnbFranchiseProblems,
  ...fnbIndependentProblems,
  ...healthcareProblems,
  ...hospitalityProblems,
  ...hotelsAirbnbProblems,
  ...logisticsProblems,
  ...manufacturingProblems,
  ...oilGasProblems,
  ...propertyDevelopmentProblems,
];

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get all problems for a specific industry
export function getProblemsByIndustry(industry: Industry): IndustryProblem[] {
  return allIndustryProblems.filter(p => p.industry === industry);
}

// Get problems by dominant M category
export function getProblemsByM(category: FourMCategory): IndustryProblem[] {
  return allIndustryProblems.filter(p => p.dominantM.includes(category));
}

// Get problem by ID
export function getIndustryProblemById(id: string): IndustryProblem | undefined {
  return allIndustryProblems.find(p => p.id === id);
}

// Search problems by keyword
export function searchIndustryProblems(keyword: string): IndustryProblem[] {
  const lower = keyword.toLowerCase();
  return allIndustryProblems.filter(p => 
    p.title.toLowerCase().includes(lower) ||
    p.description.toLowerCase().includes(lower) ||
    p.commonCauses.some(c => c.toLowerCase().includes(lower))
  );
}

// Get industry statistics
export function getIndustryStats() {
  const stats: Record<Industry, number> = {} as Record<Industry, number>;
  for (const industry of Object.keys(industryLabels) as Industry[]) {
    stats[industry] = getProblemsByIndustry(industry).length;
  }
  return stats;
}

// Get total problem count
export function getTotalProblemCount(): number {
  return allIndustryProblems.length;
}
