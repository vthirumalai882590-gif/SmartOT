# SmartOT Command: System Architecture Documentation

## 1. Executive Summary
**SmartOT Command** is an affordable, production-style, AI-powered hospital operations workflow orchestration platform that connects Admissions, Wards, Operating Theatres (OT), Central Sterile Services Department (CSSD), and Hospital Administration.

The system transforms disconnected hospital operations into a unified, correlated stream of immutable workflow events, moving through five intelligence stages:
$$\text{CONNECT} \longrightarrow \text{TRACK} \longrightarrow \text{UNDERSTAND} \longrightarrow \text{PREDICT} \longrightarrow \text{RECOMMEND}$$

> **Operational Boundary Notice**: SmartOT Command is strictly an **operational workflow support platform**. It does NOT diagnose patients, recommend medical treatments, or replace hospital clinical staff. All AI recommendations are advisory and explainable.

---

## 2. Five Intelligence Stages

```
   CONNECT
   Admissions • Pre-Op Wards • CSSD • Operating Theatres • Administration
      │
      ▼
    TRACK
   Patient Readiness (6-point checklist) • Digital Consent • CSSD Sterile Pack QR Verification
      │
      ▼
  UNDERSTAND
   Immutable Workflow Event Stream • Multi-Entity Correlation (Patient + OT + CSSD + Transfer)
      │
      ▼
   PREDICT
   Delay-Risk Scoring (Low/Med/High) • Cascading Downstream OT Schedule Impact Analysis
      │
      ▼
  RECOMMEND
   AI Operations Consultant • Next-Best-Action Priority Engine • What-If Operational Simulation
```

---

## 3. High-Level Architecture Diagram

```mermaid
flowchart TB
    subgraph Frontend["Frontend Layer (React 18 + Vite + Tailwind CSS)"]
        UI[Command Center Dashboard]
        RoleViews[Role-Based Dashboards: Admin, OT, CSSD, Ward]
        QRModule[Browser QR Scanner & Visual Pass Generator]
        OfflineQueue[Offline Event Queue (IndexedDB/LocalStorage)]
        SyncManager[Sync Manager]
    end

    subgraph Backend["Backend Layer (Node.js + Express + TypeScript)"]
        APIRouter[REST API Router]
        AuthGuard[JWT Auth & RBAC Middleware]
        
        subgraph CoreEngines["Core Operational Intelligence Engines"]
            EventEngine[Workflow Event Engine (Immutable Log)]
            CorrelationEngine[Multi-Entity Correlation Engine]
            AlertEngine[Rule-Based Alert Engine]
            DelayEngine[Delay Detection & Root-Cause Attribution]
            RiskEngine[Delay-Risk & Cascading Impact Engine]
            ActionEngine[Next-Best-Action Priority Engine]
            SimulatorEngine[What-If Operational Capacity Simulator]
            AIConsultant[AI Context Builder & Operations Consultant]
        end

        DAL[Repository Layer / Data Access Layer]
        AuditService[Audit Logger]
    end

    subgraph DataLayer["Persistence & Seed Layer"]
        Database[(Relational Database / SQLite / PostgreSQL)]
        EventStore[(Immutable Workflow Events)]
    end

    UI --> OfflineQueue
    OfflineQueue --> SyncManager
    SyncManager --> APIRouter
    RoleViews --> APIRouter
    QRModule --> APIRouter

    APIRouter --> AuthGuard
    AuthGuard --> CoreEngines
    AuthGuard --> DAL

    EventEngine --> EventStore
    EventEngine --> CorrelationEngine
    CorrelationEngine --> AlertEngine
    CorrelationEngine --> DelayEngine
    DelayEngine --> RiskEngine
    RiskEngine --> ActionEngine
    CoreEngines --> AIConsultant

    DAL --> Database
    CoreEngines --> AuditService
    AuditService --> Database
```

---

## 4. Layer Details

### 4.1 Frontend Layer
- **Framework**: React 18 with TypeScript and Vite.
- **Styling**: Vanilla Tailwind CSS with custom clinical dark-mode theme tokens, glowing status indicators, and responsive grid layouts.
- **Visuals**: Lucide icons, Recharts responsive charts for bottlenecks & utilization.
- **Resilience**: Client-side event queuing with automatic network status detection (`ONLINE`, `OFFLINE`, `SYNCING`, `SYNC COMPLETE`).

### 4.2 Backend Layer
- **Framework**: Express.js with TypeScript in a layered, modular architecture.
- **Workflow Event Engine**: Immutable event ingestion bus with subscriber hooks for real-time alerting.
- **Correlation Engine**: Multi-entity graph tracing linking Patient admissions, Consent status, Sterile tray scans, Ward transport, and OT room states.
- **AI Operations Consultant**: Pluggable AI engine that formats structured domain prompts with real-time telemetry (KPIs, OT status, alerts, bottlenecks) and produces structured markdown reports adhering to strict safety guidelines.

### 4.3 Database & Storage Layer
- **Relational Schema**: Normalized tables for `users`, `patients`, `patient_readiness`, `operating_theatres`, `surgeries`, `cssd_packs`, `workflow_events`, `alerts`, `transfers`, and `audit_logs`.
- **Zero-Setup Portability**: Default embedded relational store with pure schema validation and JSON/SQLite compatibility, easily swappable for PostgreSQL/Supabase.
