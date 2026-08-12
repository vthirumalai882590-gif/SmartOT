import { db } from '../database/db';
import { OperatingTheatre, Surgery, OTState, DelayRiskLevel } from '../../../shared/src/types';
import { isValidOTTransition } from '../../../shared/src/state-machines';

export class OTRepository {
  findAllOTs(): OperatingTheatre[] {
    return db.getData().operating_theatres;
  }

  findOTById(id: string): OperatingTheatre | undefined {
    return db.getData().operating_theatres.find((ot) => ot.id === id || ot.code === id);
  }

  findAllSurgeries(): Surgery[] {
    return db.getData().surgeries;
  }

  findSurgeryById(id: string): Surgery | undefined {
    return db.getData().surgeries.find((s) => s.id === id);
  }

  findSurgeriesByOT(otId: string): Surgery[] {
    return db.getData().surgeries.filter((s) => s.otId === otId || s.otCode === otId);
  }

  updateOTStatus(
    otId: string,
    newStatus: OTState,
    metadata?: { delayMinutes?: number; riskLevel?: DelayRiskLevel; activeSurgeryId?: string },
    allowOverride: boolean = false
  ): { success: boolean; ot?: OperatingTheatre; error?: string } {
    const data = db.getData();
    const ot = data.operating_theatres.find((o) => o.id === otId || o.code === otId);
    if (!ot) {
      return { success: false, error: `Operating Theatre "${otId}" not found` };
    }

    if (!allowOverride && !isValidOTTransition(ot.currentStatus, newStatus)) {
      return {
        success: false,
        error: `Invalid OT transition from "${ot.currentStatus}" to "${newStatus}"`,
      };
    }

    ot.currentStatus = newStatus;
    ot.lastUpdated = new Date().toISOString();

    if (metadata?.activeSurgeryId !== undefined) {
      ot.activeSurgeryId = metadata.activeSurgeryId;
    }

    if (newStatus === 'TURNOVER') {
      ot.turnoverStartedAt = new Date().toISOString();
    } else if (newStatus === 'AVAILABLE') {
      ot.turnoverStartedAt = undefined;
      ot.currentDelayMinutes = 0;
      ot.riskLevel = 'LOW';
      ot.activeSurgeryId = undefined;
    }

    if (metadata?.delayMinutes !== undefined) {
      ot.currentDelayMinutes = metadata.delayMinutes;
    }
    if (metadata?.riskLevel) {
      ot.riskLevel = metadata.riskLevel;
    }

    db.persist();
    return { success: true, ot };
  }

  createSurgery(surgery: Surgery): Surgery {
    const data = db.getData();
    data.surgeries.push(surgery);
    db.persist();
    return surgery;
  }

  updateSurgery(surgeryId: string, updates: Partial<Surgery>): Surgery | undefined {
    const data = db.getData();
    const surgery = data.surgeries.find((s) => s.id === surgeryId);
    if (surgery) {
      Object.assign(surgery, updates);
      db.persist();
    }
    return surgery;
  }

}

export const otRepository = new OTRepository();
