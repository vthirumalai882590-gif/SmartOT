import { Request, Response } from 'express';
import { userRepository } from '../repositories/user.repository';
import { verifyUserPassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { auditRepository } from '../repositories/audit.repository';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AuthController {
  public async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body || {};

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Email and password are required',
        });
        return;
      }

      const user = userRepository.findByEmail(email);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        });
        return;
      }

      const isValid = await verifyUserPassword(email, password);
      if (!isValid) {
        res.status(401).json({
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        });
        return;
      }

      const token = generateToken(user);

      try {
        auditRepository.log({
          actorId: user.id,
          actorName: user.name,
          action: 'USER_LOGIN',
          entityType: 'USER',
          entityId: user.id,
          newState: { role: user.role, email: user.email },
          ipAddress: req.ip || '127.0.0.1',
        });
      } catch (auditErr) {
        console.warn('[Audit Warning] Failed to log user login audit event:', auditErr);
      }

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            department: user.department,
          },
        },
      });
    } catch (err: any) {
      console.error('[Auth Controller Error]', err);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred during authentication.',
      });
    }
  }

  public async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
      return;
    }

    const user = userRepository.findById(req.user.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
      },
    });
  }
}

export const authController = new AuthController();
