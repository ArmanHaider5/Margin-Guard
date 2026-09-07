# MGD BUILD PLAYBOOK

Manufacturing General Diagnostic (MGD) Platform

Purpose:
This playbook defines **how to safely expand and maintain the MGD diagnostic platform** without breaking its architecture.

This document should be followed whenever:

• adding a new industry
• adding new root causes
• expanding signal detection
• tuning scoring logic
• improving diagnostic reasoning

---

# 1. SYSTEM PRINCIPLES

MGD follows a strict architecture:

ENGINE (logic)
+
INDUSTRY MODELS (knowledge)

The engine performs reasoning.

Industry models provide **domain knowledge**.

Engine code must remain **industry-agnostic**.

Industry logic must exist inside:

```
/industry-models/{industry}
```

---

# 2. CORE ENGINE MODULES

Engine files are located in:

```
/diagnostics
```

Modules:

| Module                         | Purpose                                  |
| ------------------------------ | ---------------------------------------- |
| root-cause-tree-engine.ts      | Builds consulting root cause hierarchy   |
| causal-chain-engine.ts         | Detects operational causal relationships |
| consulting-narrative-engine.ts | Generates consulting explanations        |
| cost-saving-engine.ts          | Estimates operational savings            |
| industry-benchmark-engine.ts   | Compares performance to benchmarks       |

These modules must **not be modified for industry-specific logic**.

Industry logic belongs in `/industry-models`.

---

# 3. INDUSTRY MODEL STRUCTURE

Every industry must follow this structure:

```
/industry-models/{industry}
```

Example:

```
/industry-models/healthcare
```

Required files:

```
{industry}-root-causes.ts
{industry}-signals.ts
{industry}-benchmarks.ts
{industry}-mappings.ts
```

---

# 4. ROOT CAUSE LIBRARY

Each industry must define its own root cause library.

Example file:

```
healthcare-root-causes.ts
```

Structure:

```
export const healthcareRootCauses = [
  {
    id: "hc-staff-shortage",
    category: "Manpower",
    name: "Chronic clinical staff shortages",
    description: "Insufficient staffing levels affecting patient throughput",
    triggers: ["staff shortage", "overworked nurses"]
  }
]
```

Recommended size:

```
80 – 120 root causes per industry
```

---

# 5. SIGNAL VOCABULARY

Signals detect operational issues inside documents.

Example file:

```
healthcare-signals.ts
```

Example signals:

```
"patient backlog"
"long waiting time"
"bed shortage"
"staff burnout"
"treatment delay"
```

Signals should reflect **real operational language used in the industry**.

---

# 6. ROOT CAUSE MAPPINGS

Signals must map to root causes.

File:

```
{industry}-mappings.ts
```

Example:

```
export const healthcareMappings = {
  "patient backlog": ["hc-capacity-overload"],
  "staff burnout": ["hc-staff-shortage"],
  "treatment delay": ["hc-process-inefficiency"]
}
```

This mapping allows the engine to **infer likely root causes from signals**.

---

# 7. INDUSTRY BENCHMARKS

Benchmarks define expected industry performance.

File:

```
{industry}-benchmarks.ts
```

Example:

```
export const healthcareBenchmarks = {
  patient_wait_time: { target: 30, unit: "minutes" },
  bed_occupancy: { target: 85, unit: "%" },
  readmission_rate: { target: 5, unit: "%" }
}
```

These values drive **severity evaluation**.

---

# 8. SCORING RULES

Root cause scoring follows these rules.

Primary cause:

```
highest score overall
```

Secondary causes:

```
same category AND score ≥ 40
```

Contributing causes:

```
score ≥ 20
```

These rules are implemented inside:

```
root-cause-tree-engine.ts
```

Do not modify scoring logic unless necessary.

---

# 9. CAUSAL CHAIN LOGIC

Causal chains explain how problems propagate.

Example:

```
Staff shortage
↓
Long patient wait times
↓
Treatment delays
↓
Patient dissatisfaction
```

Chains should represent **real operational cause-effect relationships**.

---

# 10. CONSULTING NARRATIVE OUTPUT

The system must generate consulting-style explanations.

Example:

```
Evidence suggests the primary operational issue is staff shortages.
Supporting factors include excessive workload and patient backlog.

This results in the following operational impact chain:

Staff shortage → Patient backlog → Treatment delay → Patient dissatisfaction.
```

Narratives must remain **clear, factual, and consulting-oriented**.

---

# 11. COST SAVING ESTIMATION

Savings must reflect realistic operational improvements.

Example opportunities:

```
Process optimisation
Capacity utilisation improvements
Waste reduction
Labour efficiency
Inventory optimisation
```

Savings should always be expressed as **estimated annual ranges**.

---

# 12. INDUSTRY EXPANSION ROADMAP

Recommended expansion order:

1 Healthcare
2 Logistics
3 Retail
4 Construction
5 Professional Services

Each new industry must replicate the **Manufacturing Reference Model**.

---

# 13. DEVELOPMENT RULES

Always follow these rules:

1 Do not redesign the engine.
2 Industry knowledge must live in `/industry-models`.
3 Maintain separation between engine and industry logic.
4 Root cause libraries should remain within 80–120 entries.
5 Signals must reflect real operational language.

---

# 14. TESTING NEW INDUSTRIES

When adding an industry, verify:

```
✔ signals detected
✔ root causes triggered
✔ causal chains generated
✔ narrative generated
✔ cost savings produced
✔ benchmarks evaluated
```

Manufacturing should always be used as the **reference test case**.

---

# 15. LONG-TERM VISION

MGD is designed to become a **multi-industry diagnostic intelligence platform**.

Future capabilities may include:

• automated consulting reports
• predictive operational risk detection
• AI-assisted business transformation planning

---

END OF PLAYBOOK
