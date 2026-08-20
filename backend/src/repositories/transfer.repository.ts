import { db } from '../database/db';
import { PatientTransfer } from '../../../shared/src/types';

export class TransferRepository {
  findAll(): PatientTransfer[] {
    return db.getData().transfers;
  }

  findById(id: string): PatientTransfer | undefined {
    return db.getData().transfers.find((t) => t.id === id);
  }

  findActiveTransferByPatient(patientId: string): PatientTransfer | undefined {
    return db.getData().transfers.find((t) => t.patientId === patientId && t.status === 'IN_TRANSIT');
  }

  startTransfer(data: {
    patientId: string;
    surgeryId: string;
    fromWard: string;
    toOtId: string;
    toOtCode?: string;
  }): PatientTransfer {
    const dbData = db.getData();
    const transfer: PatientTransfer = {
      id: `trf_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      patientId: data.patientId,
      surgeryId: data.surgeryId,
      fromWard: data.fromWard,
      toOtId: data.toOtId,
      toOtCode: data.toOtCode,
      transferStartedAt: new Date().toISOString(),
      status: 'IN_TRANSIT',
    };

    dbData.transfers.unshift(transfer);
    db.persist();
    return transfer;
  }

  completeArrival(transferId: string): PatientTransfer | undefined {
    const dbData = db.getData();
    const transfer = dbData.transfers.find((t) => t.id === transferId);
    if (transfer) {
      const arrivedAt = new Date();
      transfer.patientArrivedAt = arrivedAt.toISOString();
      transfer.status = 'COMPLETED';

      const startedAt = new Date(transfer.transferStartedAt);
      const diffMs = arrivedAt.getTime() - startedAt.getTime();
      transfer.durationMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));

      db.persist();
    }
    return transfer;
  }

  /**
   * Rollback a transfer that was just created but a downstream state transition failed.
   * Only valid for IN_TRANSIT transfers that haven't progressed yet.
   */
  cancelTransfer(transferId: string): boolean {
    const dbData = db.getData();
    const idx = dbData.transfers.findIndex((t) => t.id === transferId && t.status === 'IN_TRANSIT');
    if (idx !== -1) {
      dbData.transfers.splice(idx, 1);
      db.persist();
      return true;
    }
    return false;
  }
}

export const transferRepository = new TransferRepository();
