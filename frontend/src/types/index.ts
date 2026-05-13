/** AIOps 全局类型定义 */

export interface User {
  id: number;
  username: string;
  display_name?: string;
  email?: string;
  phone?: string;
  role_id?: number;
  role_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface LoginParams {
  username: string;
  password: string;
}

export interface LoginResult {
  access_token: string;
  token_type: string;
  user_id: number;
  username: string;
  display_name?: string;
  role?: string;
}

export interface Device {
  id: number;
  name: string;
  ip_address: string;
  vendor: string;
  model?: string;
  device_type: string;
  status: string;
  cpu_usage: number;
  memory_usage: number;
  online_duration: number;
  location?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface DeviceCreate {
  name: string;
  ip_address: string;
  vendor: string;
  model?: string;
  device_type?: string;
  ssh_port?: number;
  ssh_username?: string;
  ssh_password?: string;
  location?: string;
  description?: string;
}

export interface Alert {
  id: number;
  alert_id: string;
  device_id?: number;
  device_name?: string;
  device_ip?: string;
  level: string;
  title: string;
  content?: string;
  alert_type: string;
  status: string;
  is_auto_recovery: boolean;
  recovery_status?: string;
  root_cause?: string;
  handling_suggestion?: string;
  occurrence_count: number;
  first_occurred: string;
  last_occurred: string;
  created_at: string;
}

export interface ConfigBackup {
  id: number;
  device_id: number;
  device_name?: string;
  backup_time: string;
  status: string;
  version?: string;
}

export interface ConfigBaseline {
  id: number;
  name: string;
  device_type?: string;
  content: string;
  is_active: boolean;
  created_at: string;
}

export interface InspectionTask {
  id: number;
  name: string;
  scope?: string;
  indicators?: string;
  cron_expr?: string;
  is_active: boolean;
  status: string;
  last_run_at?: string;
  created_at: string;
}

export interface InspectionResult {
  id: number;
  device_id: number;
  device_name?: string;
  indicator: string;
  value?: string;
  threshold?: string;
  status: string;
  detail?: string;
  inspected_at: string;
}

export interface LogEntry {
  id: number;
  device_id?: number;
  device_name?: string;
  log_type: string;
  level: string;
  content: string;
  is_anomaly: boolean;
  anomaly_reason?: string;
  logged_at: string;
}

export interface ChatMessage {
  id: number;
  session_id: string;
  role: string;
  content: string;
  message_type: string;
  created_at: string;
}

export interface ChatSession {
  session_id: string;
  created_at: string;
  last_message: string;
  message_count: number;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
}

export interface ChatResponse {
  reply: string;
  session_id: string;
  actions?: Array<{ type: string; label: string; command: string }>;
}

export interface DashboardStats {
  device_online_rate: number;
  total_alerts: number;
  critical_alerts: number;
  major_alerts: number;
  warning_alerts: number;
  auto_recovery_rate: number;
  system_availability: number;
  collection_coverage: number;
  device_distribution: Array<{ name: string; value: number }>;
  alert_trend: Array<{ date: string; level: string; count: number }>;
  traffic_top: Array<{ name: string; traffic: number }>;
  recovery_stats: { success: number; failed: number; rate: number };
}

export interface Role {
  id: number;
  name: string;
  permissions?: string;
  description?: string;
}

export interface OperationLog {
  id: number;
  user_id?: number;
  username?: string;
  action: string;
  target?: string;
  detail?: string;
  ip_address?: string;
  status: string;
  created_at: string;
}
