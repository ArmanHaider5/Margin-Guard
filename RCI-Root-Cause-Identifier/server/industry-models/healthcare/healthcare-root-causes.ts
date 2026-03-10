export const healthcareRootCauses = [

  {
    id: "HC001",
    category: "Patient Flow",
    rootCause: "Inefficient patient triage process",
    description: "Poor triage prioritisation leading to patient waiting time increase",
    signals: ["triage_delay", "patient_queue"],
    kpis: ["patient_wait_time"],
    impactWeight: 0.85
  },

  {
    id: "HC002",
    category: "Scheduling",
    rootCause: "Poor appointment scheduling",
    description: "Overbooking and inefficient scheduling reduce consultation throughput",
    signals: ["appointment_delay", "doctor_idle_time"],
    kpis: ["appointment_adherence", "patient_wait_time"],
    impactWeight: 0.8
  },

  {
    id: "HC003",
    category: "Operating Theatre",
    rootCause: "Low operating theatre utilisation",
    description: "Operating theatres idle due to poor surgical scheduling",
    signals: ["ot_idle_time", "surgery_delay"],
    kpis: ["ot_utilisation"],
    impactWeight: 0.9
  },

  {
    id: "HC004",
    category: "Clinical Operations",
    rootCause: "Duplicate diagnostic testing",
    description: "Repeated lab or imaging tests increasing cost and patient delays",
    signals: ["duplicate_tests", "lab_backlog"],
    kpis: ["cost_per_patient", "patient_wait_time"],
    impactWeight: 0.75
  },

  {
    id: "HC005",
    category: "Staffing",
    rootCause: "Clinical staff shortages",
    description: "Insufficient nurses or doctors causing patient backlog",
    signals: ["staff_shortage", "staff_overtime"],
    kpis: ["staff_overtime", "patient_wait_time"],
    impactWeight: 0.88
  },

  {
    id: "HC006",
    category: "Hospital Capacity",
    rootCause: "Bed capacity shortages",
    description: "Insufficient hospital beds causing admission delays",
    signals: ["bed_shortage", "patient_backlog"],
    kpis: ["bed_occupancy", "patient_wait_time"],
    impactWeight: 0.9
  },

  {
    id: "HC007",
    category: "Emergency Department",
    rootCause: "Emergency department overcrowding",
    description: "Excessive patient arrivals exceeding ED capacity",
    signals: ["ed_backlog", "patient_wait_time"],
    kpis: ["ed_wait_time"],
    impactWeight: 0.87
  },

  {
    id: "HC008",
    category: "Clinical Process",
    rootCause: "Slow diagnostic turnaround",
    description: "Delays in lab or imaging results slowing treatment decisions",
    signals: ["lab_delay", "imaging_delay"],
    kpis: ["diagnostic_turnaround_time"],
    impactWeight: 0.78
  }

];
