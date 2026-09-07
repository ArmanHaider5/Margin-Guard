# MGD – MASTER ARCHITECTURE DOCUMENT

Manufacturing General Diagnostic (MGD) Platform

Version: 1.0
Status: Manufacturing Reference Model Complete

---

# 1. SYSTEM PURPOSE

MGD is an **AI-assisted operational diagnostic platform** designed to analyze business documents and identify operational root causes using consulting-style reasoning.

The system converts **unstructured operational data** into:

* root cause diagnostics
* causal chains
* consulting narratives
* cost-saving opportunities
* industry benchmark comparisons

The platform is designed to emulate **consulting operational diagnostics used by McKinsey, BCG, Bain, and Big4 consulting firms.**

---

# 2. CORE SYSTEM PHILOSOPHY

The platform follows a **layered diagnostic reasoning model**.

Operational logic flow:

```
Documents
↓
Signals
↓
Evidence Signals
↓
Root Cause Scoring
↓
Root Cause Tree
↓
Causal Chains
↓
Consulting Narrative
↓
Cost Saving Opportunities
↓
Industry Benchmark Evaluation
```

Each stage enriches the diagnosis.

The engine separates:

```
Diagnostic Engine (logic)

Industry Models (knowledge)
```

This architecture allows **rapid expansion across industries**.

---

# 3. ENGINE ARCHITECTURE

The diagnostic engine resides in:

```
/diagnostics
```

Modules:

### Root Cause Tree Engine

File:

```
root-cause-tree-engine.ts
```

Purpose:
Transform flat root causes into a consulting-style hierarchy.

Structure produced:

```
Primary Cause
Secondary Causes
Contributing Factors
```

Scoring rules:

```
Primary
Highest score overall

Secondary
Same category AND score ≥ 40

Contributing
Score ≥ 20
```

---

### Causal Chain Engine

File:

```
causal-chain-engine.ts
```

Purpose:
Detect operational cause-effect chains.

Example:

```
PM overdue
↓
Maintenance backlog
↓
Machine breakdown
↓
Downtime
↓
Overtime
↓
Missed delivery
```

These chains explain **problem propagation across operations**.

---

### Consulting Narrative Engine

File:

```
consulting-narrative-engine.ts
```

Purpose:
Convert structured diagnostics into a consulting explanation.

Example narrative:

```
Evidence suggests the primary operational issue is reactive maintenance culture.
Supporting factors include maintenance backlog and PM schedule non-compliance.

This results in the following operational impact chain:

Maintenance backlog → Machine breakdown → Downtime → Overtime → Missed delivery.
```

---

### Cost Saving Engine

File:

```
cost-saving-engine.ts
```

Purpose:
Estimate financial impact of operational improvements.

Example outputs:

```
Maintenance optimisation
RM 50,000 – RM 150,000 annually

Downtime recovery
RM 120,000 – RM 350,000 annually
```

Savings categories include:

* maintenance optimisation
* downtime reduction
* scrap reduction
* labour efficiency
* inventory optimisation

---

### Industry Benchmark Engine

File:

```
industry-benchmark-engine.ts
```

Purpose:
Compare operational KPIs against industry standards.

Example output:

| KPI      | Actual   | Benchmark | Severity |
| -------- | -------- | --------- | -------- |
| OTD      | 70%      | 95%       | Critical |
| Downtime | 22h/week | 6h/week   | Critical |

Severity classification:

```
Actual ≤ Target → Normal

Actual > Target → High

Actual > Target × 1.5 → Critical
```

---

# 4. DOCUMENT INTELLIGENCE LAYER

The platform supports document ingestion from:

```
PDF
DOCX
XLSX
```

Extracted content is converted into **normalized operational text**.

Detected signals include:

* machine breakdown
* downtime
* overtime
* scrap
* rework
* line stoppage
* maintenance overdue
* lead time increase

These signals feed the diagnostic engine.

---

# 5. SIGNAL CLASSIFICATION MODEL

Signals are grouped using the **4M operational framework**:

```
Money
Manpower
Machinery
Materials
```

Example signal categories:

| Category  | Example Signals               |
| --------- | ----------------------------- |
| Money     | cost increase, margin erosion |
| Manpower  | fatigue, overtime             |
| Machinery | breakdowns, downtime          |
| Materials | scrap, inventory shortage     |

This classification improves root cause scoring.

---

# 6. ROOT CAUSE INTELLIGENCE

The manufacturing model includes:

```
104 manufacturing root causes
```

These represent operational failure patterns observed in real factories.

Example root causes:

```
Reactive maintenance culture
Maintenance backlog
PM compliance failure
Electrical system failure
Hydraulic system degradation
Material shortages
Production planning instability
Workforce overload
```

Each root cause includes:

```
ID
Category
Description
Trigger signals
```

---

# 7. INDUSTRY MODEL ARCHITECTURE

Industry knowledge is stored separately from the engine.

Directory:

```
/industry-models
```

Manufacturing model:

```
/industry-models/manufacturing
```

Files:

```
manufacturing-root-causes.ts
manufacturing-benchmarks.ts
manufacturing-signals.ts
manufacturing-mappings.ts
```

Purpose of each file:

### Root Causes

Defines the diagnostic library.

### Benchmarks

Industry performance standards.

### Signals

Operational vocabulary detection.

### Mappings

Signal → root cause relationships.

---

# 8. MANUFACTURING REFERENCE MODEL

Manufacturing is the **reference implementation**.

It includes:

```
104 root causes
KPI detection
causal chains
consulting narratives
cost savings
benchmark comparison
```

All future industries must replicate this structure.

---

# 9. INDUSTRY EXPANSION FRAMEWORK

New industries are added under:

```
/industry-models/{industry}
```

Example:

```
/industry-models/healthcare
/industry-models/logistics
/industry-models/retail
/industry-models/construction
/industry-models/professional-services
```

Each industry must define:

```
root causes
signals
benchmarks
mappings
```

The **diagnostic engine remains unchanged**.

---

# 10. DEVELOPMENT RULES

To maintain system integrity:

1. Do not modify core engine logic unnecessarily.
2. New industries must be implemented via `/industry-models`.
3. Root cause scoring thresholds must remain consistent.
4. Diagnostic pipelines must preserve the layered reasoning model.
5. Always maintain separation between **engine logic and industry knowledge**.

---

# 11. CURRENT SYSTEM STATUS

Manufacturing reference model:

```
COMPLETE
```

Operational capabilities:

✔ document intelligence
✔ signal extraction
✔ root cause scoring
✔ root cause trees
✔ causal chains
✔ consulting narrative generation
✔ cost saving estimation
✔ industry benchmark comparison

---

# 12. NEXT DEVELOPMENT PHASE

Phase 2 – Industry Expansion.

Recommended order:

```
1 Healthcare
2 Logistics
3 Retail
4 Construction
5 Professional Services
```

Each industry will replicate the manufacturing diagnostic structure.

---

END OF DOCUMENT
