# SmartOT Workflow State Machines & Operational Progression

## 1. Operating Theatre (OT) State Machine

The operating theatre lifecycle is strictly enforced by the backend (`backend/src/repositories/ot.repository.ts` and `shared/src/state-machines.ts`).

```
  ┌─────────────────────────────────────────────────────────────┐
  │                                                             │
  ▼                                                             │
SCHEDULED ──► PREPARING ──► PATIENT_READY ──► PATIENT_TRANSFER  │
                                                    │           │
                                                    ▼           │
AVAILABLE ◄── TURNOVER ◄── SURGERY_COMPLETED ◄── SURGERY_STARTED ◄── OT_READY ◄── PATIENT_ARRIVED
    │
    └──► PREPARING (Direct scheduling into available room)
```

### Valid Transition Matrix
| From State | Allowed Target States |
| :--- | :--- |
| `SCHEDULED` | `PREPARING`, `DELAYED`, `CANCELLED` |
| `PREPARING` | `PATIENT_READY`, `DELAYED` |
| `PATIENT_READY` | `PATIENT_TRANSFER`, `DELAYED` |
| `PATIENT_TRANSFER` | `PATIENT_ARRIVED`, `DELAYED` |
| `PATIENT_ARRIVED` | `OT_READY`, `SURGERY_STARTED`, `DELAYED` |
| `OT_READY` | `SURGERY_STARTED`, `DELAYED` |
| `SURGERY_STARTED` | `SURGERY_COMPLETED`, `DELAYED` |
| `SURGERY_COMPLETED` | `TURNOVER` |
| `TURNOVER` | `AVAILABLE` |
| `AVAILABLE` | `SCHEDULED`, `PREPARING` |
| `DELAYED` | Any valid progression step or `SCHEDULED` / `AVAILABLE` |

---

## 2. CSSD Pack Lifecycle State Machine

```
COLLECTED ──► STERILIZING ──► STERILIZED ──► STORED ──► AVAILABLE ──► ASSIGNED ──► IN_USE ──► RETURNED ──► REPROCESSING
                                                                           │
                                                                           └──► EXPIRED / BLOCKED
```

### QR Verification Rules
1. **Sterility Validation**: Biological/chemical indicator status must be `STERILIZED`.
2. **Expiry Verification**: `expires_at` timestamp must be in the future.
3. **Tray Matching**: Scanned tray type (e.g. `Appendectomy Set`) must match the surgical procedure requirement.
4. **Availability Gate**: Tray cannot already be `IN_USE` in another operating theatre.
