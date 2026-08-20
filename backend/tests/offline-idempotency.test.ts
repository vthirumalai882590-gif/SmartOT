import { describe, it, expect, beforeAll } from 'vitest';
import { seedDatabase } from '../src/database/seed';
import { eventEngine } from '../src/events/event-engine';
import { eventRepository } from '../src/repositories/event.repository';

describe('Offline-First Event Sourcing & Idempotent Synchronization', () => {
  beforeAll(async () => {
    await seedDatabase(true);
  });

  it('records workflow events with idempotency keys', async () => {
    const key = `test_idemp_${Date.now()}_1`;
    const event = await eventEngine.emitEvent({
      eventType: 'CONSENT_VERIFIED',
      entityType: 'PATIENT',
      entityId: 'pat_1024',
      department: 'WARD',
      actorId: 'usr_ward',
      actorName: 'Ward Nurse',
      idempotencyKey: key,
    });

    expect(event.id).toBeDefined();
    expect(event.idempotencyKey).toBe(key);
  });

  it('prevents duplicate event creation when re-submitting identical idempotency key', async () => {
    const key = `test_idemp_${Date.now()}_duplicate_test`;

    const first = await eventEngine.emitEvent({
      eventType: 'CSSD_PACK_SCANNED',
      entityType: 'CSSD_PACK',
      entityId: 'CSSD-021',
      department: 'OT',
      actorId: 'usr_ot',
      actorName: 'OT Nurse',
      idempotencyKey: key,
    });

    const second = await eventEngine.emitEvent({
      eventType: 'CSSD_PACK_SCANNED',
      entityType: 'CSSD_PACK',
      entityId: 'CSSD-021',
      department: 'OT',
      actorId: 'usr_ot',
      actorName: 'OT Nurse',
      idempotencyKey: key,
    });

    expect(second.id).toBe(first.id);
    expect(second.timestamp).toBe(first.timestamp);
  });
});
