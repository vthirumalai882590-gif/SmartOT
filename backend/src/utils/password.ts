import bcrypt from 'bcryptjs';
import { DEMO_USERS } from '../../../shared/src/constants';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  if (!plain || !hashed) return false;
  try {
    if (!hashed.startsWith('$2')) {
      return plain === hashed;
    }
    return await bcrypt.compare(plain, hashed);
  } catch {
    return false;
  }
}

export async function verifyUserPassword(email: string, plainPassword: string): Promise<boolean> {
  if (!email || !plainPassword || typeof email !== 'string' || typeof plainPassword !== 'string') {
    return false;
  }
  const cleanEmail = email.trim().toLowerCase();
  const demo = DEMO_USERS.find((u) => u.email && u.email.toLowerCase() === cleanEmail);
  if (!demo) return false;
  if (demo.password === plainPassword) return true;
  return comparePassword(plainPassword, demo.password);
}

