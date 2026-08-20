# SmartOT Command ⚡
### AI-Powered Hospital Operations Workflow Orchestration & Operational Intelligence Platform

> **Product Positioning**: An enterprise-grade, AI-powered hospital operations workflow orchestration and operational intelligence platform that connects Admissions, Inpatient Wards, CSSD Sterile Supply Chain, and Operating Theatres (OT) to provide real-time visibility, predictive delay prevention, bottleneck analysis, and explainable operational recommendations.

---

## 🏥 Operational Boundary & Safety Notice
**SmartOT Command is strictly an operational workflow support platform.**  
It does **NOT** diagnose patients, recommend clinical medical treatments, alter clinical care plans, or replace doctors or clinical staff. All AI recommendations and predictions are strictly operational, explainable, and advisory.

---

## 🌟 Core Innovation: The 5 Intelligence Stages
Unlike static hospital dashboards, SmartOT Command converts disconnected hospital events into a correlated stream of operational telemetry:

$$\text{CONNECT} \longrightarrow \text{TRACK} \longrightarrow \text{UNDERSTAND} \longrightarrow \text{PREDICT} \longrightarrow \text{RECOMMEND}$$

1. **CONNECT**: Integrates Admissions, Inpatient Wards, CSSD, and Operating Theatres into one correlated event stream.
2. **TRACK**: Monitors 6-point pre-op patient readiness checklists, digital consent status, and real scannable QR-based sterile instrument pack lifecycles.
3. **UNDERSTAND**: Correlates multi-entity events to identify root causes behind schedule delays and idle theatre capacity.
4. **PREDICT**: Scores delay risks (LOW, MEDIUM, HIGH) and forecasts cascading downstream schedule impacts on subsequent cases.
5. **RECOMMEND**: Generates prioritized next-best operational actions and provides an interactive AI Operations Consultant powered by live operational data introspection and multi-model LLMs.

---

## 🚀 Key Modules & Capabilities

### 1. 🟢 Live OT Command Center & State Machine
- Backend-enforced state machine: `SCHEDULED` $\rightarrow$ `PREPARING` $\rightarrow$ `PATIENT_READY` $\rightarrow$ `PATIENT_TRANSFER` $\rightarrow$ `PATIENT_ARRIVED` $\rightarrow$ `OT_READY` $\rightarrow$ `SURGERY_STARTED` $\rightarrow$ `SURGERY_COMPLETED` $\rightarrow$ `TURNOVER` $\rightarrow$ `AVAILABLE`.
- Safety gates: enforces 6/6 patient readiness and sterile pack verification before theatre entry.
- Dynamic delay attribution and timeline logging for every transition.

### 2. 📋 Inpatient Surgical Readiness & QR Sterile Pack Scanner
- Real camera-based QR barcode scanner (`html5-qrcode`) and real-time QR generation (`qrcode`).
- 6-point pre-op verification: Admission, Surgical Consent, Pre-Op PAC Documentation, Lab Reports, Attending Confirmation, Pre-Op Preparation.
- Auto-resolves critical alerts upon consent sign-off.

### 3. 📦 CSSD Sterile Pack Tracking
- Traceable autoclave batches, sterilization timestamps, expiry enforcement, and surgical pack reservations.

### 4. 🤖 Dynamic AI Operations Consultant (Zero Hardcoding)
- Live data introspection: dynamically inspects live room states, patient checklist status, active alerts, and schedule timings.
- Multi-model inference: Groq Cloud (LLaMA 3.3 70B), xAI Grok (Grok-2), OpenAI (GPT-4o), or explainable local dynamic rule engine.
- Every consultation is logged to `ai_interactions` for auditability and compliance.

### 5. 🛡️ Admin Command & Centralized Data Governance (RBAC)
- Role-Based Access Control enforcing `ADMINISTRATOR`, `OT_MANAGER`, `CSSD_STAFF`, and `WARD_STAFF` privileges.
- Master data management for Operating Theatres, Patients, CSSD Packs, Authenticated Users, and Audit Logs.

---

## 🔑 Demo Persona Accounts

You can sign in using the credentials below or click the quick persona buttons on the Login page:

| Persona Role | Email Address | Password | Department / Primary Scope |
|---|---|---|---|
| **Administrator** | `admin@smartot.hospital` | `Admin@123password` | Hospital-wide Command Center, Data Management, Analytics, Simulator, AI Consultant, Audit Trail |
| **OT Manager** | `otmanager@smartot.hospital` | `OTManager@123password` | Surgical Schedule, OT State Machine Transitions, Turnover Timers |
| **CSSD Staff** | `cssd@smartot.hospital` | `CSSDStaff@123password` | Sterile Pack Lifecycles, Autoclave Cycles, QR Scanner / Verification |
| **Ward Staff** | `ward@smartot.hospital` | `WardStaff@123password` | Inpatient Pre-Op Readiness Checklists, Digital Consent, Patient Transfer |

---

## 💻 Local Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later
- **PostgreSQL** (Optional in local mode; recommended for staging/production)

### 1. Clone & Install
```bash
# Clone the repository
git clone https://github.com/vthirumalai882590-gif/SmartOT.git
cd SmartOT

# Install all dependencies (Monorepo root, backend, frontend, shared)
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
PORT=4000
NODE_ENV=development
JWT_SECRET=smartot_super_secret_jwt_key_2026_production_safe
AI_PROVIDER=local
```

### 3. Launch Development Servers
```bash
npm run dev
```
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:4000`
- **Health Check**: `http://localhost:4000/api/health`

### 4. Run Test Suite
```bash
npm --prefix backend run test
```

---

## 📚 Complete Project Documentation
- [Architecture Blueprint](file:///c:/Users/WELCOME/IOT_P/ARCHITECTURE.md)
- [PostgreSQL Database & Relational Schema](file:///c:/Users/WELCOME/IOT_P/DATABASE.md)
- [REST API Specification](file:///c:/Users/WELCOME/IOT_P/API.md)
- [AI Consultant & Dynamic Reasoning](file:///c:/Users/WELCOME/IOT_P/AI.md)
- [Offline-First Event Sourcing](file:///c:/Users/WELCOME/IOT_P/OFFLINE.md)
- [Workflow State Machines](file:///c:/Users/WELCOME/IOT_P/WORKFLOW.md)
- [Security & RBAC Matrix](file:///c:/Users/WELCOME/IOT_P/SECURITY.md)
- [Testing & Quality Assurance](file:///c:/Users/WELCOME/IOT_P/TESTING.md)
- [Deployment Guide](file:///c:/Users/WELCOME/IOT_P/DEPLOYMENT.md)
- [5–7 Minute Hackathon Demo Script](file:///c:/Users/WELCOME/IOT_P/docs/demo-script.md)
