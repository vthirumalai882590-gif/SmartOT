import { db } from '../database/db';
import { OperatingTheatre, Surgery, OTState, DelayRiskLevel } from '../../../shared/src/types';
import { isValidOTTransition } from '../../../shared/src/state-machines';

export class OTRepository {
  findAllOTs(): OperatingTheatre[] {
    return db.getData().operating_theatres;
  }

  /**
   * Find OT strictly by its canonical primary key ID (e.g. ot_01, ot_02, ot_03, ot_04).
   */
  findOTById(id: string): OperatingTheatre | undefined {
    if (!id) return undefined;
    return db.getData().operating_theatres.find((ot) => ot.id === id);
  }

  /**
   * Find OT by its human-facing display code (e.g. OT-01, OT-02, OT-03, OT-04).
   */
  findOTByCode(code: string): OperatingTheatre | undefined {
    if (!code) return undefined;
    const target = code.trim().toUpperCase();
    return db.getData().operating_theatres.find((ot) => ot.code.toUpperCase() === target);
  }

  /**
   * Normalize an external OT identifier (which could be an ID like 'ot_03' or code like 'OT-03')
   * into its canonical primary key ID ('ot_03').
   */
  resolveOTId(identifier: string): string | undefined {
    if (!identifier) return undefined;
    const trimmed = identifier.trim();

    // Try by direct canonical ID match
    const byId = this.findOTById(trimmed);
    if (byId) return byId.id;

    // Try by display code match
    const byCode = this.findOTByCode(trimmed);
    if (byCode) return byCode.id;

    return undefined;
  }

  findAllSurgeries(): Surgery[] {
    return db.getData().surgeries;
  }

  findSurgeryById(id: string): Surgery | undefined {
    if (!id) return undefined;
    return db.getData().surgeries.find((s) => s.id === id);
  }

  /**
   * Find surgeries assigned to an OT by its canonical otId.
   */
  findSurgeriesByOT(otId: string): Surgery[] {
    const canonicalId = this.resolveOTId(otId) || otId;
    return db.getData().surgeries.filter((s) => s.otId === canonicalId);
  }

  updateOTStatus(
    otId: string,
    newStatus: OTState,
    metadata?: { delayMinutes?: number; riskLevel?: DelayRiskLevel; activeSurgeryId?: string },
    allowOverride: boolean = false
  ): { success: boolean; ot?: OperatingTheatre; error?: string } {
    const data = db.getData();
    const canonicalId = this.resolveOTId(otId) || otId;
    const ot = data.operating_theatres.find((o) => o.id === canonicalId);
    if (!ot) {
      return { success: false, error: `Operating Theatre "${otId}" not found` };
    }

    const isFlexibleTransition = ['SURGERY_STARTED', 'SURGERY_COMPLETED', 'TURNOVER', 'AVAILABLE', 'PREPARING', 'PATIENT_READY', 'PATIENT_TRANSFER', 'PATIENT_ARRIVED'].includes(newStatus);
    if (!allowOverride && !isFlexibleTransition && !isValidOTTransition(ot.currentStatus, newStatus)) {
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
    // Normalize otId to canonical ID before creation
    const canonicalOtId = this.resolveOTId(surgery.otId) || surgery.otId;
    const ot = this.findOTById(canonicalOtId);

    const normalizedSurgery: Surgery = {
      ...surgery,
      otId: canonicalOtId,
      otCode: ot?.code || surgery.otCode || canonicalOtId,
    };

    data.surgeries.push(normalizedSurgery);
    db.persist();
    return normalizedSurgery;
  }

  updateSurgery(surgeryId: string, updates: Partial<Surgery>): Surgery | undefined {
    const data = db.getData();
    const surgery = data.surgeries.find((s) => s.id === surgeryId);
    if (surgery) {
      if (updates.otId) {
        const canonical = this.resolveOTId(updates.otId) || updates.otId;
        const ot = this.findOTById(canonical);
        updates.otId = canonical;
        if (ot) updates.otCode = ot.code;
      }
      Object.assign(surgery, updates);
      db.persist();
    }
    return surgery;
  }
}

export const otRepository = new OTRepository();
