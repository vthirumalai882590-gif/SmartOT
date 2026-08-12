import { offlineQueue } from './offline-queue';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('smartot_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('smartot_auth_token');
        localStorage.removeItem('smartot_auth_user');
      }
      throw new Error(data.message || data.error || 'Network request failed');
    }

    return data.data;
  } catch (err: any) {
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
  getPatients: () => request<any[]>('/patients'),
  getPatientById: (id: string) => request<any>(`/patients/${id}`),
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
  verifyCSSDQR: (data: { packId: string; targetOT?: string; requiredPackType?: string }) =>
    request<any>('/cssd/scan', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  transitionCSSDPack: (
    packId: string,
    data: { targetStatus: string; assignedOtId?: string; assignedSurgeryId?: string; currentLocation?: string }
  ) =>
    request<any>(`/cssd/packs/${packId}/transition`, {
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
  resetDemoData: (confirmText: string) =>
    request<any>('/admin/reset-demo', {
      method: 'POST',
      body: JSON.stringify({ confirmText }),
    }),
  getSystemHealth: () => request<any>('/admin/system-health'),
};

