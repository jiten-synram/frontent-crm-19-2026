// src/lib/api.ts — Complete Axios API client with interceptors

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }
      isRefreshing = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) throw new Error('No refresh token');
        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: refresh });
        // const newToken = (res.data as any).accessToken;
        // localStorage.setItem('access_token', newToken);
        // refreshQueue.forEach((cb) => cb(newToken));
        // refreshQueue = [];
        // original.headers.Authorization = `Bearer ${newToken}`;
        const newAccess  = (res.data as any).accessToken;
        const newRefresh = (res.data as any).refreshToken;
        localStorage.setItem('access_token',  newAccess);
        localStorage.setItem('refresh_token', newRefresh);
        refreshQueue.forEach((cb) => cb(newAccess));
        refreshQueue = [];
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch {
        
        // ✅ YAHAN ADD KARO — in 2 lines
        const { useAuthStore } = await import('@/store/auth');
        useAuthStore.getState().clearAuth();
        // ✅ UPAR TAK

        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err.response?.data || err);
  }
);

// ── AUTH ──────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  getUsers: (params?: Record<string, unknown>) =>
    api.get('/auth/users', { params }),
  createUser: (data: Record<string, unknown>) =>
    api.post('/auth/users', data),
  updateUser: (id: number, data: Record<string, unknown>) =>
    api.patch(`/auth/users/${id}`, data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch('/auth/change-password', data),
  getMyCategories: () => api.get('/auth/my-categories'),
};

// ── LEADS ─────────────────────────────────────────────────────────────
export const leadsAPI = {
  list: (params?: Record<string, unknown>) =>
    api.get('/leads', { params }),
  stats: () => api.get('/leads/stats/summary'),
  get: (id: number) => api.get(`/leads/${id}`),
  create: (data: Record<string, unknown>) => api.post('/leads', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/leads/${id}`, data),
  updateStatus: (id: number, data: Record<string, unknown>) =>
    api.patch(`/leads/${id}/status`, data),
  assign: (id: number, data: { assigned_to: number }) =>
    api.patch(`/leads/${id}/assign`, data),
  addNote: (id: number, data: { note: string; is_private?: boolean }) =>
    api.post(`/leads/${id}/notes`, data),
  addCallLog: (id: number, data: Record<string, unknown>) =>
    api.post(`/leads/${id}/call-log`, data),
  bulkAssign: (data: { ids: number[]; assigned_to: number }) =>
    api.patch('/leads/bulk-assign', data),
};

// ── FOLLOW-UPS ────────────────────────────────────────────────────────
export const followUpsAPI = {
  list: (params?: Record<string, unknown>) =>
    api.get('/leads/follow-ups', { params }),
  counts: () => api.get('/leads/follow-ups/counts'),
  complete: (id: number, data?: Record<string, unknown>) =>
    api.patch(`/leads/follow-ups/${id}/complete`, data),
};

// ── CUSTOMERS ─────────────────────────────────────────────────────────
export const customersAPI = {
  list: (params?: Record<string, unknown>) =>
    api.get('/customers', { params }),
  lookup: (params: { phone?: string; email?: string }) =>
    api.get('/customers/lookup', { params }),
  get: (id: number) => api.get(`/customers/${id}`),
  reorder: (id: number, data: Record<string, unknown>) =>
    api.post(`/customers/${id}/reorder`, data),
   // ← YEH NAYI LINE ADD KARO
  cancelOrder: (customerId: number, orderId: number, data: { cancelled_date: string; remark?: string | null; }) =>
    api.patch(`/customers/${customerId}/orders/${orderId}/cancel`, data),
};

// ── ORDERS ────────────────────────────────────────────────────────────
export const ordersAPI = {
  list: (params?: Record<string, unknown>) =>
    api.get('/orders', { params }),
  updateTracking: (id: number, data: Record<string, unknown>) =>
    api.patch(`/orders/${id}/tracking`, data),
};

// ── DASHBOARD ─────────────────────────────────────────────────────────
export const dashAPI = {
  admin: (params?: Record<string, unknown>) =>
    api.get('/dashboard/admin', { params }),
  user: () => api.get('/dashboard/user'),
};

// ── REPORTS ───────────────────────────────────────────────────────────
export const reportsAPI = {
  revenue: (params?: Record<string, unknown>) =>
    api.get('/reports/revenue', { params }),
  team: (params?: Record<string, unknown>) =>
    api.get('/reports/team-performance', { params }),
  campaigns: () => api.get('/reports/campaign-performance'),
  incentives: (params?: Record<string, unknown>) =>
    api.get('/reports/incentives', { params }),
  campaignsList: () => api.get('/reports/campaigns-list'),
  // export: (params: Record<string, unknown>) => {
  //   const token = localStorage.getItem('access_token');
  //   const qs = new URLSearchParams(params as Record<string, string>).toString();
  //   window.open(`${BASE_URL}/reports/export?${qs}&token=${token}`, '_blank');
  // },
  export: async (params: Record<string, unknown>) => {
    const token = localStorage.getItem('access_token');
    const cleanParams: Record<string, string> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) {
        cleanParams[k] = String(v);
      }
    });
    const qs = new URLSearchParams(cleanParams).toString();
    const res = await fetch(`${BASE_URL}/reports/export?${qs}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const ext  = cleanParams.format === 'csv' ? 'csv' : 'xlsx';
    a.href     = url;
    a.download = `yogveda-report-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// ── TEAM ──────────────────────────────────────────────────────────────
export const teamAPI = {
  roundRobinStatus: () => api.get('/team/round-robin'),
  addToPool: (data: { user_id: number; category: string }) =>
    api.post('/team/assign-category', data),
  removeFromPool: (data: { user_id: number; category: string }) =>
    api.delete('/team/assign-category', { data }),
  resetIndex: (category: string) =>
    api.patch(`/team/reset-index/${encodeURIComponent(category)}`),
  getPoolMembers: (category: string) =>   // ✅ ye add karo
    api.get('/team/pool-members', { params: { category } }),
  getUserCategories: (userId: number) =>
    api.get(`/team/user-categories/${userId}`),
};

// ── INTEGRATIONS ──────────────────────────────────────────────────────
export const integrationsAPI = {
  status: () => api.get('/webhooks/status'),
  sendWA: (data: { phone: string; message: string }) =>
    api.post('/webhooks/whatsapp/send', data),
  broadcast: (data: { phones: string[]; message: string }) =>
    api.post('/webhooks/whatsapp/broadcast', data),
  getLogs: () => api.get('/webhooks/logs'),
  getSettings: () => api.get('/integrations/settings'),
  saveSettings: (settings: Record<string, string>) =>
    api.post('/integrations/settings', { settings }),
};


export default api;
