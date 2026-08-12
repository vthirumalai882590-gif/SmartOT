# SmartOT Command: AI Operations Consultant Architecture

## 1. Safety Boundary & Operational Role
The AI Operations Consultant is an **operational support engine**. It does **NOT**:
- Diagnose patient clinical conditions
- Suggest clinical pharmaceutical or surgical interventions
- Modify clinical care pathways or doctor orders

All output is strictly **operational, explainable, and advisory**, targeted at surgical suite charge nurses, OT managers, and hospital operations directors.

---

## 2. Dynamic Context Construction
The backend AI context builder never performs unconstrained database dumps. It queries active operational projections:

```typescript
export interface AIOperationsContext {
  hospitalName: string;
  currentTime: string;
  kpis: {
    otUtilization: number;
    activeSurgeries: number;
    readyPatients: number;
    delayedCases: number;
    highRiskCases: number;
    cssdAvailability: number;
  };
  otStatuses: Array<{
    code: string;
    status: string;
    currentPatient?: string;
    currentProcedure?: string;
    delayMinutes: number;
    riskLevel: string;
  }>;
  activeAlerts: Array<{
    id: string;
    severity: string;
    title: string;
    description: string;
    responsibleRole: string;
  }>;
  recentEvents: Array<{
    eventType: string;
    timestamp: string;
    summary: string;
  }>;
  bottlenecks: Array<{
    category: string;
    percentage: number;
    totalDelayMinutes: number;
  }>;
  nextBestActions: Array<{
    priority: string;
    action: string;
    rationale: string;
    impactScore: number;
  }>;
}
```

---

## 3. Standardized Advisory Response Contract
All AI responses adhere to five mandatory structured sections:
1. **SUMMARY**: Executive assessment of surgical suite state.
2. **LIKELY CONTRIBUTORS**: Primary evidence-backed delay factors.
3. **EVIDENCE**: Event timestamps, checklist counts, and duration deltas.
4. **RECOMMENDED OPERATIONAL ACTIONS**: Ranked pragmatic actions for staff.
5. **UNCERTAINTY / LIMITATIONS**: Explicit boundary disclaimer.

---

## 4. Provider Independence
The service uses an abstract `IAIProvider` interface. SmartOT Command includes a zero-dependency **Local Explainable Heuristics Engine** that functions 100% offline, with optional configuration for OpenAI, Anthropic, or Gemini via `.env`.
