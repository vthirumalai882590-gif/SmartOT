import fs from 'fs';
import path from 'path';
import {
  User,
  Patient,
  PatientReadiness,
  OperatingTheatre,
  Surgery,
  CSSDPack,
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

const DEFAULT_DB_PATH = path.resolve(__dirname, '../../data/smartot.db.json');

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
        return JSON.parse(raw);
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
