import { otRepository } from '../repositories/ot.repository';
import { patientRepository } from '../repositories/patient.repository';
import { cssdRepository } from '../repositories/cssd.repository';
import { alertRepository } from '../repositories/alert.repository';
import { NextBestAction } from '../../../shared/src/types';

export class NextBestActionEngine {
  public generateRankedActions(): NextBestAction[] {
    const actions: NextBestAction[] = [];

    // 1. Check Missing Consent on imminent cases
    const openAlerts = alertRepository.findOpenAlerts();
    const consentAlert = openAlerts.find((a) => a.title.includes('Missing Surgical Consent'));
    if (consentAlert) {
      actions.push({
        id: 'nba_consent_01',
        priority: 'HIGH',
        department: 'Ward / Admissions',
        action: 'Verify & complete surgical consent for Patient Arthur Pendelton (P-1024)',
        rationale: 'OT-03 is currently held up because consent documentation is pending in Ward 4B.',
        impactScore: 95,
        entityType: 'PATIENT',
        entityId: consentAlert.entityId,
      });
    }

    // 2. Check CSSD Pack assignments for Ready Patients
    const surgeries = otRepository.findAllSurgeries().filter((s) => s.status === 'SCHEDULED' || s.status === 'READY');
    for (const surg of surgeries) {
      if (!surg.assignedPackId) {
        const available = cssdRepository.findAvailablePacksByType(surg.requiredPackType);
        if (available.length > 0) {
          actions.push({
            id: `nba_assign_${surg.id}`,
            priority: surg.riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM',
            department: 'CSSD / OT',
            action: `Scan and assign sterile pack "${available[0].packId}" (${surg.requiredPackType}) to ${surg.otCode || 'OT'}`,
            rationale: `Pre-assigning tray prevents last-minute search delays for "${surg.procedureName}".`,
            impactScore: 80,
            entityType: 'CSSD_PACK',
            entityId: available[0].packId,
          });
        }
      }
    }

    // 3. Check Ready Patients not yet in transfer
    const readyPatients = patientRepository.findAll().filter((p) => p.status === 'READY_FOR_OT');
    for (const p of readyPatients) {
      actions.push({
        id: `nba_transfer_${p.id}`,
        priority: 'HIGH',
        department: 'Ward Transport',
        action: `Initiate patient transfer for ${p.name} from ${p.wardId} to designated OT`,
        rationale: 'Patient pre-op readiness is 100% complete and OT room is preparing.',
        impactScore: 90,
        entityType: 'PATIENT',
        entityId: p.id,
      });
    }

    // 4. Check Active Turnovers
    const ots = otRepository.findAllOTs().filter((o) => o.currentStatus === 'TURNOVER');
    for (const ot of ots) {
      actions.push({
        id: `nba_turnover_${ot.id}`,
        priority: 'MEDIUM',
        department: 'Environmental Services / OT',
        action: `Expedite turnover and sanitization in ${ot.code}`,
        rationale: `Prompt turnover clearance reduces idle turnaround time before next scheduled case.`,
        impactScore: 75,
        entityType: 'OT',
        entityId: ot.id,
      });
    }

    // 5. CSSD Reprocessing recommendations
    actions.push({
      id: 'nba_cssd_batch',
      priority: 'LOW',
      department: 'CSSD',
      action: 'Load evening autoclave cycle with Appendectomy and Laparotomy sets',
      rationale: 'Demand forecasting indicates high instrument volume requirement for tomorrow morning schedule.',
      impactScore: 60,
      entityType: 'CSSD_PACK',
      entityId: 'CSSD_DEPT',
    });

    // Rank by impact score descending
    actions.sort((a, b) => b.impactScore - a.impactScore);
    return actions;
  }
}

export const nextBestActionEngine = new NextBestActionEngine();
