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
}

async function adminFetch(code: string, action: string, paymentId?: string) {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ code, action, paymentId }),
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
