import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
}

interface AuthContextValue {
  user: User | null;
  profile: SchoolProfile | null;
  loading: boolean;
  isTrialExpired: boolean;
  signUp: (email: string, password: string, schoolName: string, directorName: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<SchoolProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(u: User): Promise<SchoolProfile | null> {
    const { data, error } = await getSupabase()
      .from('users')
      .select('school_id, role, email, schools(name, director_name, trial_ends_at, subscription_status)')
      .eq('auth_uid', u.id)
      .maybeSingle();

    if (error || !data) {
      setProfile(null);
      return null;
    }

    const school = (data as any).schools;
    const p: SchoolProfile = {
      schoolId: data.school_id,
      schoolName: school?.name || '',
      directorName: school?.director_name || '',
      role: data.role,
      trialEndsAt: school?.trial_ends_at || null,
      subscriptionStatus: school?.subscription_status || 'trial',
    };
    setProfile(p);
    return p;
  }

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // onAuthStateChange runs synchronously — wrap async work in IIFE to avoid deadlock
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user);
        } else {
          setUser(null);
          setProfile(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

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
  ): Promise<{ error?: string }> {
    const { data, error } = await getSupabase().auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Erreur inattendue lors de l'inscription." };

    // Create the school + user profile + seed default data atomically
    const { error: rpcError } = await getSupabase().rpc('handle_new_school', {
      p_school_name: schoolName,
      p_director_name: directorName,
      p_email: email,
    });
    if (rpcError) return { error: rpcError.message };

    await fetchProfile(data.user);
    return {};
  }

  async function signIn(email: string, password: string): Promise<{ error?: string }> {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
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
      value={{ user, profile, loading, isTrialExpired, signUp, signIn, signOut, refreshProfile }}
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
