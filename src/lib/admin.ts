/* ────────────────────────────────────────────────────────
   Admin API — calls the scolaria-admin edge function which
   validates the developer code and uses the service role key
   to read/write data that school-account RLS blocks.
   ──────────────────────────────────────────────────────── */

import { getSupabase } from './supabase';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scolaria-admin`;

export interface AdminSchool {
  id: string;
  name: string;
  city: string;
  plan: 'Essentiel' | 'Premium' | 'Élite';
  subscription_status: string;
  trial_ends_at: string;
  created_at: string;
  director_name: string;
  phone: string;
  email: string;
  student_count: number;
  billing_period?: 'mensuel' | 'annuel';
  subscription_amount?: number | null;
  last_paid_at?: string | null;
  subscription_started_at?: string | null;
  last_seen_at?: string | null;
  last_device?: string | null;
  last_browser?: string | null;
  last_os?: string | null;
}

export interface AdminChurnStats {
  churned_30_days: number;
  churn_rate_30_days: number;
  churned_this_month: number;
  churn_rate_this_month: number;
  tracking_started_at: string | null;
}

export interface AdminLoginStats {
  today: number;
  this_month: number;
  last_30_days: number;
  daily: { date: string; count: number }[];
  monthly: { month: string; count: number }[];
}

export interface AdminVisit {
  id: string;
  visitor_id: string;
  session_id: string;
  page_path: string;
  referrer_origin: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device_type: string;
  operating_system: string;
  browser: string;
  screen_size: string | null;
  language: string | null;
  timezone: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface AdminVisitorAnalytics {
  summary: { total: number; unique_visitors: number; today: number; last_7_days: number; last_30_days: number; returning_visitors: number };
  visits: AdminVisit[];
}

export interface AdminManualPayment {
  id: string;
  school_id: string;
  school_name: string;
  provider: 'Orange Money' | 'Wave' | 'Moov Money' | 'Paiement manuel';
  sender: string;
  amount: number;
  status: 'en_attente' | 'valide' | 'rejete';
  received_at: string;
  billing_period?: 'mensuel' | 'annuel' | null;
  plan?: 'Essentiel' | 'Premium' | 'Élite' | null;
  payment_period_start?: string | null;
  payment_period_end?: string | null;
}

async function adminFetch(code: string, action: string, paymentId?: string, schoolId?: string, status?: 'suspend' | 'restore', paid?: boolean, plan?: 'Essentiel' | 'Premium' | 'Élite', billingPeriod?: 'mensuel' | 'annuel', trialDays?: number, plans?: { name: 'Essentiel' | 'Premium' | 'Élite'; monthly: number }[], extra: Record<string, unknown> = {}) {
  const { data: { session } } = await getSupabase().auth.getSession();
  const token = session?.access_token;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || key}`,
    },
    body: JSON.stringify({ code, action, paymentId, schoolId, status, paid, plan, billingPeriod, trialDays, plans, ...extra }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`);
  return json;
}

export async function adminGetVisitorAnalytics(code: string, period: '7' | '30' | 'all'): Promise<AdminVisitorAnalytics> {
  const { data } = await adminFetch(code, 'get_visitor_analytics');
  const result = data as AdminVisitorAnalytics | undefined;
  if (!result || !Array.isArray(result.visits) || !result.summary) {
    throw new Error('Les statistiques de visites ne sont pas disponibles.');
  }
  const cutoff = period === 'all' ? null : Date.now() - Number(period) * 86400000;
  return {
    summary: result.summary,
    visits: cutoff === null ? result.visits : result.visits.filter(visit => new Date(visit.created_at).getTime() >= cutoff),
  };
}

export async function adminGetChurnStats(code: string): Promise<AdminChurnStats> {
  const { data } = await adminFetch(code, 'get_subscription_churn_stats');
  return data || { churned_30_days: 0, churn_rate_30_days: 0, churned_this_month: 0, churn_rate_this_month: 0, tracking_started_at: null };
}

export async function adminGetLoginStats(code: string): Promise<AdminLoginStats> {
  const { data } = await adminFetch(code, 'get_login_stats');
  return data || { today: 0, this_month: 0, last_30_days: 0, daily: [], monthly: [] };
}

export async function adminListSchools(code: string): Promise<AdminSchool[]> {
  const { data } = await adminFetch(code, 'list_schools');
  return data || [];
}

export async function adminDeleteSchool(code: string, schoolId: string): Promise<void> {
  await adminFetch(code, 'delete_school', undefined, schoolId);
}

export async function adminListPayments(code: string): Promise<AdminManualPayment[]> {
  const { data } = await adminFetch(code, 'list_payments');
  return data || [];
}

export async function adminValidatePayment(code: string, paymentId: string): Promise<void> {
  await adminFetch(code, 'validate_payment', paymentId);
}

export async function adminRejectPayment(code: string, paymentId: string): Promise<void> {
  await adminFetch(code, 'reject_payment', paymentId);
}

export async function adminSetSchoolStatus(code: string, schoolId: string, status: 'suspend' | 'restore'): Promise<void> {
  await adminFetch(code, 'set_school_status', undefined, schoolId, status);
}

export async function adminSetSchoolPaidStatus(code: string, schoolId: string, paid: boolean, plan?: 'Essentiel' | 'Premium' | 'Élite', billingPeriod?: 'mensuel' | 'annuel'): Promise<void> {
  await adminFetch(code, 'set_school_paid_status', undefined, schoolId, undefined, paid, plan, billingPeriod);
}

export async function adminSetSchoolPlan(code: string, schoolId: string, plan: 'Essentiel' | 'Premium' | 'Élite', billingPeriod: 'mensuel' | 'annuel'): Promise<void> {
  await adminFetch(code, 'set_school_plan', undefined, schoolId, undefined, undefined, plan, billingPeriod);
}

export async function adminSetTrialDays(code: string, schoolId: string, trialDays: number): Promise<void> {
  await adminFetch(code, 'set_trial_end', undefined, schoolId, undefined, undefined, undefined, undefined, trialDays);
}

export async function adminSavePublicPricing(code: string, plans: { name: 'Essentiel' | 'Premium' | 'Élite'; monthly: number }[]): Promise<void> {
  await adminFetch(code, 'save_public_pricing', undefined, undefined, undefined, undefined, undefined, undefined, undefined, plans);
}

export async function adminSavePublicTrialDays(code: string, trialDays: number): Promise<void> {
  await adminFetch(code, 'save_trial_days', undefined, undefined, undefined, undefined, undefined, undefined, trialDays);
}


export interface AdminAffiliate {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  referral_code: string;
  status: 'active' | 'paused';
  created_at: string;
  referrals_count: number;
  due_total: number;
  paid_total: number;
  commissions: AdminAffiliateCommission[];
}
export interface AdminAffiliateCommission {
  id: string;
  affiliate_id: string;
  school_id: string;
  school_name: string;
  plan: 'Essentiel' | 'Premium' | 'Élite';
  subscription_amount: number;
  commission_amount: number;
  status: 'due' | 'paid';
  created_at: string;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
}
export async function adminListAffiliates(code: string): Promise<AdminAffiliate[]> {
  const { data } = await adminFetch(code, 'list_affiliates');
  return Array.isArray(data) ? data as AdminAffiliate[] : [];
}
export async function adminCreateAffiliate(code: string, affiliate: { full_name: string; phone: string; email: string }): Promise<void> {
  await adminFetch(code, 'create_affiliate', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, affiliate);
}
export async function adminSetAffiliateStatus(code: string, affiliateId: string, status: 'active' | 'paused'): Promise<void> {
  await adminFetch(code, 'set_affiliate_status', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, { affiliateId, affiliateStatus: status });
}
export async function adminMarkAffiliateCommissionPaid(code: string, commissionId: string, paymentMethod: string, paymentReference: string): Promise<void> {
  await adminFetch(code, 'mark_affiliate_commission_paid', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, { commissionId, paymentMethod, paymentReference });
}
