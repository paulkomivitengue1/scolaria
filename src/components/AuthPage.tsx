import { useState } from 'react';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, School, UserCircle,
  Sparkles, ShieldCheck, Check,
} from 'lucide-react';

interface AuthPageProps {
  onLogin: () => void;
  onBack: () => void;
}

type Mode = 'login' | 'signup';

export function AuthPage({ onLogin, onBack }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);

  const inputBase = 'h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-ink outline-none transition focus:border-royal-400 focus:ring-4';
  const inputPass = 'h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-11 text-sm text-ink outline-none transition focus:border-royal-400 focus:ring-4';

  const canSubmit = mode === 'login'
    ? email.trim().length > 0 && password.length > 0
    : schoolName.trim() && directorName.trim() && email.trim() && password.length >= 4;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    const name = mode === 'signup' ? directorName.trim() : email.split('@')[0];
    setTimeout(() => {
      const session = {
        email: email.trim() || 'compte@scolaria.app',
        name: name || 'Directeur',
        school: schoolName.trim() || 'Notre École',
        provider: 'email',
        loginAt: Date.now(),
        remember,
      };
      localStorage.setItem('scolaria_session', JSON.stringify(session));
      setLoading(false);
      onLogin();
    }, 650);
  };

  const handleGoogle = () => {
    setLoading(true);
    setTimeout(() => {
      const session = {
        email: 'directeur@gmail.com',
        name: 'Compte Google',
        school: 'Notre École',
        provider: 'google',
        loginAt: Date.now(),
        remember: true,
      };
      localStorage.setItem('scolaria_session', JSON.stringify(session));
      setLoading(false);
      onLogin();
    }, 650);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setPassword('');
    setShowPass(false);
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

              {mode === 'login' && (
                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-600 text-slate-500">
                    <button type="button" onClick={() => setRemember(r => !r)} className={`grid h-4.5 w-4.5 place-items-center rounded-md border-2 transition ${remember ? 'border-royal-700 bg-royal-700' : 'border-slate-300 bg-white'}`}>
                      {remember && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </button>
                    Rester connecté
                  </label>
                  <button type="button" className="text-xs font-700 text-royal-700 transition hover:text-royal-900 hover:underline">
                    Mot de passe oublié ?
                  </button>
                </div>
              )}

              {mode === 'signup' && (
                <p className="text-xs leading-relaxed text-slate-400">
                  Le mot de passe doit contenir au moins 4 caractères. En vous inscrivant, vous acceptez nos conditions d'utilisation.
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

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-600 text-slate-400">ou</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Google button */}
            <button onClick={handleGoogle} disabled={loading} className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-700 text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:opacity-40">
              <GoogleIcon />
              {mode === 'login' ? 'Se connecter avec Google' : "S'inscrire avec Google"}
            </button>

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
            <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-gold-300" /> Essai gratuit</span>
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

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
