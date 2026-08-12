import { db } from '../database/db';
import { CSSDPack, CSSDPackStatus, QRVerificationResult } from '../../../shared/src/types';
import { isValidCSSDTransition } from '../../../shared/src/state-machines';

export class CSSDRepository {
  findAllPacks(): CSSDPack[] {
    return db.getData().cssd_packs;
  }

  findPackById(id: string): CSSDPack | undefined {
    return db.getData().cssd_packs.find((p) => p.id === id || p.packId === id);
  }

  findAvailablePacksByType(packType: string): CSSDPack[] {
    const now = new Date().toISOString();
    return db.getData().cssd_packs.filter(
      (p) =>
        p.packType.toLowerCase() === packType.toLowerCase() &&
        (p.currentStatus === 'AVAILABLE' || p.currentStatus === 'STORED') &&
        p.sterilityStatus === 'STERILIZED' &&
        p.expiresAt > now
    );
  }

  verifyQR(packIdInput: string, targetOT?: string, requiredPackType?: string): QRVerificationResult {
    const pack = this.findPackById(packIdInput.trim());
    const now = new Date();

    if (!pack) {
      return {
        valid: false,
        packId: packIdInput,
        status: 'BLOCKED',
        message: 'Unrecognized Instrument Pack identifier',
        reasons: ['Pack ID does not exist in Central Sterile database'],
        suggestedAction: 'Return tray to CSSD Intake for barcode/QR indexing',
      };
    }

    const reasons: string[] = [];

    // 1. Expiry check
    const expiryDate = new Date(pack.expiresAt);
    const isExpired = expiryDate < now || pack.sterilityStatus === 'EXPIRED';
    if (isExpired) {
      reasons.push(`Sterile barrier validity expired on ${expiryDate.toLocaleDateString()}`);
    }

    // 2. Sterility check
    if (pack.sterilityStatus === 'UNSTERILIZED') {
      reasons.push('Biological/chemical indicator not certified; pack is unsterilized');
    }

    // 3. Status check
    if (pack.currentStatus === 'BLOCKED') {
      reasons.push('Pack is flagged as damaged, compromised, or contaminated');
    } else if (pack.currentStatus === 'STERILIZING') {
      reasons.push('Pack is currently inside active autoclave chamber');
    } else if (pack.currentStatus === 'REPROCESSING' || pack.currentStatus === 'COLLECTED') {
      reasons.push('Pack is in decontamination / dirty processing bay');
    } else if (pack.currentStatus === 'IN_USE') {
      reasons.push(`Pack is already deployed in active surgery in ${pack.assignedOtId || 'another OT'}`);
    }

    // 4. Type Match Check (if specified)
    if (requiredPackType && pack.packType.toLowerCase() !== requiredPackType.toLowerCase()) {
      reasons.push(`Mismatched tray type: Scanned "${pack.packType}", but procedure requires "${requiredPackType}"`);
    }

    if (reasons.length > 0) {
      return {
        valid: false,
        packId: pack.packId,
        pack,
        status: 'BLOCKED',
        message: 'PACK BLOCKED: Sterility or Availability Issue',
        reasons,
        suggestedAction: 'Do NOT open in sterile field. Quarantine pack and obtain replacement sterile set.',
      };
    }

    return {
      valid: true,
      packId: pack.packId,
      pack,
      status: 'VERIFIED',
      message: 'PACK VERIFIED: Certified Sterile & Available',
      reasons: [
        `Verified batch ${pack.sterilizationBatch}`,
        `Valid until ${expiryDate.toLocaleDateString()}`,
        `Stored at ${pack.currentLocation}`,
      ],
      suggestedAction: targetOT ? `Ready for sterile transfer and deployment to ${targetOT}` : 'Ready for assignment',
    };
  }

  updatePackStatus(
    packId: string,
    newStatus: CSSDPackStatus,
    metadata?: Partial<CSSDPack>
  ): { success: boolean; pack?: CSSDPack; error?: string } {
    const data = db.getData();
    const pack = data.cssd_packs.find((p) => p.id === packId || p.packId === packId);
    if (!pack) {
      return { success: false, error: `CSSD Pack "${packId}" not found` };
    }

    if (!isValidCSSDTransition(pack.currentStatus, newStatus)) {
      return {
        success: false,
        error: `Invalid CSSD transition from "${pack.currentStatus}" to "${newStatus}"`,
      };
    }

    pack.currentStatus = newStatus;
    pack.updatedAt = new Date().toISOString();

    if (newStatus === 'ASSIGNED') {
      if (metadata?.assignedOtId) pack.assignedOtId = metadata.assignedOtId;
      if (metadata?.assignedSurgeryId) pack.assignedSurgeryId = metadata.assignedSurgeryId;
      if (metadata?.assignedPatientId) pack.assignedPatientId = metadata.assignedPatientId;
    } else if (newStatus === 'RETURNED' || newStatus === 'REPROCESSING') {
      pack.assignedOtId = undefined;
      pack.assignedSurgeryId = undefined;
      pack.assignedPatientId = undefined;
      pack.sterilityStatus = 'UNSTERILIZED';
    }

    if (metadata?.currentLocation) {
      pack.currentLocation = metadata.currentLocation;
    }

    db.persist();
    return { success: true, pack };
  }
}

export const cssdRepository = new CSSDRepository();
