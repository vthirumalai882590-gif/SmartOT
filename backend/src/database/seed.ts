import { db } from './db';
import { generateSeedData } from './seed-data';

export async function seedDatabase(force = false) {
  const currentData = db.getData();
  if (currentData.meta.initialized && !force) {
    console.log('Database already initialized. Skipping seed.');
    return;
  }

  console.log('Seeding SmartOT Command database with synthetic operational dataset...');
  const seed = await generateSeedData();

  currentData.users = seed.users;
  currentData.operating_theatres = seed.operating_theatres;
  currentData.patients = seed.patients;
  currentData.patient_readiness = seed.patient_readiness;
  currentData.surgeries = seed.surgeries;
  currentData.cssd_packs = seed.cssd_packs;
  currentData.alerts = seed.alerts;
  currentData.workflow_events = seed.workflow_events;
  currentData.transfers = seed.transfers;
  currentData.audit_logs = seed.audit_logs;
  currentData.sync_queue = [];
  currentData.meta = {
    initialized: true,
    lastSeededAt: new Date().toISOString(),
    version: '1.0.0',
  };

  db.saveImmediate(currentData);
  console.log('SmartOT Command Database successfully seeded with:');
  console.log(`- ${seed.users.length} Demo Users`);
  console.log(`- ${seed.operating_theatres.length} Operating Theatres`);
  console.log(`- ${seed.patients.length} Inpatient Records`);
  console.log(`- ${seed.surgeries.length} Scheduled & Active Surgeries`);
  console.log(`- ${seed.cssd_packs.length} CSSD Sterile Packs`);
  console.log(`- ${seed.alerts.length} Active Operational Alerts`);
  console.log(`- ${seed.workflow_events.length} Historical Workflow Events`);
}

// Run directly if invoked from CLI
if (require.main === module) {
  seedDatabase(true).catch(console.error);
}
