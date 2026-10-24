import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from './supabase';

/* ────────────────────────────────────────────────────────
   Auth context — manages the Supabase session and the
   school profile (school_id, role, trial status).
   ──────────────────────────────────────────────────────── */

export interface SchoolProfile {
  schoolId: string;
  schoolName: string;
  directorName: string;
  role: string;
  trialEndsAt: string | null;
  subscriptionStatus: string;
  plan: string;
  subscriptionAmount: number;
}

interface AuthContextValue {
  user: User | null;
  profile: SchoolProfile | null;
  loading: boolean;
  isTrialExpired: boolean;
  signUp: (email: string, password: string, schoolName: string, directorName: string, phone: string) => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function detectDeviceInfo() {
  const ua = navigator.userAgent || '';
  const device = /iPad|Tablet/i.test(ua) ? 'Tablette' : /Android/i.test(ua) ? 'Téléphone Android' : /iPhone|iPod/i.test(ua) ? 'iPhone' : /Windows Phone/i.test(ua) ? 'Téléphone Windows' : /Mobi/i.test(ua) ? 'Téléphone' : /Macintosh|Mac OS/i.test(ua) ? 'Ordinateur Mac' : /Windows/i.test(ua) ? 'Ordinateur Windows' : /Linux/i.test(ua) ? 'Ordinateur Linux' : 'Appareil inconnu';
  const browser = /Edg\//.test(ua) ? 'Microsoft Edge' : /SamsungBrowser\//.test(ua) ? 'Samsung Internet' : /Firefox\//.test(ua) ? 'Mozilla Firefox' : /Chrome\//.test(ua) ? 'Google Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navigateur inconnu';
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS/iPadOS' : /Windows/i.test(ua) ? 'Windows' : /Mac OS|Macintosh/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : 'Système inconnu';
  return { device, browser, os };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<SchoolProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const lastDeviceReportAt = useRef(0);

  async function fetchProfile(u: User): Promise<SchoolProfile | null> {
    const { data, error } = await getSupabase()
      .from('users')
      .select('school_id, role, email, schools(name, director_name, trial_ends_at, subscription_status, plan, subscription_amount)')
      .eq('auth_uid', u.id)
      .maybeSingle();

    if (error || !data) {
      // Offline fallback: reuse only the profile previously fetched for this signed-in user.
      try {
        const cached = localStorage.getItem('gestilys-profile-cache-' + u.id);
        if (cached) {
          const parsed = JSON.parse(cached) as SchoolProfile;
          if (parsed.schoolId && parsed.role) {
            setProfile(parsed);
            return parsed;
          }
        }
      } catch { /* Ignore invalid or unavailable local cache. */ }
      setProfile(null);
      return null;
    }

    if (Date.now() - lastDeviceReportAt.current > 5 * 60 * 1000) {
      lastDeviceReportAt.current = Date.now();
      const deviceInfo = detectDeviceInfo();
      void getSupabase().rpc('record_my_device', { p_device: deviceInfo.device, p_browser: deviceInfo.browser, p_os: deviceInfo.os }).then(({ error: deviceError }) => {
        if (deviceError) console.warn('Impossible d’enregistrer les informations de l’appareil :', deviceError.message);
      });
    }

    const school = (data as any).schools;
    const p: SchoolProfile = {
      schoolId: data.school_id,
      schoolName: school?.name || '',
      directorName: school?.director_name || '',
      role: data.role,
      trialEndsAt: school?.trial_ends_at || null,
      subscriptionStatus: school?.subscription_status || 'trial',
      plan: school?.plan || 'Essentiel',
      subscriptionAmount: Number(school?.subscription_amount || 0),
    };
    setProfile(p);
    try { localStorage.setItem('gestilys-profile-cache-' + u.id, JSON.stringify(p)); } catch { /* Optional offline profile cache. */ }
    return p;
  }

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setLoading(true);
        setUser(session.user);
        fetchProfile(session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch((error) => {
      console.error('Failed to restore authentication session:', error);
      setLoading(false);
    });

    // onAuthStateChange runs synchronously — wrap async work in IIFE to avoid deadlock
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((event, session) => {
      (async () => {
        if (session?.user) {
          setLoading(true);
          setUser(session.user);
          try {
            await fetchProfile(session.user);
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
              const eventType = event === 'SIGNED_IN' ? 'sign_in' : 'session_restore';
              void getSupabase().rpc('record_my_login', { p_event_type: eventType }).then(({ error: loginError }) => {
                if (loginError) console.warn('Impossible d’enregistrer cette connexion :', loginError.message);
              });
            }
          } finally {
            setLoading(false);
          }
        } else {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Keep subscription status in sync when an administrator changes it in another tab/device.
  // On mobile, returning to the app commonly fires visibilitychange rather than a full reload.
  useEffect(() => {
    if (!user) return;
    let refreshing = false;
    const refreshCurrentProfile = async () => {
      if (refreshing || document.visibilityState !== 'visible') return;
      refreshing = true;
      try {
        await fetchProfile(user);
      } catch (error) {
        console.error('Failed to refresh school subscription status:', error);
      } finally {
        refreshing = false;
      }
    };
    window.addEventListener('focus', refreshCurrentProfile);
    document.addEventListener('visibilitychange', refreshCurrentProfile);
    return () => {
      window.removeEventListener('focus', refreshCurrentProfile);
      document.removeEventListener('visibilitychange', refreshCurrentProfile);
    };
  }, [user]);

  const isTrialExpired =
    !!profile &&
    profile.subscriptionStatus === 'trial' &&
    !!profile.trialEndsAt &&
    new Date(profile.trialEndsAt) < new Date();

  async function signUp(
    email: string,
    password: string,
    schoolName: string,
    directorName: string,
    phone: string,
  ): Promise<{ error?: string }> {
    const { data, error } = await getSupabase().auth.signUp({ email, password, options: { data: { director_phone: phone } } });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Erreur inattendue lors de l'inscription." };

    // Create the school + user profile + seed default data atomically
    const { data: schoolId, error: rpcError } = await getSupabase().rpc('handle_new_school', {
      p_school_name: schoolName,
      p_director_name: directorName,
      p_email: email,
    });
    if (rpcError) return { error: rpcError.message };
    const { error: phoneError } = await getSupabase().rpc('set_new_school_phone', {
      p_school_id: schoolId,
      p_phone: phone,
    });
    if (phoneError) return { error: 'Compte créé, mais le numéro n’a pas pu être enregistré. Contactez le support avant de recommencer l’inscription.' };

    await fetchProfile(data.user);
    return {};
  }

  async function signIn(email: string, password: string): Promise<{ error?: string }> {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }

  async function resetPassword(email: string): Promise<{ error?: string }> {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    return error ? { error: error.message } : {};
  }

  async function signOut(): Promise<void> {
    await getSupabase().auth.signOut();
    setUser(null);
    setProfile(null);
  }

  async function refreshProfile(): Promise<void> {
    if (user) await fetchProfile(user);
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, isTrialExpired, signUp, signIn, resetPassword, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
