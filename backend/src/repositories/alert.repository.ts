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

  create(alert: Alert): Alert {
    const data = db.getData();
    // Prevent duplicate open alerts for the same entity and title
    const existing = data.alerts.find(
      (a) => a.entityId === alert.entityId && a.title === alert.title && a.status === 'OPEN'
    );
    if (existing) {
      return existing;
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
}

export const alertRepository = new AlertRepository();
