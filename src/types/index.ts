// src/types/index.ts — All CRM TypeScript types

export type UserRole = 'admin' | 'sub_admin' | 'sales';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  incentive_rate: number;
  designation?: string;
  last_login?: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

// ── Lead types ──────────────────────────────────────────────────
export type LeadStatus = 'new' | 'in_process' | 'follow_up' | 'converted' | 'delivered' | 'closed_lost';
export type LeadSource = 'call' | 'whatsapp' | 'referral' | 'campaign' | 'website' | 'meta_ads' | 'shopify';

export interface Lead {
  id: number;
  name: string;
  phone: string;
  alt_phone?: string;
  email?: string;
  city?: string;
  state?: string;
  age?: number;
  gender?: string;
  source: LeadSource;
  category: string;
  supplement?: string;
  campaign_id?: number;
  status: LeadStatus;
  assigned_to?: number;
  assigned_name?: string;
  assigned_email?: string;
  is_manual_assign: boolean;
  product_name?: string;
  order_amount?: number;
  tracking_id?: string;
  is_repeat: boolean;
  repeat_count: number;
  linked_customer_id?: number;
  is_duplicate: boolean;
  remark?: string;
  next_followup_at?: string;
  last_followup_at?: string;
  followup_count: number;
  revenue_countable: boolean;
  delivered_at?: string;
  external_id?: string;
  external_source?: string;
  campaign_name?: string;
  cust_orders?: number;
  cust_ltv?: number;
  created_at: string;
  updated_at: string;
  // Nested (from GET /leads/:id)
  notes?: LeadNote[];
  callLogs?: CallLog[];
  history?: StatusHistory[];
  linkedCustomer?: {
    id: number; name: string; total_orders: number;
    lifetime_value: number; last_purchase: string;
  };
}

export interface LeadNote {
  id: number;
  lead_id: number;
  added_by: number;
  added_by_name: string;
  note: string;
  is_private: boolean;
  created_at: string;
}

export interface CallLog {
  id: number;
  lead_id: number;
  user_id: number;
  caller_name: string;
  call_type: 'inbound' | 'outbound';
  duration: number;
  outcome?: string;
  notes?: string;
  created_at: string;
}

export interface StatusHistory {
  id: number;
  lead_id: number;
  from_status?: string;
  to_status: string;
  changed_by?: number;
  changed_by_name?: string;
  remark?: string;
  changed_at: string;
}

export interface FollowUp {
  id: number;
  lead_id: number;
  assigned_to: number;
  agent_name: string;
  lead_name: string;
  lead_phone: string;
  lead_status: string;
  category: string;
  scheduled_at: string;
  completed_at?: string;
  status: 'pending' | 'done' | 'missed' | 'rescheduled';
  type: 'call' | 'whatsapp' | 'email' | 'visit';
  notes?: string;
  created_at: string;
}

// ── Customer types ──────────────────────────────────────────────
export interface Customer {
  id: number;
  name: string;
  phone: string;
  alt_phone?: string;
  email?: string;
  city?: string;
  state?: string;
  first_lead_id?: number;
  assigned_to?: number;
  agent_name?: string;
  total_orders: number;
  total_revenue: number;
  lifetime_value: number;
  avg_order_value: number;
  first_purchase?: string;
  last_purchase?: string;
  shopify_cust_id?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  purchases?: Purchase[];
}

export interface Purchase {
  id: number;
  customer_id: number;
  lead_id?: number;
  order_id?: number;
  product_name: string;
  amount: number;
  tracking_id?: string;
  order_date: string;
  delivery_date?: string;
  source: 'crm' | 'shopify';
  shopify_order_id?: string;
  status: string;
  created_at: string;
}

// ── Order types ─────────────────────────────────────────────────
export interface Order {
  id: number;
  lead_id?: number;
  customer_id?: number;
  assigned_to: number;
  lead_name?: string;
  lead_phone?: string;
  customer_name?: string;
  agent_name?: string;
  product_name: string;
  amount: number;
  qty: number;
  tracking_id?: string;
  courier?: string;
  order_date: string;
  dispatch_date?: string;
  delivery_date?: string;
  status: 'pending' | 'dispatched' | 'delivered' | 'returned' | 'cancelled';
  revenue_countable: boolean;
  is_repeat: boolean;
  order_index: number;
  shopify_order_id?: string;
  source: 'crm' | 'shopify';
  notes?: string;
  created_at: string;
}

// ── Dashboard types ─────────────────────────────────────────────
export interface DashboardCards {
  total: number;
  new: number;
  in_process: number;
  follow_up: number;
  converted: number;
  delivered: number;
  closed_lost: number;
  repeat_orders: number;
  total_revenue: number;
}

export interface UserPerformance {
  id: number;
  name: string;
  email: string;
  total_leads: number;
  converted: number;
  delivered: number;
  revenue: number;
  conversionRate: number;
}

export interface MonthlyRevenue {
  yr: number;
  mo: number;
  revenue: number;
  orders: number;
}

// ── Incentive types ─────────────────────────────────────────────
export interface Incentive {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  order_id: number;
  lead_id?: number;
  lead_name?: string;
  lead_phone?: string;
  product_name?: string;
  order_amount: number;
  rate: number;
  incentive_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  paid_at?: string;
  created_at: string;
}

// ── Campaign types ──────────────────────────────────────────────
export interface Campaign {
  id: number;
  name: string;
  platform: string;
  status: 'active' | 'paused' | 'ended';
  budget: number;
  start_date?: string;
  end_date?: string;
  external_id?: string;
  total_leads?: number;
  converted?: number;
  revenue?: number;
  conversion_rate?: number;
  created_at: string;
}

// ── Webhook log types ───────────────────────────────────────────
export interface WebhookLog {
  id: number;
  source: string;
  event: string;
  status: string;
  error_msg?: string;
  lead_id?: number;
  order_id?: number;
  created_at: string;
}

// ── API response wrappers ────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  total: number;
  page: number;
  pages: number;
  data: T[];
}

// ── Form types ──────────────────────────────────────────────────
export interface NewLeadForm {
  name: string;
  phone: string;
  alt_phone?: string;
  email?: string;
  city?: string;
  state?: string;
  source: LeadSource;
  category: string;
  supplement?: string;
  campaign_id?: number;
  product_name?: string;
  notes?: string;
  assigned_to?: number;
}

export interface StatusUpdateForm {
  status: LeadStatus;
  remark?: string;
  order_amount?: number;
  tracking_id?: string;
  next_followup_at?: string;
}
