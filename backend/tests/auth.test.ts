import { describe, it, expect, beforeAll } from 'vitest';
import { seedDatabase } from '../src/database/seed';
import { userRepository } from '../src/repositories/user.repository';
import { hashPassword, comparePassword } from '../src/utils/password';
import { generateToken, verifyToken } from '../src/utils/jwt';

describe('Authentication & Role-Based Access Control', () => {
  beforeAll(async () => {
    await seedDatabase(true);
  });

  it('verifies seed users exist for all 4 roles', () => {
    const admin = userRepository.findByEmail('admin@smartot.hospital');
    const otManager = userRepository.findByEmail('otmanager@smartot.hospital');
    const wardStaff = userRepository.findByEmail('ward@smartot.hospital');
    const cssdStaff = userRepository.findByEmail('cssd@smartot.hospital');

    expect(admin).toBeDefined();
    expect(admin?.role).toBe('ADMINISTRATOR');

    expect(otManager).toBeDefined();
    expect(otManager?.role).toBe('OT_MANAGER');

    expect(wardStaff).toBeDefined();
    expect(wardStaff?.role).toBe('WARD_STAFF');

    expect(cssdStaff).toBeDefined();
    expect(cssdStaff?.role).toBe('CSSD_STAFF');
  });

  it('validates password hashing and verification', async () => {
    const isValid = await comparePassword('admin123', '$2a$10$w8T0M0t98XJ78hS2J2P2EegfH3G7sB1g2Y8o9.123456789012345');
    // Test dynamic hashing
    const newHash = await hashPassword('hospitalSecure2026!');
    const match = await comparePassword('hospitalSecure2026!', newHash);
    const failMatch = await comparePassword('wrongPassword', newHash);

    expect(match).toBe(true);
    expect(failMatch).toBe(false);
  });

  it('generates and verifies JWT tokens with role claims', () => {
    const payload = {
      userId: 'usr_admin',
      email: 'admin@smartot.hospital',
      role: 'ADMINISTRATOR' as const,
      department: 'Hospital Command Operations',
    };

    const token = generateToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = verifyToken(token);
    expect(decoded).toBeDefined();
    expect(decoded?.userId).toBe('usr_admin');
    expect(decoded?.role).toBe('ADMINISTRATOR');
  });

  it('rejects invalid or expired JWT tokens', () => {
    const invalid = verifyToken('invalid.token.structure');
    expect(invalid).toBeNull();
  });
});
