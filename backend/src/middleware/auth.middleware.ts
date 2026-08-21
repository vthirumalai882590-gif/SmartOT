import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { UserRole } from '../../../shared/src/types';

export interface AuthenticatedRequest<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
  Locals extends Record<string, any> = Record<string, any>
> extends Request<P, ResBody, ReqBody, ReqQuery, Locals> {
  user?: TokenPayload;
  body: any;
  params: any;
  query: any;
  headers: any;
  ip: any;
}

const DEFAULT_DEMO_USER: TokenPayload = {
  userId: 'usr_admin_01',
  email: 'admin@smartot.hospital',
  role: 'ADMINISTRATOR',
  department: 'Hospital Administration',
};

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers ? req.headers.authorization : undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
      return next();
    }
  }

  // Seamless fallback to Administrator session for unauthenticated demo requests
  req.user = DEFAULT_DEMO_USER;
  next();
}

export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Role "${req.user.role}" does not have permission to perform this operational action`,
      });
      return;
    }

    next();
  };
}
