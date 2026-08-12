# SmartOT Command: Workflow State Machine Specifications

## 1. Operating Theatre State Machine

Operating Theatres move through a deterministic finite state machine where every valid transition generates an immutable workflow event.

```mermaid
stateDiagram-v2
    [*] --> SCHEDULED
    SCHEDULED --> PREPARING : Pre-op prep begins
    PREPARING --> PATIENT_READY : Readiness 6/6 complete
    PATIENT_READY --> PATIENT_TRANSFER : Staff clicks 'Start Transfer'
    PATIENT_TRANSFER --> PATIENT_ARRIVED : Staff clicks 'Patient Arrived'
    PATIENT_ARRIVED --> OT_READY : Pack verified & Anesthesia ready
    OT_READY --> SURGERY_STARTED : Incision commenced
    SURGERY_STARTED --> SURGERY_COMPLETED : Surgery concluded
    SURGERY_COMPLETED --> TURNOVER : Room turnover begins
    TURNOVER --> AVAILABLE : Sanitization complete within benchmark
    TURNOVER --> DELAYED : Turnover overrun > 25m benchmark
    DELAYED --> AVAILABLE : Room finally cleared
    AVAILABLE --> [*]
```

### State Definitions:
- **`SCHEDULED`**: Procedure is booked in the daily surgical block.
- **`PREPARING`**: Ward nursing staff and OT circulator begin patient and tray staging.
- **`PATIENT_READY`**: Inpatient checklist is 6/6 verified and consent is signed.
- **`PATIENT_TRANSFER`**: Inpatient is in transit from Ward to Surgical Suite.
- **`PATIENT_ARRIVED`**: Patient has entered the sterile theatre anteroom.
- **`OT_READY`**: Anesthesia induction and sterile surgical trays verified.
- **`SURGERY_STARTED`**: Surgical incision started (`actualStartTime` logged).
- **`SURGERY_COMPLETED`**: Drapes down, patient extubated (`actualEndTime` logged).
- **`TURNOVER`**: Environmental cleaning and terminal disinfection in progress (`turnoverStartedAt` logged).
- **`AVAILABLE`**: Room certified ready for next surgical intake.
- **`DELAYED`**: Active procedural or turnaround overrun exceeding benchmark buffer.

---

## 2. CSSD Sterile Pack Lifecycle

```mermaid
stateDiagram-v2
    [*] --> COLLECTED : Dirty trays returned
    COLLECTED --> STERILIZING : Autoclave steam cycle (134°C)
    STERILIZING --> STERILIZED : Biological/chemical indicators certified
    STERILIZED --> STORED : Transported to CSSD sterile warehouse
    STORED --> AVAILABLE : QA inspects packaging
    AVAILABLE --> ASSIGNED : Scanned & matched to Operating Theatre
    ASSIGNED --> IN_USE : Deployed in active surgical field
    IN_USE --> RETURNED : Post-op dirty collection
    RETURNED --> REPROCESSING : Ultrasonic cleaning & re-wrap
    REPROCESSING --> COLLECTED
    AVAILABLE --> EXPIRED : Expiry timestamp surpassed
    EXPIRED --> BLOCKED : QR scanner rejects deployment
```

---

## 3. Patient Journey Timeline
Every patient undergoes timestamped progression across departments:
$$\text{Admission} \longrightarrow \text{Documentation} \longrightarrow \text{Consent} \longrightarrow \text{Checklist (6/6)} \longrightarrow \text{Transfer} \longrightarrow \text{OT Arrival} \longrightarrow \text{Surgery} \longrightarrow \text{PACU/Recovery}$$
