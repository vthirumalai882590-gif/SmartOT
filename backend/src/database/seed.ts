import { db } from './db';
import { generateSeedData } from './seed-data';
import { seedPostgresDatabase } from './postgres-seeder';

export async function seedDatabase(force = true) {
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
  currentData.cssd_items = seed.cssd_items;
  currentData.cssd_sterilization_jobs = seed.cssd_sterilization_jobs;
  currentData.cssd_cycle_profiles = seed.cssd_cycle_profiles;
  currentData.cssd_releases = seed.cssd_releases;
  currentData.cssd_item_events = seed.cssd_item_events;
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

  // If PostgreSQL is active, populate PostgreSQL tables as well
  await seedPostgresDatabase();
  console.log('SmartOT Command Database successfully seeded with:');
  console.log(`- ${seed.users.length} Demo Users`);
  console.log(`- ${seed.operating_theatres.length} Operating Theatres`);
  console.log(`- ${seed.patients.length} Inpatient Records`);
  console.log(`- ${seed.surgeries.length} Scheduled & Active Surgeries`);
  console.log(`- ${seed.cssd_packs.length} CSSD Sterile Packs`);
  console.log(`- ${seed.cssd_items.length} CSSD Master Items`);
  console.log(`- ${seed.cssd_sterilization_jobs.length} Sterilization Jobs`);
  console.log(`- ${seed.alerts.length} Active Operational Alerts`);
  console.log(`- ${seed.workflow_events.length} Historical Workflow Events`);
}

// Run directly if invoked from CLI
if (require.main === module) {
  seedDatabase(true).catch(console.error);
}
