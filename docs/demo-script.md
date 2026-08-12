# SmartOT Command: Complete Scripted Demo Scenario Walkthrough

## Scenario Overview
- **Target Inpatient**: Arthur Pendelton (`pat_1024` / `MRN-2026-1024`)
- **Procedure**: Emergency Appendectomy
- **Scheduled Room**: Operating Theatre 3 (`OT-03`) at 14:00
- **Assigned Sterile Set**: `CSSD-021` (Appendectomy Set)

---

## Step-by-Step Walkthrough

### 1. Hero Command Center Observation
1. Sign in as **Administrator** (`admin@smartot.hospital` / `Admin@123password`).
2. Observe Hero KPIs:
   - OT Utilization: **82%**
   - Delayed Cases: **2**
   - Active Critical Alert: **"Missing Surgical Consent: Patient P-1024"**
   - Current Bottleneck: **Patient Transfer & Incomplete Ward Consent**
3. Notice **OT-03** card: Current status is `PREPARING` with `+18m Delay` and `HIGH RISK`.

### 2. Ward Readiness & Digital Consent Verification
1. Navigate to **Patients & Readiness** (`/patients`).
2. Locate **Arthur Pendelton (P-1024)** in Pre-Op Ward 4B.
3. Observe readiness status is **5/6 NOT READY** and Consent is **MISSING**.
4. Open the checklist modal:
   - Switch Consent status from `MISSING` to `VERIFIED`.
   - Complete remaining checklist items.
5. Patient status transitions to **6/6 READY FOR OT**.
6. The critical alert in the Command Center auto-resolves.

### 3. CSSD QR Verification & Pack Assignment
1. Navigate to **CSSD & QR Verification** (`/cssd`).
2. Click **Launch QR Scanner / Verifier**.
3. Scan **CSSD-021** (Appendectomy Set).
4. System displays **GREEN: PACK VERIFIED** (Certified biological/chemical batch indicators, Valid sterility).
5. Click **Confirm & Assign to OT-03**.

*(Optional test: Type `CSSD-099` into scanner to demonstrate **RED: PACK BLOCKED** due to expired sterile barrier).*

### 4. Patient Transfer Execution
1. In Patients page, click **Initiate Patient Transfer**.
2. OT-03 transitions to `PATIENT_TRANSFER` (Patient in transit).
3. In OT Schedule or Command Center, click **Patient Arrived**.
4. OT-03 transitions to `PATIENT_ARRIVED` and then `OT_READY`.

### 5. Surgery Execution & Turnover Overrun
1. On OT-03 card, click **Start Surgery** (Status: `SURGERY_STARTED`).
2. Click **Finish Surgery** (Status: `SURGERY_COMPLETED`).
3. Click **Start Turnover** (Turnover benchmark timer begins: 25 minutes).
4. Simulate a 35-minute turnover overrun by clicking **Mark Delayed**.
5. Alert engine raises: **"Turnover Benchmark Overrun: OT-03"**.

### 6. AI Operations Consultant Investigation
1. Open the **AI Operations Consultant** drawer.
2. Ask: *"Why is OT-03 delayed?"*
3. Observe the structured advisory response:
   - **SUMMARY**: Explains the pre-op consent bottleneck and subsequent turnover overrun.
   - **LIKELY CONTRIBUTORS**: Attributes specific time deltas to Ward 4B hold and room turnaround.
   - **EVIDENCE**: Cites timestamped event stream.
   - **RECOMMENDED ACTIONS**: Suggests dispatching auxiliary turnover cleaning kits and standardizing pre-op T-30 checklists.

### 7. What-If Capacity Simulation
1. Navigate to **What-If Simulator** (`/simulator`).
2. Adjust turnover slider from 0 to -10 minutes.
3. Observe simulated suite utilization rise from **78.4% to 83.2%**, recovering **~105 minutes daily** and enabling **+6 additional surgeries weekly**.
