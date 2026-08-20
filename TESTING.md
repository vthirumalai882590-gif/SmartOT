# SmartOT Testing & Quality Assurance Suite

## 1. Test Matrix Overview

SmartOT includes comprehensive unit, integration, and operational engine test suites built with **Vitest**:

| Test Suite File | Coverage Domain | Key Verifications |
| :--- | :--- | :--- |
| `tests/auth.test.ts` | Authentication & RBAC | Password hashing, JWT token validation, role claims, seed users |
| `tests/workflow.test.ts` | Core Surgical Workflow | 6/6 checklist calculation, CSSD QR scan, OT state transitions |
| `tests/ai-dynamic.test.ts` | Dynamic Live AI Consultant | Dynamic intent extraction, live DB introspection, non-existent entity handling, turnover simulation |
| `tests/offline-idempotency.test.ts` | Offline Synchronization | Event sourcing, idempotency key generation, duplicate request rejection |
| `tests/groq.test.ts` | External LLM Provider | Groq Llama-3 API connectivity and structured JSON fallback validation |

---

## 2. Running Tests

### Run all backend unit & integration tests:
```bash
npm --prefix backend run test
```

### Run workflow engine tests:
```bash
npm --prefix backend run test:workflow
```

### Validate TypeScript compilation:
```bash
npm --prefix backend run build
npm --prefix frontend run build
```
