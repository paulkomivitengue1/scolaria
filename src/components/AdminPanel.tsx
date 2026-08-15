import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ShieldCheck, Building2, CreditCard, Check, X, Search, BadgeCheck,
  Clock, AlertCircle, Smartphone, ArrowLeft, Sparkles, School, Lock,
  Loader2, LogOut, Users, Phone, TrendingUp, CalendarDays, CalendarRange,
  Calendar, User,
} from 'lucide-react';
import { formatFCFA } from '../types';
import {
  adminListSchools, adminListPayments, adminValidatePayment, adminRejectPayment,
  type AdminSchool, type AdminManualPayment,
} from '../lib/admin';

const DEV_CODE_STORAGE = 'scolaria_admin_code';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function planBadge(plan: string) {
  const styles: Record<string, string> = {
    Essentiel: 'bg-slate-100 text-slate-600',
    Premium: 'bg-royal-100 text-royal-700',
    Élite: 'bg-gradient-to-r from-gold-500 to-gold-600 text-white',
  };
  return styles[plan] || styles.Essentiel;
}

function statusBadge(status: string, trialEndsAt: string) {
  const now = new Date();
  const expired = new Date(trialEndsAt) < now;
  if (status === 'active') return { label: 'Payant', cls: 'bg-emerald-100 text-emerald-700', icon: BadgeCheck };
  if (status === 'trial' && !expired) return { label: 'Essai', cls: 'bg-gold-100 text-gold-700', icon: Clock };
  return { label: 'Expiré', cls: 'bg-red-100 text-red-700', icon: AlertCircle };
}

interface Props {
  onExit: () => void;
}

