/* ────────────────────────────────────────────────────────
   Admin API — calls the scolaria-admin edge function which
   validates the developer code and uses the service role key
   to read/write data that school-account RLS blocks.
   ──────────────────────────────────────────────────────── */

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
  student_count: number;
  billing_period?: 'mensuel' | 'annuel';
  subscription_amount?: number | null;
  last_paid_at?: string | null;
  subscription_started_at?: string | null;
}

export interface AdminManualPayment {
  id: string;
  school_id: string;
  school_name: string;
  provider: 'Orange Money' | 'Wave' | 'Moov Money';
  sender: string;
  amount: number;
  status: 'en_attente' | 'valide' | 'rejete';
  received_at: string;
  billing_period?: 'mensuel' | 'annuel' | null;
  plan?: 'Essentiel' | 'Premium' | 'Élite' | null;
  payment_period_start?: string | null;
  payment_period_end?: string | null;
}

async function adminFetch(code: string, action: string, paymentId?: string, schoolId?: string, status?: 'suspend' | 'restore', paid?: boolean, plan?: 'Essentiel' | 'Premium' | 'Élite', billingPeriod?: 'mensuel' | 'annuel', trialDays?: number, plans?: { name: 'Essentiel' | 'Premium' | 'Élite'; monthly: number }[]) {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ code, action, paymentId, schoolId, status, paid, plan, billingPeriod, trialDays, plans }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`);
  return json;
}

export async function adminListSchools(code: string): Promise<AdminSchool[]> {
  const { data } = await adminFetch(code, 'list_schools');
  return data || [];
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
