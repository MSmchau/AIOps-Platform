/** Axios API 服务封装 */
import axios from 'axios';
import type { ChatRequest } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// 请求拦截器 - 自动添加Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aiops_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 统一错误处理
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('aiops_token');
      localStorage.removeItem('aiops_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;

// ===== 认证 =====
export const authApi = {
  login: (data: { username: string; password: string }) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ===== 仪表盘 =====
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
};

// ===== 设备管理 =====
export const deviceApi = {
  list: (params?: any) => api.get('/devices', { params }),
  get: (id: number) => api.get(`/devices/${id}`),
  create: (data: any) => api.post('/devices', data),
  update: (id: number, data: any) => api.put(`/devices/${id}`, data),
  delete: (id: number) => api.delete(`/devices/${id}`),
  execute: (id: number, command: string) => api.post(`/devices/${id}/execute`, { command }),
  backup: (id: number) => api.post(`/devices/${id}/backup`),
  reboot: (id: number) => api.post(`/devices/${id}/reboot`),
  batchExecute: (data: { device_ids: number[]; command: string }) => api.post('/devices/batch/execute', data),
};

// ===== 告警处置 =====
export const alertApi = {
  list: (params?: any) => api.get('/alerts', { params }),
  detail: (id: number) => api.get(`/alerts/${id}/detail`),
  handle: (id: number, data: any) => api.post(`/alerts/${id}/handle`, data),
  autoHeal: (id: number) => api.post(`/alerts/${id}/auto-heal`),
  rootCause: (id: number) => api.post(`/alerts/${id}/root-cause`),
  noiseReduction: () => api.get('/alerts/noise-reduction'),
  notifConfigs: () => api.get('/alerts/notification-configs'),
  createNotifConfig: (data: any) => api.post('/alerts/notification-configs', data),
  toggleNotif: (id: number) => api.put(`/alerts/notification-configs/${id}/toggle`),
};

// ===== 配置管理 =====
export const configApi = {
  backups: (params?: any) => api.get('/configs/backups', { params }),
  runBackup: (device_ids: number[]) => api.post('/configs/backups/run', device_ids),
  baselines: () => api.get('/configs/baselines'),
  createBaseline: (data: any) => api.post('/configs/baselines', data),
  deleteBaseline: (id: number) => api.delete(`/configs/baselines/${id}`),
  runCheck: (baseline_id: number, device_ids: number[]) =>
    api.post(`/configs/baselines/${baseline_id}/check`, device_ids),
  deploy: (data: any) => api.post('/configs/deploy', data),
};

// ===== 智能巡检 =====
export const inspectionApi = {
  tasks: () => api.get('/inspections/tasks'),
  createTask: (data: any) => api.post('/inspections/tasks', data),
  deleteTask: (id: number) => api.delete(`/inspections/tasks/${id}`),
  runTask: (id: number) => api.post(`/inspections/tasks/${id}/run`),
  results: (params?: any) => api.get('/inspections/results', { params }),
};

// ===== 日志分析 =====
export const logApi = {
  list: (params?: any) => api.get('/logs', { params }),
  analyze: (id: number) => api.get(`/logs/${id}/analyze`),
  trend: () => api.get('/logs/trend'),
};

// ===== 智能交互 =====
export const chatApi = {
  send: (data: ChatRequest) => api.post('/chat', data),
  history: (session_id?: string) => api.get('/chat/history', { params: { session_id } }),
  sessions: () => api.get('/chat/sessions'),
  deleteSession: (session_id: string) => api.delete(`/chat/history/${session_id}`),
};

// ===== 系统设置 =====
export const systemApi = {
  users: () => api.get('/system/users'),
  createUser: (data: any) => api.post('/system/users', data),
  updateUser: (id: number, data: any) => api.put(`/system/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/system/users/${id}`),
  roles: () => api.get('/system/roles'),
  createRole: (data: any) => api.post('/system/roles', data),
  deleteRole: (id: number) => api.delete(`/system/roles/${id}`),
  logs: (params?: any) => api.get('/system/logs', { params }),
};
