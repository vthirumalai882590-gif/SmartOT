import bcrypt from 'bcryptjs';
import { DEMO_USERS } from '../../../shared/src/constants';

export async function verifyUserPassword(email: string, plainPassword: string): Promise<boolean> {
  const demo = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!demo) return false;
  return demo.password === plainPassword;
}
