export const professionalServicesSignals = [

  {
    signal: "low_billable_hours",
    description: "Professionals recording fewer billable hours than expected",
    signalType: "utilization",
    relatedKPI: "billable_utilization"
  },

  {
    signal: "excess_admin_work",
    description: "Staff spending excessive time on administrative tasks",
    signalType: "process",
    relatedKPI: "billable_utilization"
  },

  {
    signal: "staff_overload",
    description: "Employees handling excessive workloads",
    signalType: "workforce",
    relatedKPI: "staff_utilization"
  },

  {
    signal: "staff_idle_time",
    description: "Employees without sufficient project assignments",
    signalType: "workforce",
    relatedKPI: "staff_utilization"
  },

  {
    signal: "project_delay",
    description: "Projects exceeding planned timelines",
    signalType: "project_management",
    relatedKPI: "project_delivery_time"
  },

  {
    signal: "missed_deadline",
    description: "Project milestones not met on time",
    signalType: "project_management",
    relatedKPI: "project_delivery_time"
  },

  {
    signal: "onboarding_delay",
    description: "Delays in client onboarding procedures",
    signalType: "client_management",
    relatedKPI: "project_start_time"
  },

  {
    signal: "documentation_delay",
    description: "Required documentation delaying project initiation",
    signalType: "client_management",
    relatedKPI: "project_start_time"
  },

  {
    signal: "low_project_margin",
    description: "Projects generating lower-than-expected profit margins",
    signalType: "financial",
    relatedKPI: "profit_margin"
  },

  {
    signal: "client_backlog",
    description: "Accumulation of unfulfilled client service requests",
    signalType: "client_management",
    relatedKPI: "client_response_time"
  }

];
