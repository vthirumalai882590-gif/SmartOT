# SmartOT Architectural Blueprints

## 1. System Architecture

```
                                  SMARTOT PLATFORM
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
         FRONTEND WORKSPACE                              BACKEND WORKSPACE
  React 18 + TypeScript + Vite                   Express 4 + TypeScript + tsx
  TailwindCSS + Framer Motion                     Modular Service Architecture
                  │                                               │
                  │                                  ┌────────────┴────────────┐
                  │                                  ▼                         ▼
                  │                        Controllers & Services     Intelligence Engines
                  │                        - Patient Readiness        - Alert Rule Engine
                  │                        - OT State Machine         - Delay Risk Engine
                  │                        - CSSD Tracking            - Next-Best-Action
                  │                        - Patient Transfers        - Correlation Engine
                  │                        - Audit Logger             - What-If Simulator
                  │                                  │                         │
                  │                                  └────────────┬────────────┘
                  │                                               ▼
                  │                                    Data Access Layer (DAL)
                  │                                  PostgreSQL / Unified DB
                  │                                               │
                  └──────────────── REST API ─────────────────────┘
                                          │
                             Dynamic AI Context Builder
                                          │
                        Multi-Model AI Inference Layer
                     (Groq / Grok / OpenAI / Local-Dynamic)
```

---

## 2. Core Value Chain: Connect → Track → Understand → Predict → Recommend

1. **Connect**: Real-time synchronization across Wards, Central Sterile (CSSD), Admissions, and Surgical Suites.
2. **Track**: Strict state machines for Operating Theatres, Patient Readiness checklists, and Sterile Tray barcodes.
3. **Understand**: Root-cause delay attribution analyzing transfer duration, turnover friction, and documentation lag.
4. **Predict**: Cascading downstream surgical schedule risk scoring and CSSD instrument tray demand forecasting.
5. **Recommend**: AI Operations Consultant and Next-Best-Action engine delivering prioritized, actionable recommendations with quantitative evidence.
