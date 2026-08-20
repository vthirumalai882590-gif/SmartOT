# SmartOT 5–7 Minute Live Hackathon Presentation Script

## Overview
This demo proves how SmartOT replaces disjointed paper checklists, whiteboard schedules, and telephone delay bottlenecks with **connected operational intelligence**.

---

## ⏱️ Live Demo Timeline

### Step 1: Command Center Overview (0:00 – 1:00)
- **Action**: Open `http://localhost:5173`.
- **Narration**: *"Welcome to SmartOT Command Center. At a glance, the operational director sees all 4 operating theatres in real time. We see OT-01 in surgery, OT-02 available, OT-04 in turnover, and OT-03 flagged in HIGH RISK state with an 18-minute delay."*
- **Highlight**: Point out the **Live Hospital Flow** pipeline showing counts across Admissions → Wards → CSSD → Transfer → OT → Turnover.

### Step 2: Operational Exception & AI Consultation (1:00 – 2:30)
- **Action**: Click **AI Consultant** in top header or ask: *"Why is OT-03 delayed?"*
- **Narration**: *"Rather than calling three departments, the surgical coordinator asks the SmartOT AI Operations Consultant. In real time, the AI queries live hospital telemetry: it identifies that Patient Arthur Pendelton (P-1024) in Pre-Op Ward 4B is missing surgical consent, holding up room staging. Notice the evidence breakdown and clear actionable next steps."*
- **Highlight**: Emphasize zero hardcoding—the response reflects live database facts and includes strict operational safety disclaimers.

### Step 3: Ward Action & Patient Readiness Resolution (2:30 – 3:45)
- **Action**: Switch persona to **Ward Staff** using the top-right persona switcher. Navigate to **Patients** (`/patients`) and select **Arthur Pendelton (P-1024)**.
- **Action**: Toggle **Surgical Consent** to **VERIFIED** and complete the checklist.
- **Narration**: *"The ward nurse completes the consent sign-off. Immediately, Arthur's readiness transitions to 6/6 READY FOR OT. The critical consent alert on the dashboard auto-resolves, and the patient is cleared for transfer."*

### Step 4: Patient Transfer & QR Sterile Tray Verification (3:45 – 5:00)
- **Action**: Trigger **Start Transfer** from Ward 4B to OT-03.
- **Action**: Navigate to **CSSD** (`/cssd`) and open **QR Scanner**. Scan tray `CSSD-021` (Appendectomy Set).
- **Narration**: *"The transfer tracking engine logs transit time against our 15-minute benchmark. In the theatre anteroom, the nurse scans the sterile tray's QR code. SmartOT validates batch sterilization certificates, ensures it is not expired, and confirms tray-to-procedure compatibility before the sterile drape is opened."*

### Step 5: Live State Progression & What-If Capacity Simulation (5:00 – 6:30)
- **Action**: In OT Schedule, click **Start Surgery** on OT-03.
- **Action**: Navigate to **Simulator** (`/simulator`). Drag turnover slider from 25m to 15m.
- **Narration**: *"OT-03 advances to IN SURGERY, turning green across all command screens. Finally, hospital leadership uses the What-If Simulator to calculate capacity gains: reducing room turnover by 10 minutes recovers over 100 minutes of surgical capacity per day, unlocking 6.5 additional surgeries per week."*

### Step 6: Summary & Closing (6:30 – 7:00)
- **Narration**: *"Connect → Track → Understand → Predict → Recommend. SmartOT delivers a safer, faster, and intelligence-driven surgical enterprise. Thank you!"*
