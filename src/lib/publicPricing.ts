// Public pricing is fetched through the Edge Function; no direct database client is needed here.
export type GestilysPlanName = 'Essentiel' | 'Premium' | 'Élite';
export interface PublicPlanPrice { name: GestilysPlanName; monthly: number; }
export const DEFAULT_PLAN_PRICES: PublicPlanPrice[] = [
  { name: 'Essentiel', monthly: 10000 },
  { name: 'Premium', monthly: 20000 },
  { name: 'Élite', monthly: 30000 },
];

export async function loadPublicPlanPrices(): Promise<PublicPlanPrice[]> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scolaria-admin`;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ action: 'get_public_pricing' }),
    });
    if (!response.ok) return DEFAULT_PLAN_PRICES;
    const result = await response.json();
    const plans = result?.data?.plans;
    if (!Array.isArray(plans) || plans.length !== 3) return DEFAULT_PLAN_PRICES;
    const expected: GestilysPlanName[] = ['Essentiel', 'Premium', 'Élite'];
    const normalized = plans.map((plan: unknown, index: number) => {
      const item = plan as { name?: string; monthly?: number };
      if (item?.name !== expected[index] || !Number.isInteger(item.monthly) || (item.monthly as number) < 1000) throw new Error('Invalid public pricing');
      return { name: expected[index], monthly: item.monthly as number };
    });
    return normalized;
  } catch {
    return DEFAULT_PLAN_PRICES;
  }
}
