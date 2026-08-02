import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `Configuration Supabase manquante. Vérifiez que VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont définis. ` +
    `URL trouvée: "${supabaseUrl ?? '(vide)'}", Clé trouvée: "${supabaseAnonKey ? '(présente)' : '(vide)'}".`
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
