import { useState } from 'react';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, School, UserCircle,
  Sparkles, ShieldCheck, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../lib/auth';

interface AuthPageProps {
  onBack: () => void;
}

type Mode = 'login' | 'signup';

export function AuthPage({ onBack }: AuthPageProps) {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputBase = 'h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-ink outline-none transition focus:border-royal-400 focus:ring-4';
  const inputPass = 'h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-11 text-sm text-ink outline-none transition focus:border-royal-400 focus:ring-4';

  const canSubmit = mode === 'login'
    ? email.trim().length > 0 && password.length > 0
    : schoolName.trim() && directorName.trim() && email.trim() && password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const { error: err } = await signUp(email.trim(), password, schoolName.trim(), directorName.trim());
        if (err) setError(err);
      } else {
        const { error: err } = await signIn(email.trim(), password);
        if (err) setError(err);
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Veuillez saisir votre adresse e-mail ci-dessus, puis cliquer à nouveau sur "Mot de passe oublié".');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await resetPassword(email.trim());
    setLoading(false);
    if (err) setError(err);
    else setResetSent(true);
  };
  const switchMode = (m: Mode) => {
    setMode(m);
    setPassword('');
    setShowPass(false);
    setError(null);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-royal-900 to-royal-800">
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl animate-floatY" style={{ background: 'radial-gradient(circle, rgba(245,197,24,.16), transparent 70%)' }} />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full blur-3xl animate-floatY" style={{ background: 'radial-gradient(circle, rgba(90,140,245,.14), transparent 70%)', animationDelay: '2s' }} />
      </div>
      <div className="bg-grid-light pointer-events-none absolute inset-0 opacity-30" />

      {/* Back button */}
      <button onClick={onBack} className="absolute left-5 top-5 z-20 inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-700 text-white backdrop-blur-sm transition hover:bg-white/10 active:scale-95">
        <ArrowLeft className="h-3.5 w-3.5" /> Retour
      </button>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Logo + heading */}
          <div className="animate-fadeUp mb-6 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 shadow-glow-gold">
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
            </div>
            <h1 className="mt-4 font-display text-2xl font-800 tracking-tight text-white">
              {mode === 'login' ? 'Bon retour' : 'Créer un compte'}
            </h1>
            <p className="mt-1 text-sm text-royal-100">
              {mode === 'login' ? 'Connectez-vous pour accéder à votre cahier de caisse' : 'Inscrivez votre école en quelques secondes'}
            </p>
          </div>

          {/* Card */}
          <div className="animate-fadeUp delay-100 rounded-3xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8">
            {/* Mode tabs */}
            <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1">
              <button onClick={() => switchMode('login')} className={`flex-1 rounded-lg py-2 text-sm font-700 transition ${mode === 'login' ? 'bg-white text-royal-700 shadow-sm' : 'text-slate-500 hover:text-slate-600'}`}>
                Connexion
              </button>
              <button onClick={() => switchMode('signup')} className={`flex-1 rounded-lg py-2 text-sm font-700 transition ${mode === 'signup' ? 'bg-white text-royal-700 shadow-sm' : 'text-slate-500 hover:text-slate-600'}`}>
                Inscription
              </button>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <Field icon={<School className="h-4.5 w-4.5 text-slate-400" />} label="Nom de l'école">
                  <input value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="École Les Hirondelles" className={inputBase} autoComplete="organization" />
                </Field>
              )}
              {mode === 'signup' && (
                <Field icon={<UserCircle className="h-4.5 w-4.5 text-slate-400" />} label="Nom du directeur">
                  <input value={directorName} onChange={e => setDirectorName(e.target.value)} placeholder="M. Mamadou Diallo" className={inputBase} autoComplete="name" />
                </Field>
              )}

              <Field icon={<Mail className="h-4.5 w-4.5 text-slate-400" />} label="Adresse e-mail">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="directeur@ecole.sn" className={inputBase} autoComplete="email" />
              </Field>

              <Field icon={<Lock className="h-4.5 w-4.5 text-slate-400" />} label="Mot de passe">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={inputPass} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                  <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600" aria-label={showPass ? 'Masquer' : 'Afficher'}>
                    {showPass ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </Field>

              {mode === 'signup' && (
                <p className="text-xs leading-relaxed text-slate-400">
                  Le mot de passe doit contenir au moins 6 caractères. Votre école bénéficie d'un essai gratuit de 14 jours.
                </p>
              )}

              <button type="submit" disabled={!canSubmit || loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-royal-700 to-royal-900 text-sm font-700 text-white shadow-cardLg transition hover:brightness-110 active:scale-95 disabled:opacity-40">
                {loading ? (
                  <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {mode === 'login' && (
              <div className="mt-3 text-center">
                {resetSent ? (
                  <p className="text-sm font-600 text-emerald-600">
                    E-mail envoyé ! Vérifiez votre boîte de réception (et vos spams).
                  </p>
                ) : (
                  <button type="button" onClick={handleForgotPassword} className="text-sm font-700 text-royal-700 transition hover:text-royal-900 hover:underline">
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
            )}

            {/* Switch link */}
            <p className="mt-6 text-center text-sm text-slate-500">
              {mode === 'login' ? "Pas encore de compte ? " : 'Déjà inscrit ? '}
              <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} className="font-700 text-royal-700 transition hover:text-royal-900 hover:underline">
                {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
              </button>
            </p>
          </div>

          {/* Trust footer */}
          <div className="animate-fadeUp delay-200 mt-6 flex items-center justify-center gap-4 text-xs font-600 text-royal-100">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-gold-300" /> Données chiffrées</span>
            <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-gold-300" /> Essai gratuit 14j</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-700 uppercase tracking-wide text-slate-500">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">{icon}</span>
        {children}
      </div>
    </div>
  );
}
