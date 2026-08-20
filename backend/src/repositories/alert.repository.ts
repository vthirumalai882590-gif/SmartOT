import { db } from '../database/db';
import { Alert, AlertStatus, UserRole } from '../../../shared/src/types';

export class AlertRepository {
  findAll(): Alert[] {
    return [...db.getData().alerts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  findOpenAlerts(): Alert[] {
    return db.getData().alerts.filter((a) => a.status === 'OPEN' || a.status === 'ACKNOWLEDGED');
  }

  findByRole(role: UserRole): Alert[] {
    if (role === 'ADMINISTRATOR' || role === 'OT_MANAGER') {
      return this.findAll();
    }
    return db.getData().alerts.filter((a) => a.responsibleRole === role);
  }

  /**
   * FIX: Idempotent alert creation.
   * Strategy 1: Same alert ID already exists → return existing (covers alert engine's stable IDs like alt_consent_surg_01)
   * Strategy 2: Same entityId + entityType + responsibleRole + OPEN status → update timestamp, return existing (prevents soft dupes)
   * No new alert is created if either check passes.
   */
  create(alert: Alert): Alert {
    const data = db.getData();

    // Check 1: Exact ID match — alert engine uses stable predictable IDs
    const byId = data.alerts.find((a) => a.id === alert.id);
    if (byId) {
      // If the same alert exists but was resolved, re-open it with updated timestamp
      if (byId.status === 'RESOLVED') {
        byId.status = 'OPEN';
        byId.createdAt = new Date().toISOString();
        byId.resolvedAt = undefined;
        byId.resolvedBy = undefined;
        byId.title = alert.title;
        byId.description = alert.description;
        db.persist();
      }
      return byId;
    }

    // Check 2: Soft dedup — same entity, same role, same title pattern, already OPEN
    const softDupe = data.alerts.find(
      (a) =>
        a.entityId === alert.entityId &&
        a.entityType === alert.entityType &&
        a.responsibleRole === alert.responsibleRole &&
        a.title === alert.title &&
        (a.status === 'OPEN' || a.status === 'ACKNOWLEDGED')
    );
    if (softDupe) {
      return softDupe;
    }

    data.alerts.unshift(alert);
    db.persist();
    return alert;
  }

  updateStatus(id: string, status: AlertStatus, actorName?: string): Alert | undefined {
    const data = db.getData();
    const alert = data.alerts.find((a) => a.id === id);
    if (alert) {
      alert.status = status;
      if (status === 'RESOLVED') {
        alert.resolvedAt = new Date().toISOString();
        alert.resolvedBy = actorName || 'Operations Staff';
      }
      db.persist();
    }
    return alert;
  }

  /**
   * Auto-resolve all OPEN alerts matching entityId + title fragment.
   * Used by alert engine to resolve alerts when the underlying condition clears.
   */
  autoResolveByEntity(entityId: string, titleFragment: string, resolvedBy: string): void {
    const data = db.getData();
    data.alerts
      .filter(
        (a) =>
          a.entityId === entityId &&
          a.title.includes(titleFragment) &&
          (a.status === 'OPEN' || a.status === 'ACKNOWLEDGED')
      )
      .forEach((a) => {
        a.status = 'RESOLVED';
        a.resolvedAt = new Date().toISOString();
        a.resolvedBy = resolvedBy;
      });
    db.persist();
  }
}

export const alertRepository = new AlertRepository();
