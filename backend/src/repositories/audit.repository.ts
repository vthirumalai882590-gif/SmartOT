import { db } from '../database/db';
import { AuditLog } from '../../../shared/src/types';

export class AuditRepository {
  findAll(): AuditLog[] {
    return [...db.getData().audit_logs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  log(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const dbData = db.getData();
    const logItem: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };

    dbData.audit_logs.unshift(logItem);
    db.persist();
    return logItem;
  }
}

export const auditRepository = new AuditRepository();
