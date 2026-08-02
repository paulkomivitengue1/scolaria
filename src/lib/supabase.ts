import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Lazy Supabase client. The client (and the env-var validation) is deferred
 * to the first call, NOT module load time. This ensures any configuration
 * error is thrown inside a React render/effect cycle where the Error Boundary
 * can catch it — instead of during ES module evaluation, which would crash
 * the app with a blank screen before React mounts.
 */
export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  if (!url || !key) {
    throw new Error(
      `Configuration Supabase manquante. Vérifiez que les variables d'environnement ` +
      `VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont définies (sur Vercel : Settings > Environment Variables, puis Redeploy). ` +
      `URL: "${url ?? '(vide)'}", Clé: "${key ? '(présente)' : '(vide)'}".`
    );
  }

  _client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}