export function AdminPanel({ onExit }: Props) {
  const [code, setCode] = useState(() => sessionStorage.getItem(DEV_CODE_STORAGE) || '');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [payments, setPayments] = useState<AdminManualPayment[]>([]);
  const [filter, setFilter] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const loadData = useCallback(async (c: string) => {
    setDataLoading(true);
    try {
      const [s, p] = await Promise.all([adminListSchools(c), adminListPayments(c)]);
      setSchools(s);
      setPayments(p);
    } catch (err: any) {
      setAuthError(err.message || 'Erreur de chargement');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (code) {
      setAuthed(true);
      loadData(code);
    }
  }, [code, loadData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      await adminListSchools(code);
      sessionStorage.setItem(DEV_CODE_STORAGE, code);
      setAuthed(true);
      loadData(code);
    } catch (err: any) {
      setAuthError(err.message || 'Code invalide');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(DEV_CODE_STORAGE);
    setCode('');
    setAuthed(false);
    setSchools([]);
    setPayments([]);
  };

  const validatePayment = async (paymentId: string) => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return;
    setActionLoading(paymentId);
    try {
      await adminValidatePayment(code, paymentId);
      setPayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, status: 'valide' } : p)));
      setSchools((prev) => prev.map((s) => (s.id === payment.school_id ? { ...s, subscription_status: 'active' } : s)));
      showToast(`${payment.school_name} — 30 jours activés`);
    } catch (err: any) {
      showToast(err.message || 'Erreur validation');
    } finally {
      setActionLoading(null);
    }
  };

  const rejectPayment = async (paymentId: string) => {
    setActionLoading(paymentId);
    try {
      await adminRejectPayment(code, paymentId);
      setPayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, status: 'rejete' } : p)));
      showToast('Paiement rejeté');
    } catch (err: any) {
      showToast(err.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredSchools = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.director_name.toLowerCase().includes(q)
    );
  }, [schools, filter]);

  // ── Login screen ──────────────────────────────────────
  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-royal-900 via-royal-800 to-royal-900 px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-gold-300 shadow-lg backdrop-blur">
              <Lock className="h-8 w-8" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-800 tracking-tight text-white">Console Super-Admin</h1>
            <p className="mt-1.5 text-sm text-royal-200">Accès réservé au développeur. Aucune donnée ne sera affichée sans authentification.</p>
          </div>

          <form onSubmit={handleLogin} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <label className="mb-2 block text-sm font-700 text-white">Code développeur</label>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Entrez le code d'accès…"
              autoFocus
              className="h-12 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-sm text-white placeholder:text-royal-300 outline-none transition focus:border-gold-400 focus:ring-2 focus:ring-gold-400/30"
            />
            {authError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" /> {authError}
              </div>
            )}
            <button
              type="submit"
              disabled={authLoading || !code}
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 px-5 text-sm font-700 text-white shadow-cardLg transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
            >
              {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {authLoading ? 'Vérification…' : 'Accéder à la console'}
            </button>
          </form>

          <button
            onClick={onExit}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-600 text-royal-200 transition hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" /> Retour à l'application
          </button>
        </div>
      </div>
    );
  }

  // ── Main admin panel ──────────────────────────────────
  const pendingPayments = payments.filter((p) => p.status === 'en_attente');
  const resolvedPayments = payments.filter((p) => p.status !== 'en_attente');

  // Overview stats
  const trialCount = schools.filter((s) => s.subscription_status === 'trial' && new Date(s.trial_ends_at) > new Date()).length;
  const paidCount = schools.filter((s) => s.subscription_status === 'active').length;
  const expiredCount = schools.length - trialCount - paidCount;

  // Per-period new client stats
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const newToday = schools.filter((s) => new Date(s.created_at) >= todayStart).length;
  const newThisMonth = schools.filter((s) => new Date(s.created_at) >= monthStart).length;
  const newThisYear = schools.filter((s) => new Date(s.created_at) >= yearStart).length;

  return (
    <div className="min-h-screen bg-canvas bg-grid">
      <header className="sticky top-0 z-30 border-b border-royal-200 bg-gradient-to-r from-royal-900 via-royal-800 to-royal-900 shadow-cardLg">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-gold-300 backdrop-blur">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-lg font-800 tracking-tight text-white">Panneau Super-Admin</h1>
              <p className="text-[11px] font-600 text-royal-200">Gestilys · Console d'administration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-700 text-white backdrop-blur transition hover:bg-white/20 active:scale-95 sm:px-3.5 sm:text-sm"
            >
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Verrouiller</span>
            </button>
            <button
              onClick={onExit}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-700 text-white backdrop-blur transition hover:bg-white/20 active:scale-95 sm:px-3.5 sm:text-sm"
            >
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Retour à l'app</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        {dataLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-royal-700" />
          </div>
        ) : (
          <>
            {/* ── Overview: total + status breakdown ── */}
            <section className="mb-6">
              <div className="mb-4">
                <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-royal-700">
                  <TrendingUp className="h-3 w-3" /> Vue d'ensemble
                </div>
                <h2 className="font-display text-xl font-800 tracking-tight text-ink sm:text-2xl">Tableau de bord</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard icon={Building2} label="Total écoles" value={schools.length} accent="royal" />
                <StatCard icon={Clock} label="En essai" value={trialCount} accent="gold" />
                <StatCard icon={BadgeCheck} label="Payants" value={paidCount} accent="emerald" />
                <StatCard icon={AlertCircle} label="Expirés" value={expiredCount} accent="red" />
              </div>
            </section>

            {/* ── New clients per period ── */}
            <section className="mb-6">
              <div className="mb-4">
                <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-emerald-700">
                  <Sparkles className="h-3 w-3" /> Nouveaux clients
                </div>
                <h2 className="font-display text-lg font-800 tracking-tight text-ink sm:text-xl">Inscriptions par période</h2>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <PeriodCard icon={CalendarDays} label="Aujourd'hui" value={newToday} />
                <PeriodCard icon={CalendarRange} label="Ce mois-ci" value={newThisMonth} />
                <PeriodCard icon={Calendar} label="Cette année" value={newThisYear} />
              </div>
            </section>

            {/* ── Pending payments (highlighted section) ── */}
            {pendingPayments.length > 0 && (
              <section className="mb-6">
                <div className="mb-4">
                  <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-gold-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-gold-700">
                    <CreditCard className="h-3 w-3" /> Paiements en attente
                  </div>
                  <h2 className="font-display text-lg font-800 tracking-tight text-ink sm:text-xl">Validation des paiements manuels</h2>
                  <p className="mt-0.5 text-sm text-slate-500">Orange Money / Wave / Moov — en attente de validation.</p>
                </div>

                <div className="space-y-3 md:hidden">
                  {pendingPayments.map((p) => (
                    <PaymentCardMobile key={p.id} p={p} onValidate={validatePayment} onReject={rejectPayment} loading={actionLoading === p.id} />
                  ))}
                </div>

                <div className="hidden overflow-hidden rounded-2xl border border-gold-200 bg-white shadow-card md:block">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-gold-50/40 text-left text-[11px] font-700 uppercase tracking-wider text-slate-400">
                        <th className="px-5 py-3">École</th>
                        <th className="px-3 py-3">Fournisseur</th>
                        <th className="px-3 py-3">Émetteur</th>
                        <th className="px-3 py-3 text-right">Montant</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingPayments.map((p) => (
                        <tr key={p.id} className="border-b border-slate-100 transition hover:bg-slate-50/60">
                          <td className="px-5 py-3 font-700 text-ink">{p.school_name}</td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-700 text-slate-600">
                              <Smartphone className="h-3 w-3" /> {p.provider}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-slate-600">{p.sender}</td>
                          <td className="px-3 py-3 text-right font-800 text-royal-700">{formatFCFA(p.amount)}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => validatePayment(p.id)}
                                disabled={actionLoading === p.id}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 px-3 py-1.5 text-xs font-700 text-white shadow-cardLg transition hover:brightness-105 active:scale-95 disabled:opacity-60"
                              >
                                {actionLoading === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Valider
                              </button>
                              <button
                                onClick={() => rejectPayment(p.id)}
                                disabled={actionLoading === p.id}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-700 text-red-600 transition hover:bg-red-100 active:scale-95 disabled:opacity-60"
                              >
                                {actionLoading === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Rejeter
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ── Clients list ── */}
            <section className="mb-8">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-royal-700">
                    <Building2 className="h-3 w-3" /> Établissements
                  </div>
                  <h2 className="font-display text-xl font-800 tracking-tight text-ink sm:text-2xl">Liste des clients</h2>
                  <p className="mt-0.5 text-sm text-slate-500">Nom, contact, téléphone, statut et nombre d'élèves.</p>
                </div>
                <div className="relative max-w-xs">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Rechercher…"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-royal-400 focus:ring-4"
                  />
                </div>
              </div>

              {filteredSchools.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-card">
                  Aucune école enregistrée pour le moment.
                </div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="space-y-3 md:hidden">
                    {filteredSchools.map((s) => {
                      const st = statusBadge(s.subscription_status, s.trial_ends_at);
                      const StIcon = st.icon;
                      return (
                        <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-royal-50 text-royal-700">
                                <School className="h-5 w-5" />
                              </span>
                              <div className="min-w-0">
                                <div className="truncate font-display text-base font-800 text-ink">{s.name}</div>
                                <div className="truncate text-xs font-600 text-slate-400">{s.city || '—'}</div>
                              </div>
                            </div>
                            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-700 uppercase tracking-wider ${st.cls}`}>
                              <StIcon className="h-3 w-3" /> {st.label}
                            </span>
                          </div>
                          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span className="truncate">{s.director_name || '—'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span className="truncate">{s.phone || '—'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span>{s.student_count} élève{s.student_count !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                            <span className={`rounded-lg px-2.5 py-1 text-[11px] font-700 ${planBadge(s.plan)}`}>{s.plan}</span>
                            <span className="text-xs font-600 text-slate-500">Inscrit le {formatDate(s.created_at)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card md:block">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] font-700 uppercase tracking-wider text-slate-400">
                          <th className="px-5 py-3">Établissement</th>
                          <th className="px-3 py-3">Directeur</th>
                          <th className="px-3 py-3">Téléphone</th>
                          <th className="px-3 py-3">Élèves</th>
                          <th className="px-3 py-3">Plan</th>
                          <th className="px-3 py-3">Inscrit le</th>
                          <th className="px-5 py-3 text-right">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSchools.map((s) => {
                          const st = statusBadge(s.subscription_status, s.trial_ends_at);
                          const StIcon = st.icon;
                          return (
                            <tr key={s.id} className="border-b border-slate-100 transition hover:bg-slate-50/60">
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2.5">
                                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-royal-50 text-royal-700">
                                    <School className="h-4 w-4" />
                                  </span>
                                  <div>
                                    <div className="font-700 text-ink">{s.name}</div>
                                    <div className="text-xs font-600 text-slate-400">{s.city || '—'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-slate-600">{s.director_name || '—'}</td>
                              <td className="px-3 py-3 text-slate-600">{s.phone || '—'}</td>
                              <td className="px-3 py-3 text-slate-600">{s.student_count}</td>
                              <td className="px-3 py-3">
                                <span className={`rounded-lg px-2.5 py-1 text-[11px] font-700 ${planBadge(s.plan)}`}>{s.plan}</span>
                              </td>
                              <td className="px-3 py-3 text-slate-600">{formatDate(s.created_at)}</td>
                              <td className="px-5 py-3 text-right">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider ${st.cls}`}>
                                  <StIcon className="h-3 w-3" /> {st.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            {/* ── Payment history ── */}
            {resolvedPayments.length > 0 && (
              <section className="mb-8">
                <div className="mb-2 flex items-center gap-2 text-xs font-700 uppercase tracking-wider text-slate-400">
                  <Sparkles className="h-3.5 w-3.5" /> Historique des paiements
                </div>
                <div className="space-y-2">
                  {resolvedPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-card">
                      <div className="flex items-center gap-2.5">
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${p.status === 'valide' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {p.status === 'valide' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-700 text-ink">{p.school_name}</div>
                          <div className="text-[11px] font-600 text-slate-400">{p.provider} · {p.sender}</div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-800 text-slate-700">{formatFCFA(p.amount)}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-700 uppercase tracking-wider ${p.status === 'valide' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {p.status === 'valide' ? 'Validé' : 'Rejeté'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <footer className="mt-10 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
              <p className="font-600 text-slate-500">Gestilys Admin · Console Super-Administrateur</p>
              <p>Données en temps réel — Supabase</p>
            </footer>
          </>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 animate-fadeUp rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-700 text-emerald-700 shadow-cardLg">
          <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4" /> {toast}</span>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, accent,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; accent: 'royal' | 'emerald' | 'gold' | 'red' }) {
  const styles: Record<string, string> = {
    royal: 'from-royal-50 to-royal-100 text-royal-700',
    emerald: 'from-emerald-50 to-emerald-100 text-emerald-600',
    gold: 'from-gold-50 to-gold-100 text-gold-700',
    red: 'from-red-50 to-red-100 text-red-600',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-card sm:p-4">
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${styles[accent]} sm:h-11 sm:w-11`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="text-center sm:text-left">
          <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400 sm:text-[11px]">{label}</div>
          <div className="font-display text-xl font-800 text-ink sm:text-2xl">{value}</div>
        </div>
      </div>
    </div>
  );
}

function PeriodCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-card sm:p-4">
      <Icon className="mx-auto h-5 w-5 text-royal-700" />
      <div className="mt-1.5 font-display text-xl font-800 text-ink sm:text-2xl">{value}</div>
      <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400 sm:text-[11px]">{label}</div>
    </div>
  );
}

function PaymentCardMobile({
  p, onValidate, onReject, loading,
}: {
  p: AdminManualPayment;
  onValidate: (id: string) => void;
  onReject: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gold-200 bg-gradient-to-br from-gold-50/50 to-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-700">
            <Smartphone className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="truncate font-display text-base font-800 text-ink">{p.school_name}</div>
            <div className="truncate text-xs font-600 text-slate-500">{p.provider} · {p.sender}</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-lg font-800 text-royal-700">{formatFCFA(p.amount)}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <button
          onClick={() => onValidate(p.id)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-3 text-sm font-700 text-white shadow-cardLg transition hover:brightness-105 active:scale-95 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} Valider
        </button>
        <button
          onClick={() => onReject(p.id)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-700 text-red-600 transition active:scale-95 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5" />} Rejeter
        </button>
      </div>
    </div>
  );
}
