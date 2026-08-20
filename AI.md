# SmartOT AI Operations Consultant Specification

## 1. Core Architecture

The SmartOT AI Operations Consultant acts as an explainable decision-support copilot for hospital surgical coordinators, nurse managers, and operating room directors.

```
User Query
   │
   ▼
Intent & Entity Extractor (Classifies query, extracts OT codes, patient MRNs, bottlenecks)
   │
   ▼
Live Data Introspection (Queries real-time OT state, checklist status, CSSD sterility, delay telemetry)
   │
   ▼
Deterministic Rule & Risk Engine (Computes root cause, likely contributors, quantitative evidence)
   │
   ▼
LLM Inference Layer (Groq Llama-3 / xAI Grok / OpenAI GPT-4o / Local Dynamic Fallback)
   │
   ▼
Strict Schema Validation & Safety Gate (Ensures non-clinical operational focus + disclaimer)
   │
   ▼
Audit & Interaction Logger (Persists query, context snapshot, response to `ai_interactions`)
   │
   ▼
User
```

---

## 2. Structured Response Schema

Every AI response adheres strictly to the following schema:
```json
{
  "summary": "OT-03 is currently delayed by 18 minutes in state PREPARING due to missing surgical consent in Ward 4B.",
  "likelyContributors": [
    "Inpatient surgical consent verification is MISSING in Ward 4B.",
    "Pre-op readiness checklist incomplete (2/6 items completed)."
  ],
  "evidence": [
    "OT-03 current status: PREPARING (Operating Theatre 3)",
    "Current operational delay: 18 mins (Risk Level: HIGH)",
    "Patient: Arthur Pendelton (MRN-2026-1024) in Ward 4B",
    "Pre-op readiness checklist: 2/6 completed (Consent: MISSING)",
    "Active Alert [CRITICAL]: Missing Surgical Consent: Patient P-1024",
    "Sterile pack (Appendectomy Set) availability verified in Central Sterile inventory."
  ],
  "recommendedActions": [
    "Expedite patient and surrogate consent verification in Ward 4B prior to transport.",
    "Complete outstanding pre-operative ward documentation for Arthur Pendelton."
  ],
  "uncertaintyLimitations": "Operational decision support only. Derived from live surgical suite telemetry. Clinical decisions remain the sole responsibility of licensed medical staff.",
  "timestamp": "2026-08-19T09:45:00.000Z"
}
```

---

## 3. Strict Safety & Ethical Boundaries

1. **Non-Clinical Boundary**:
   - The AI **NEVER** provides medical diagnoses, drug prescriptions, surgical technique recommendations, or clinical treatment plans.
   - The AI is strictly focused on **logistical, scheduling, resource staging, turnover, and operational risk mitigation**.
2. **Mandatory Disclaimer**:
   - Every response includes the disclaimer: `"Operational decision support only. Derived from live surgical suite telemetry. Clinical decisions remain the sole responsibility of licensed medical staff."`
3. **Traceability & No Hallucination**:
   - If queried about an entity not present in the active hospital database, the system explicitly returns: `"Insufficient operational data for the requested entity."`
