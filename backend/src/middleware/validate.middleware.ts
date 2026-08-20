import { Request, Response, NextFunction } from 'express';
import { OTState, ConsentStatus, CSSDPackStatus, AlertStatus } from '../../../shared/src/types';

export function validateLogin(req: Request, res: Response, next: NextFunction): void {
  if (!req.body || typeof req.body !== 'object') {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST_BODY',
        message: 'JSON request body is required',
      },
    });
    return;
  }
  const { email, password } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST_BODY',
        message: 'A valid email address is required',
      },
    });
    return;
  }
  if (!password || typeof password !== 'string' || password.length < 1) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST_BODY',
        message: 'Password is required',
      },
    });
    return;
  }
  next();
}

export function validateOTTransition(req: Request, res: Response, next: NextFunction): void {
  const { targetState } = req.body;
  const validStates: OTState[] = [
    'SCHEDULED',
    'PREPARING',
    'PATIENT_READY',
    'PATIENT_TRANSFER',
    'PATIENT_ARRIVED',
    'OT_READY',
    'SURGERY_STARTED',
    'SURGERY_COMPLETED',
    'TURNOVER',
    'AVAILABLE',
    'DELAYED',
  ];

  if (!targetState || !validStates.includes(targetState)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_OT_STATE',
        message: `targetState must be one of: ${validStates.join(', ')}`,
      },
    });
    return;
  }
  next();
}

export function validateScheduleCase(req: Request, res: Response, next: NextFunction): void {
  const { otId, patientId, procedureName, surgeonName, scheduledStartTime } = req.body;
  const missing: string[] = [];
  if (!otId) missing.push('otId');
  if (!patientId) missing.push('patientId');
  if (!procedureName) missing.push('procedureName');
  if (!surgeonName) missing.push('surgeonName');
  if (!scheduledStartTime) missing.push('scheduledStartTime');

  if (missing.length > 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_REQUIRED_FIELDS',
        message: `Missing required fields: ${missing.join(', ')}`,
      },
    });
    return;
  }
  next();
}

export function validateConsentUpdate(req: Request, res: Response, next: NextFunction): void {
  const { consentStatus } = req.body;
  const validStatuses: ConsentStatus[] = ['PENDING', 'VERIFIED', 'MISSING'];
  if (!consentStatus || !validStatuses.includes(consentStatus)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_CONSENT_STATUS',
        message: `consentStatus must be one of: ${validStatuses.join(', ')}`,
      },
    });
    return;
  }
  next();
}

export function validateCSSDScan(req: Request, res: Response, next: NextFunction): void {
  const { packId } = req.body;
  if (!packId || typeof packId !== 'string') {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_SCAN_PAYLOAD',
        message: 'packId string is required for QR code verification',
      },
    });
    return;
  }
  next();
}

export function validateTransferStart(req: Request, res: Response, next: NextFunction): void {
  const { patientId, surgeryId, fromWard, toOtId } = req.body;
  const missing: string[] = [];
  if (!patientId) missing.push('patientId');
  if (!surgeryId) missing.push('surgeryId');
  if (!fromWard) missing.push('fromWard');
  if (!toOtId) missing.push('toOtId');

  if (missing.length > 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_TRANSFER_PARAMS',
        message: `Missing required transfer fields: ${missing.join(', ')}`,
      },
    });
    return;
  }
  next();
}

export function validateAlertStatus(req: Request, res: Response, next: NextFunction): void {
  const { status } = req.body;
  const validStatuses: AlertStatus[] = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ALERT_STATUS',
        message: `status must be one of: ${validStatuses.join(', ')}`,
      },
    });
    return;
  }
  next();
}
