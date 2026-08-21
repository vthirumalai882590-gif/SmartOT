import { offlineQueue } from './offline-queue';
import { FALLBACK_DB } from './fallback-data';

const ENV_API_URL = ((import.meta as any).env?.VITE_API_URL as string) || '';

function getApiBase(): string {
  if (ENV_API_URL) return ENV_API_URL.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')) {
    return 'https://smartot-command.onrender.com/api';
  }
  return '/api';
}

const API_BASE = getApiBase();

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('smartot_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getCustomPatients(): any[] {
  try {
    const saved = localStorage.getItem('smartot_custom_patients');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveCustomPatient(patient: any) {
  try {
    if (!patient || (!patient.id && !patient.mrn)) return;
    const existing = getCustomPatients();
    const updated = [patient, ...existing.filter((p: any) => p.id !== patient.id && p.mrn !== patient.mrn)];
    localStorage.setItem('smartot_custom_patients', JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save custom patient to localStorage', e);
  }
}

function getFallbackDataForEndpoint(endpoint: string): any {
  const cleanEp = endpoint.split('?')[0];
  if (cleanEp === '/patients' || cleanEp.startsWith('/patients')) {
    const custom = getCustomPatients();
    const dbPatients = FALLBACK_DB.patients || [];
    const merged = [...custom];
    for (const p of dbPatients) {
      if (!merged.some((m) => m.id === p.id || m.mrn === p.mrn)) {
        merged.push(p);
      }
    }
    return merged;
  }
  if (cleanEp === '/ot/schedule') return FALLBACK_DB.surgeries || [];
  if (cleanEp === '/ot/rooms') return FALLBACK_DB.operating_theatres || [];
  if (cleanEp === '/cssd/items') return (FALLBACK_DB as any).cssd_items || (FALLBACK_DB as any).cssd_packs || [];
  if (cleanEp === '/cssd/packs') return (FALLBACK_DB as any).cssd_packs || [];
  if (cleanEp === '/alerts') return FALLBACK_DB.alerts || [];
  if (cleanEp === '/analytics/metrics') {
    return {
      averageTurnoverMinutes: 24,
      otUtilizationPercentage: 86,
      onTimeStartPercentage: 92,
      cssdStockoutCount: 1,
    };
  }
  if (cleanEp === '/dashboard/command-center') {
    return {
      activeSurgeries: FALLBACK_DB.surgeries?.length || 6,
      delayedCases: 2,
      averageTurnoverMinutes: 24,
      cssdStockoutRiskCount: 1,
      otUtilizationRate: 85,
      activeAlertsCount: FALLBACK_DB.alerts?.length || 7,
      theatres: FALLBACK_DB.operating_theatres || [],
      recentAlerts: FALLBACK_DB.alerts || [],
    };
  }
  return null;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let url = `${API_BASE}${endpoint}`;
  const isGetRequest = !options.method || options.method.toUpperCase() === 'GET';
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  try {
    let res = await fetch(url, { ...options, headers });
    let text = await res.text();

    // Failover check: If relative URL returned HTML (e.g. Vercel static 404/405), retry against live backend
    if (
      (text.startsWith('<!DOCTYPE') || text.includes('Cannot POST') || text.includes('Cannot GET')) &&
      !url.startsWith('https://smartot-command.onrender.com')
    ) {
      const fallbackUrl = `https://smartot-command.onrender.com/api${endpoint}`;
      console.warn(`[API Failover] Endpoint ${url} returned HTML. Retrying with live backend: ${fallbackUrl}`);
      res = await fetch(fallbackUrl, { ...options, headers });
      text = await res.text();
    }

    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text || `HTTP ${res.status} ${res.statusText}` };
    }

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('smartot_auth_token');
        localStorage.removeItem('smartot_auth_user');
      }

      if (isGetRequest) {
        const fallback = getFallbackDataForEndpoint(endpoint);
        if (fallback !== null) {
          console.warn(`[API Graceful Fallback] Endpoint ${endpoint} returned HTTP ${res.status}. Serving offline fallback data.`);
          return fallback as T;
        }
      }

      const errorMsg =
        (typeof data.message === 'string' && data.message) ||
        (typeof data.error === 'string' && data.error) ||
        (data.error && typeof data.error.message === 'string' && data.error.message) ||
        (typeof data === 'string' ? data : JSON.stringify(data));
      const errorObj = new Error(errorMsg);
      if (data.reasons && Array.isArray(data.reasons)) {
        (errorObj as any).reasons = data.reasons;
      }
      throw errorObj;
    }

    return data.data !== undefined ? data.data : data;
  } catch (err: any) {
    if (isGetRequest) {
      const fallback = getFallbackDataForEndpoint(endpoint);
      if (fallback !== null) {
        console.warn(`[API Graceful Fallback] Endpoint ${endpoint} failed (${err.message}). Serving offline fallback data.`);
        return fallback as T;
      }
    }

    // If offline and mutating state, queue action to offline store
    if (!navigator.onLine && options.method && options.method !== 'GET') {
      offlineQueue.enqueueEvent({
        eventType: 'OFFLINE_MUTATION',
        entityType: 'LOCAL_ACTION',
        entityId: endpoint,
        department: 'CLIENT',
        metadata: { endpoint, body: options.body ? JSON.parse(options.body as string) : {} },
      });
    }
    throw err;
  }
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  getMe: () => request<any>('/auth/me'),

  // Command Center
  getCommandCenter: () => request<any>('/dashboard/command-center'),

  // Patients
  getPatients: async () => {
    try {
      const serverPatients = await request<any[]>('/patients');
      const custom = getCustomPatients();
      const merged = [...custom];
      for (const p of (serverPatients || [])) {
        if (!merged.some((m) => m.id === p.id || m.mrn === p.mrn)) {
          merged.push(p);
        }
      }
      return merged;
    } catch {
      return getFallbackDataForEndpoint('/patients');
    }
  },
  getPatientById: async (id: string) => {
    try {
      return await request<any>(`/patients/${id}`);
    } catch {
      const all = getFallbackDataForEndpoint('/patients') || [];
      return all.find((p: any) => p.id === id || p.mrn === id) || all[0];
    }
  },
  createPatient: async (data: any) => {
    try {
      const created = await request<any>('/patients', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (created) saveCustomPatient(created);
      return created;
    } catch (err) {
      const localPatient = {
        id: `pat_${Date.now()}`,
        mrn: data.mrn,
        name: data.name,
        age: data.age || 45,
        gender: data.gender || 'M',
        wardId: data.wardId || 'Ward 4B',
        bedNumber: data.bedNumber || 'Bed 401',
        status: 'PRE_OP_INPATIENT',
        primaryDiagnosis: data.primaryDiagnosis || 'Acute Appendicitis',
        readiness: {
          id: `readiness_${Date.now()}`,
          patientId: `pat_${Date.now()}`,
          admissionCompleted: true,
          consentStatus: 'PENDING',
          documentationCompleted: false,
          reportsAvailable: false,
          doctorConfirmed: false,
          preopPrepCompleted: false,
          completedItemsCount: 1,
          totalItemsCount: 6,
          isReady: false,
          updatedAt: new Date().toISOString(),
        },
        admissionDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveCustomPatient(localPatient);
      return localPatient;
    }
  },
  updatePatientReadiness: (id: string, updates: any) =>
    request<any>(`/patients/${id}/readiness`, {
      method: 'POST',
      body: JSON.stringify(updates),
    }),
  updatePatientConsent: (id: string, consentStatus: string) =>
    request<any>(`/patients/${id}/consent`, {
      method: 'POST',
      body: JSON.stringify({ consentStatus }),
    }),

  // Operating Theatres & Surgeries
  getOTSchedule: () => request<any>('/ot/schedule'),
  getOTTimeline: (otId: string) => request<any[]>(`/ot/${otId}/timeline`),
  scheduleSurgeryCase: (data: {
    otId: string;
    patientId: string;
    procedureName?: string;
    surgeonName?: string;
    scheduledStartTime?: string;
    expectedDurationMinutes?: number;
    priority?: string;
    requiredPackType?: string;
  }) =>
    request<any>('/ot/schedule-case', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  transitionOTState: (
    otId: string,
    data: {
      targetState: string;
      surgeryId?: string;
      delayMinutes?: number;
      delayReason?: string;
      riskLevel?: string;
      isOverride?: boolean;
      overrideReason?: string;
    }
  ) =>
    request<any>(`/ot/${otId}/transition`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),



  // Transfers
  getTransfers: () => request<any[]>('/transfers'),
  startTransfer: (data: { patientId: string; surgeryId?: string; fromWard?: string; toOtId: string; toOtCode?: string }) =>
    request<any>('/transfers/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  arrivePatient: (data: { transferId?: string; patientId?: string; otId?: string }) =>
    request<any>('/transfers/arrive', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // CSSD
  getCSSDPacks: () => request<any[]>('/cssd/packs'),
  getCSSDItems: () => request<any[]>('/cssd/items'),
  getCSSDItemById: (id: string) => request<any>(`/cssd/items/${id}`),
  getCSSDItemByQR: (qrCode: string) => request<any>(`/cssd/items/qr/${encodeURIComponent(qrCode)}`),
  getCSSDItemHistory: (id: string) => request<any[]>(`/cssd/items/${id}/history`),
  createCSSDItem: (data: any) => request<any>('/cssd/items', { method: 'POST', body: JSON.stringify(data) }),

  getCSSDSterilizationJobs: () => request<any[]>('/cssd/sterilization-jobs'),
  getCSSDSterilizationJobById: (id: string) => request<any>(`/cssd/sterilization-jobs/${id}`),
  createSterilizationJob: (data: {
    instrumentId: string;
    qrCode?: string;
    quantity?: number;
    currentLocation?: string;
    sourceDepartment?: string;
    sourceOT?: string;
    associatedSurgeryId?: string;
    condition?: string;
    notes?: string;
    method?: string;
  }) => request<any>('/cssd/sterilization-jobs', { method: 'POST', body: JSON.stringify(data) }),

  startSterilizationJob: (id: string, data?: { method?: string }) =>
    request<any>(`/cssd/sterilization-jobs/${id}/start`, { method: 'POST', body: JSON.stringify(data || {}) }),
  completeSterilizationJob: (id: string) =>
    request<any>(`/cssd/sterilization-jobs/${id}/complete`, { method: 'POST', body: JSON.stringify({}) }),
  releaseSterilizationJob: (
    id: string,
    data: {
      cycleCompleted: boolean;
      packagingAcceptable: boolean;
      indicatorVerified: boolean;
      releaseDecision: 'RELEASED' | 'REJECTED' | 'QUARANTINED';
      notes?: string;
    }
  ) => request<any>(`/cssd/sterilization-jobs/${id}/release`, { method: 'POST', body: JSON.stringify(data) }),
  rejectSterilizationJob: (id: string, reason?: string) =>
    request<any>(`/cssd/sterilization-jobs/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  quarantineSterilizationJob: (id: string, reason?: string) =>
    request<any>(`/cssd/sterilization-jobs/${id}/quarantine`, { method: 'POST', body: JSON.stringify({ reason }) }),

  getCSSDHistory: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params || {}).toString();
    return request<any[]>(`/cssd/history${query ? `?${query}` : ''}`);
  },
  getCSSDMetrics: () => request<any>('/cssd/metrics'),
  getCSSDCycleProfiles: () => request<any[]>('/cssd/cycle-profiles'),

  verifyCSSDQR: (data: {
    packId: string;
    targetOT?: string;
    requiredPackType?: string;
    surgeryId?: string;
    patientId?: string;
    otId?: string;
  }) =>
    request<any>('/cssd/scan', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  transitionCSSDPack: (
    packId: string,
    data: {
      targetStatus: string;
      assignedOtId?: string;
      assignedSurgeryId?: string;
      assignedPatientId?: string;
      currentLocation?: string;
    }
  ) =>
    request<any>(`/cssd/packs/${packId}/transition`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  dispatchCSSDPack: (
    packId: string,
    data: {
      targetOT: string;
      notes?: string;
    }
  ) =>
    request<any>(`/cssd/packs/${packId}/dispatch`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Alerts
  getAlerts: () => request<any[]>('/alerts'),
  updateAlertStatus: (alertId: string, status: string) =>
    request<any>(`/alerts/${alertId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Analytics
  getBottlenecks: () => request<any[]>('/analytics/bottlenecks'),
  getUtilization: () => request<any[]>('/analytics/utilization'),
  getCSSDDemand: () => request<any[]>('/analytics/cssd-demand'),
  getNextBestActions: () => request<any[]>('/analytics/next-best-actions'),
  getSurgeryRootCause: (surgeryId: string) => request<any>(`/analytics/surgeries/${surgeryId}/root-cause`),
  simulateWhatIf: (params: {
    turnoverReductionMinutes: number;
    transferOptimizationMinutes: number;
    prepChecklistAutomationHours: number;
  }) =>
    request<any>('/simulation/what-if', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // AI Operations Consultant
  askAIConsultant: (query: string) =>
    request<any>('/ai/consultant/ask', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),
  getAIContext: () => request<any>('/ai/context'),

  // Audit Logs & Events
  getAuditLogs: () => request<any[]>('/audit-logs'),
  getWorkflowEvents: () => request<any[]>('/events'),

  // Admin & Data Management
  getAdminSettings: () => request<any>('/admin/settings'),
  updateAdminSettings: (settings: any) =>
    request<any>('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    }),
  getAdminOTs: (params?: { status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    return request<{ data: any[]; meta: any }>(`/admin/ots?${query.toString()}`);
  },
  createAdminOT: (data: any) =>
    request<any>('/admin/ots', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAdminOT: (id: string, data: any) =>
    request<any>(`/admin/ots/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  archiveAdminOT: (id: string, archived: boolean = true) =>
    request<any>(`/admin/ots/${id}/archive`, {
      method: 'POST',
      body: JSON.stringify({ archived }),
    }),
  getAdminCSSDPacks: (params?: { status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    return request<{ data: any[]; meta: any }>(`/admin/cssd/packs?${query.toString()}`);
  },
  createAdminCSSDPack: (data: any) =>
    request<any>('/admin/cssd/packs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAdminCSSDPack: (id: string, data: any) =>
    request<any>(`/admin/cssd/packs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  archiveAdminCSSDPack: (id: string) =>
    request<any>(`/admin/cssd/packs/${id}/archive`, {
      method: 'POST',
    }),
  getAdminPatients: (params?: { status?: string; search?: string; ward?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.ward) query.append('ward', params.ward);
    return request<{ data: any[]; meta: any }>(`/admin/patients?${query.toString()}`);
  },
  createAdminPatient: (data: any) =>
    request<any>('/admin/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAdminPatient: (id: string, data: any) =>
    request<any>(`/admin/patients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  archiveAdminPatient: (id: string) =>
    request<any>(`/admin/patients/${id}/archive`, {
      method: 'POST',
    }),
  getAdminUsers: () => request<{ data: any[]; meta: any }>('/admin/users'),
  createAdminUser: (data: any) =>
    request<any>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAdminUser: (id: string, data: any) =>
    request<any>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getAdminDataStats: () => request<any>('/admin/data-stats'),
  importHospitalDatabase: (database: any, mode: 'REPLACE' | 'MERGE' = 'REPLACE') =>
    request<any>('/admin/import-database', {
      method: 'POST',
      body: JSON.stringify({ database, mode }),
    }),
  exportHospitalDatabase: () => {
    const token = localStorage.getItem('smartot_auth_token');
    window.open(`/api/admin/export-database${token ? `?token=${encodeURIComponent(token)}` : ''}`, '_blank');
  },
  resetDemoData: (confirmText: string) =>
    request<any>('/admin/reset-demo', {
      method: 'POST',
      body: JSON.stringify({ confirmText }),
    }),
  getSystemHealth: () => request<any>('/admin/system-health'),
};

