import fs from 'fs';
import path from 'path';
import {
  User,
  Patient,
  PatientReadiness,
  OperatingTheatre,
  Surgery,
  CSSDPack,
  CSSDItem,
  SterilizationJob,
  SterilizationCycleProfile,
  CSSDReleaseRecord,
  CSSDItemEvent,
  WorkflowEvent,
  Alert,
  PatientTransfer,
  AuditLog,
} from '../../../shared/src/types';

export interface DatabaseSchema {
  users: User[];
  patients: Patient[];
  patient_readiness: PatientReadiness[];
  operating_theatres: OperatingTheatre[];
  surgeries: Surgery[];
  cssd_packs: CSSDPack[];
  cssd_items: CSSDItem[];
  cssd_sterilization_jobs: SterilizationJob[];
  cssd_cycle_profiles: SterilizationCycleProfile[];
  cssd_releases: CSSDReleaseRecord[];
  cssd_item_events: CSSDItemEvent[];
  workflow_events: WorkflowEvent[];
  alerts: Alert[];
  transfers: PatientTransfer[];
  audit_logs: AuditLog[];
  sync_queue: any[];
  meta: {
    initialized: boolean;
    lastSeededAt: string;
    version: string;
  };
}

const candidateDbPaths = [
  path.resolve(process.cwd(), 'backend/data/smartot.db.json'),
  path.resolve(process.cwd(), 'data/smartot.db.json'),
  path.resolve(__dirname, '../../data/smartot.db.json'),
  path.resolve(__dirname, '../../../../data/smartot.db.json'),
  path.resolve(__dirname, '../../../../backend/data/smartot.db.json'),
];
const DEFAULT_DB_PATH =
  candidateDbPaths.find((p) => fs.existsSync(p)) ||
  path.resolve(process.cwd(), 'backend/data/smartot.db.json');

export class Database {
  private static instance: Database;
  private dbPath: string;
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  private constructor(customPath?: string) {
    this.dbPath = customPath || process.env.DATABASE_PATH || DEFAULT_DB_PATH;
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.data = this.load();
  }


  public static getInstance(customPath?: string): Database {
    if (!Database.instance) {
      Database.instance = new Database(customPath);
    }
    return Database.instance;
  }

  private getInitialData(): DatabaseSchema {
    return {
      users: [],
      patients: [],
      patient_readiness: [],
      operating_theatres: [],
      surgeries: [],
      cssd_packs: [],
      cssd_items: [],
      cssd_sterilization_jobs: [],
      cssd_cycle_profiles: [],
      cssd_releases: [],
      cssd_item_events: [],
      workflow_events: [],
      alerts: [],
      transfers: [],
      audit_logs: [],
      sync_queue: [],
      meta: {
        initialized: false,
        lastSeededAt: '',
        version: '1.0.0',
      },
    };
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure default arrays exist
        parsed.cssd_items = parsed.cssd_items || [];
        parsed.cssd_sterilization_jobs = parsed.cssd_sterilization_jobs || [];
        parsed.cssd_cycle_profiles = parsed.cssd_cycle_profiles || [];
        parsed.cssd_releases = parsed.cssd_releases || [];
        parsed.cssd_item_events = parsed.cssd_item_events || [];
        return parsed;
      }
    } catch (err) {
      console.error('Error loading database, initializing fresh state:', err);
    }
    const initial = this.getInitialData();
    this.saveImmediate(initial);
    return initial;
  }

  public persist(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveImmediate(this.data);
    }, 100);
  }

  public saveImmediate(dataToSave?: DatabaseSchema): void {
    try {
      const data = dataToSave || this.data;
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database to disk:', err);
    }
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  public reset(): void {
    this.data = this.getInitialData();
    this.saveImmediate(this.data);
  }
}

export const db = Database.getInstance();
