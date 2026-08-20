import jwt from 'jsonwebtoken';
import { User } from '../../../shared/src/types';

// ⚠️ SECURITY: JWT_SECRET must be set via environment variable.
// Never commit a real secret to source control.
const JWT_SECRET_RAW = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'development';

if (!JWT_SECRET_RAW) {
  if (NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET environment variable is not set. Server cannot start securely.');
    process.exit(1);
  } else {
    console.warn(
      '[SECURITY WARNING] JWT_SECRET is not set. Using a development-only fallback. ' +
      'Set JWT_SECRET in your .env file before any real deployment.'
    );
  }
}

const JWT_SECRET = JWT_SECRET_RAW || 'dev_only_smartot_jwt_secret_DO_NOT_USE_IN_PRODUCTION';
const JWT_EXPIRES_IN = '24h';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  department: string;
}

export function generateToken(user: User | TokenPayload): string {
  const payload: TokenPayload = {
    userId: 'id' in user ? user.id : user.userId,
    email: user.email,
    role: user.role,
    department: user.department,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
