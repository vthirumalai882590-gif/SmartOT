export type QueryIntent =
  | 'OT_SPECIFIC_STATUS'
  | 'PATIENT_SPECIFIC_STATUS'
  | 'SURGERY_SPECIFIC_STATUS'
  | 'DELAY_ROOT_CAUSE'
  | 'RISK_ASSESSMENT'
  | 'BOTTLENECK_ANALYSIS'
  | 'PRIORITY_ACTIONS'
  | 'TURNOVER_SIMULATION'
  | 'CSSD_STATUS'
  | 'GENERAL_OPERATIONS';

export interface ExtractedEntities {
  otCode?: string; // e.g. 'OT-01', 'OT-02', 'OT-03', 'OT-04'
  patientIdentifier?: string; // e.g. 'P-1024', 'Arthur', 'Eleanor'
  surgeryId?: string;
  department?: string;
  topic?: string;
}

export interface ParsedQueryIntent {
  intent: QueryIntent;
  entities: ExtractedEntities;
  rawQuery: string;
}

export class AIIntentExtractor {
  public parse(query: string): ParsedQueryIntent {
    const q = query.trim().toLowerCase();
    const entities: ExtractedEntities = {};

    // 1. Extract OT identifier (OT-01, OT-02, OT-03, OT-04, Theatre 1, etc.)
    const otMatch = query.match(/ot[-_\s]?0?([1-9])/i) || query.match(/theatre[-_\s]?0?([1-9])/i) || query.match(/room[-_\s]?0?([1-9])/i);
    if (otMatch) {
      entities.otCode = `OT-0${otMatch[1]}`;
    }

    // 2. Extract Patient Identifier (P-1024, pat_1024, Arthur, Eleanor, etc.)
    const patMatch = query.match(/p[-_]?(\d+)/i) || query.match(/pat[-_]?(\d+)/i);
    if (patMatch) {
      entities.patientIdentifier = `P-${patMatch[1]}`;
    } else if (q.includes('arthur') || q.includes('pendelton')) {
      entities.patientIdentifier = 'Arthur Pendelton';
    } else if (q.includes('eleanor') || q.includes('sterling')) {
      entities.patientIdentifier = 'Eleanor Sterling';
    } else if (q.includes('robert') || q.includes('chen')) {
      entities.patientIdentifier = 'Robert Chen';
    } else if (q.includes('sarah') || q.includes('jenkins')) {
      entities.patientIdentifier = 'Sarah Jenkins';
    }

    // 3. Classify Intent
    if (q.includes('turnover') && (q.includes('reduce') || q.includes('affect') || q.includes('utilization') || q.includes('simulate') || q.includes('impact'))) {
      return { intent: 'TURNOVER_SIMULATION', entities, rawQuery: query };
    }

    if (entities.otCode) {
      if (q.includes('delay') || q.includes('why') || q.includes('late') || q.includes('stuck') || q.includes('hold')) {
        return { intent: 'DELAY_ROOT_CAUSE', entities, rawQuery: query };
      }
      return { intent: 'OT_SPECIFIC_STATUS', entities, rawQuery: query };
    }

    if (entities.patientIdentifier) {
      return { intent: 'PATIENT_SPECIFIC_STATUS', entities, rawQuery: query };
    }

    if (q.includes('bottleneck') || q.includes('biggest delay') || q.includes('delay cause') || q.includes('root cause')) {
      return { intent: 'BOTTLENECK_ANALYSIS', entities, rawQuery: query };
    }

    if (q.includes('most at risk') || q.includes('highest risk') || q.includes('risk score') || q.includes('risk level') || q.includes('cascading')) {
      return { intent: 'RISK_ASSESSMENT', entities, rawQuery: query };
    }

    if (q.includes('prioritize') || q.includes('priority') || q.includes('next best action') || q.includes('next action') || q.includes('what should we do')) {
      return { intent: 'PRIORITY_ACTIONS', entities, rawQuery: query };
    }

    if (q.includes('cssd') || q.includes('sterile') || q.includes('sterilization') || q.includes('pack') || q.includes('tray') || q.includes('autoclave')) {
      return { intent: 'CSSD_STATUS', entities, rawQuery: query };
    }

    if (q.includes('delay') || q.includes('late') || q.includes('overrun')) {
      return { intent: 'DELAY_ROOT_CAUSE', entities, rawQuery: query };
    }

    return { intent: 'GENERAL_OPERATIONS', entities, rawQuery: query };
  }
}

export const aiIntentExtractor = new AIIntentExtractor();
