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
5. **RECOMMEND**: Generates prioritized next-best operational actions and provides an interactive AI Operations Consultant powered by Groq Cloud (LLaMA 3.3 70B).

---

## 🚀 Key Modules & Capabilities

### 1. 🟢 Live OT Command Center & State Machine
- Interactive state-aware workflow: `AVAILABLE` $\rightarrow$ `SCHEDULED` $\rightarrow$ `PREPARING / STAGING` $\rightarrow$ `PATIENT WAITING` $\rightarrow$ `PATIENT IN OT` $\rightarrow$ `SURGERY IN PROGRESS` $\rightarrow$ `SURGERY COMPLETED` $\rightarrow$ `TURNOVER / SANITIZATION` $\rightarrow$ `AVAILABLE`.
- Clinical safety gates: enforces 6/6 patient readiness and sterile pack verification before theatre entry.
- Dynamic delay attribution and timeline logging for every transition.

### 2. 📋 Inpatient Surgical Readiness & Real Camera QR Scanner
- Real camera-based QR barcode scanner (`html5-qrcode`) and real-time QR generation (`qrcode`).
- Real-time 6-point verification: Surgical Consent, Pre-Op Fasting, Lab Reports, Site Marking, Vitals Clearance, Anesthesia Review.
- Blocker detection with 1-click nurse coordinator resolution.

### 3. 📦 CSSD Sterile Pack Tracking
- Traceable autoclave batches, sterilization timestamps, expiry enforcement, and surgical pack reservations.

### 4. 🤖 Groq Cloud AI Operations Consultant
- Powered by `llama-3.3-70b-versatile` on Groq Cloud ultra-fast inference.
- Provides real-time delay explanations, next-best actions, and bottleneck mitigations across Global Navbar, Global Drawer, Analytics, and Dashboard.

### 5. 🛡️ Admin Command & Centralized Data Governance (RBAC)
- Role-Based Access Control enforcing `ADMINISTRATOR` privileges for configuration, master data edits, and demo resets.
- Read-Only Mode for staff roles with interactive elevation prompts.
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
Create a `.env` file in the root or `backend/` directory:
```env
PORT=4000
NODE_ENV=development
JWT_SECRET=smartot_super_secret_jwt_key_2026_production_safe
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL_NAME=llama-3.3-70b-versatile
```

### 3. Launch Development Servers
```bash
npm run dev
```
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:4000`

---

## 🚢 Cloud Deployment Guide

### Option 1: 1-Click Deployment on Render (Free & Recommended)
1. Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** → **Web Service**.
2. Connect your GitHub repository: `https://github.com/vthirumalai882590-gif/SmartOT`.
3. Configure settings:
   - **Runtime**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
4. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `4000`
   - `AI_PROVIDER` = `groq`
   - `GROQ_API_KEY` = `your_groq_api_key_here`
   - `GROQ_MODEL_NAME` = `llama-3.3-70b-versatile`
   - `JWT_SECRET` = *(Any random string)*
5. Click **Deploy Web Service**!

---

### Option 2: Railway
1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Select your `SmartOT` repository.
3. In **Settings** → **Variables**, set `PORT=4000`, `NODE_ENV=production`, and your `GROQ_API_KEY`.
4. Click **Generate Domain** under Networking.

---

### Option 3: Docker Container
```bash
# Build the Docker image
docker build -t smartot-command:latest .

# Run the container
docker run -d \
  --name smartot \
  -p 4000:4000 \
  -e NODE_ENV=production \
  -e GROQ_API_KEY=your_groq_api_key_here \
  -e AI_PROVIDER=groq \
  smartot-command:latest
```

---

## 🧪 Testing
```bash
# Run backend test suite
npm --prefix backend test

# Run production build validation
npm run build
```

---

## 📐 Technology Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Vite, HTML5-QRCode.
- **Backend**: Node.js, Express.js (v5), TypeScript.
- **AI Engine**: Groq Cloud API (`llama-3.3-70b-versatile`) with structured JSON schema responses.
- **Data & Persistence**: Relational schema with transactional persistence, audit logs, and automatic seeding.
- **Offline Sync**: Local event queue with automatic network state detection and replay synchronization.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
