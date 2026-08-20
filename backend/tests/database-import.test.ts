import { describe, it, expect, beforeAll } from 'vitest';
import { seedDatabase } from '../src/database/seed';
import { db } from '../src/database/db';
import { adminController } from '../src/controllers/admin.controller';

describe('Hospital Master Database Uploader & Importer', () => {
  beforeAll(async () => {
    await seedDatabase(true);
  });

  it('exports a complete hospital database payload with all tables', () => {
    const mockReq = {
      user: { id: 'usr_admin', role: 'ADMINISTRATOR', name: 'Dr. Sarah Jenkins' },
      query: {},
    } as any;

    let headers: Record<string, string> = {};
    let responseData: any = null;

    const mockRes = {
      setHeader: (key: string, val: string) => { headers[key] = val; },
      json: (data: any) => { responseData = data; },
    } as any;

    adminController.exportFullDatabase(mockReq, mockRes);

    expect(headers['Content-Type']).toBe('application/json');
    expect(responseData).toBeDefined();
    expect(responseData.operating_theatres.length).toBeGreaterThan(0);
    expect(responseData.patients.length).toBeGreaterThan(0);
    expect(responseData.cssd_packs.length).toBeGreaterThan(0);
    expect(responseData.surgeries.length).toBeGreaterThan(0);
    expect(responseData.users.length).toBeGreaterThan(0);
  });

  it('imports a complete hospital database dataset in REPLACE mode', async () => {
    const customDatabase = {
      hospitalName: 'Apollo City Hospital',
      system_settings: {
        hospitalName: 'Apollo City Hospital',
        hospitalCode: 'APOLLO-01',
        timezone: 'Asia/Kolkata',
        otDelayWarningMinutes: 12,
      },
      operating_theatres: [
        { id: 'ot_apollo_1', code: 'OT-AP-01', name: 'Apollo Trauma Suite', specialty: 'Trauma', currentStatus: 'AVAILABLE', expectedTurnoverMinutes: 20, currentDelayMinutes: 0, riskLevel: 'LOW', lastUpdated: new Date().toISOString() },
        { id: 'ot_apollo_2', code: 'OT-AP-02', name: 'Apollo Cardiac Suite', specialty: 'Cardiology', currentStatus: 'SURGERY_STARTED', expectedTurnoverMinutes: 30, currentDelayMinutes: 0, riskLevel: 'LOW', lastUpdated: new Date().toISOString() },
      ],
      patients: [
        { id: 'pat_ap_1', mrn: 'AP-101', name: 'James Wilson', age: 50, gender: 'M', wardId: 'Ward A', bedNumber: 'Bed 1', status: 'READY_FOR_OT', primaryDiagnosis: 'Fracture', admissionDate: new Date().toISOString() },
        { id: 'pat_ap_2', mrn: 'AP-102', name: 'Emily Blunt', age: 35, gender: 'F', wardId: 'Ward B', bedNumber: 'Bed 2', status: 'IN_SURGERY', primaryDiagnosis: 'Appendicitis', admissionDate: new Date().toISOString() },
      ],
      surgeries: [
        { id: 'surg_ap_1', patientId: 'pat_ap_1', otId: 'ot_apollo_1', procedureName: 'Emergency ORIF', surgeonName: 'Dr. House', scheduledStartTime: new Date().toISOString(), expectedDurationMinutes: 90, priority: 'EMERGENCY', status: 'SCHEDULED', delayMinutes: 0, riskLevel: 'LOW' },
      ],
      cssd_packs: [
        { id: 'cssd_ap_1', packId: 'CSSD-AP-01', packType: 'Orthopedic Arthroplasty Set', sterilizationBatch: 'BATCH-AP-1', sterilizedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 604800000).toISOString(), sterilityStatus: 'STERILIZED', currentStatus: 'AVAILABLE', currentLocation: 'Apollo CSSD' },
      ],
      users: [
        { id: 'usr_ap_1', email: 'apollo.admin@smartot.hospital', name: 'Apollo Admin', role: 'ADMINISTRATOR', department: 'Management' },
      ],
    };

    const mockReq = {
      user: { id: 'usr_admin', role: 'ADMINISTRATOR', name: 'Dr. Sarah Jenkins' },
      body: { database: customDatabase, mode: 'REPLACE' },
      ip: '127.0.0.1',
      headers: {},
    } as any;

    let responseData: any = null;
    const mockRes = {
      json: (data: any) => { responseData = data; },
      status: () => mockRes,
    } as any;

    await adminController.importDatabase(mockReq, mockRes);

    if (!responseData?.success) {
      console.log('DEBUG IMPORT ERROR:', responseData);
    }

    expect(responseData).toBeDefined();
    expect(responseData.success).toBe(true);
    expect(responseData.data.stats.ots).toBe(2);
    expect(responseData.data.stats.patients).toBe(2);
    expect(responseData.data.stats.surgeries).toBe(1);
    expect(responseData.data.stats.cssd).toBe(1);

    // Verify in-memory database reflection
    const currentData = db.getData() as any;
    expect(currentData.operating_theatres.length).toBe(2);
    expect(currentData.operating_theatres[0].code).toBe('OT-AP-01');
    expect(currentData.patients.length).toBe(2);
    expect(currentData.patients[0].name).toBe('James Wilson');
  });
});
