# SmartOT Security, Authentication & Governance Specification

## 1. Authentication & JWT Tokens

- **Algorithm**: HMAC-SHA256 (`HS256`).
- **Token Claims**: `userId`, `email`, `role`, `department`.
- **Token Expiry**: 24 Hours (`24h`).
- **Password Security**: Salted Bcrypt hashing (`bcryptjs` with salt work factor 10).

---

## 2. Role-Based Access Control (RBAC) Matrix

| Endpoint Group | `ADMINISTRATOR` | `OT_MANAGER` | `WARD_STAFF` | `CSSD_STAFF` |
| :--- | :---: | :---: | :---: | :---: |
| **Command Center Dashboard** | Full | Full | Read-Only | Read-Only |
| **Patient Pre-Op Readiness** | Full | Full | Full | Read-Only |
| **Surgical Consent Sign-Off** | Full | Full | Full | No |
| **OT State Transitions** | Full | Full | No | No |
| **Patient Transfer Triggers** | Full | Full | Full | No |
| **CSSD QR Scan & Packing** | Full | Full | No | Full |
| **Operational Alerts** | Full | Full | Acknowledge | Acknowledge |
| **AI Consultant** | Full | Full | Read-Only | Read-Only |
| **Master Admin Settings** | Full | No | No | No |
| **Audit Logs & Event Trail** | Full | Read-Only | No | No |

---

## 3. Defense-in-Depth Measures

1. **CORS Hardening**: Strict origin whitelisting with preflight caching.
2. **Input Validation**: Request schema validation middleware rejecting malformed payloads before controller execution.
3. **Safe Error Responses**: Internal stack traces and database internal structures are sanitized and never exposed to the client.
4. **Audit Trail**: Every operational state transition and AI query is logged with actor identification, timestamp, and IP address.
