import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ShieldCheck, Building2, CreditCard, Check, X, Search, BadgeCheck,
  Clock, AlertCircle, Smartphone, ArrowLeft, Sparkles, School, Lock,
  Loader2, LogOut, Users, Phone, TrendingUp, CalendarDays, CalendarRange,
  Calendar, User, Download, RefreshCw, Filter, Activity, Menu,
} from 'lucide-react';
import { formatFCFA } from '../types';
import {
  adminListSchools, adminListPayments, adminValidatePayment, adminRejectPayment, adminSetSchoolStatus, adminSetSchoolPaidStatus, adminSetSchoolPlan, adminSetTrialDays,
  adminSavePublicPricing, type AdminSchool, type AdminManualPayment,
} from '../lib/admin';
import { loadPublicPlanPrices, DEFAULT_PLAN_PRICES } from '../lib/publicPricing';

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
  if (status === 'suspended') return { label: 'Suspendu', cls: 'bg-red-100 text-red-700', icon: Lock };
  if (status === 'active') return { label: 'Payant', cls: 'bg-emerald-100 text-emerald-700', icon: BadgeCheck };
  if (status === 'trial' && !expired) return { label: 'Essai', cls: 'bg-gold-100 text-gold-700', icon: Clock };
  return { label: 'Expiré', cls: 'bg-red-100 text-red-700', icon: AlertCircle };
}

function buildSchoolWhatsAppUrl(school: AdminSchool): string {
  const digits = (school.phone || '').replace(/\D/g, '');
  const phone = digits.length === 8 ? '223' + digits : digits;
  const firstName = (school.director_name || '').trim();
  const greeting = firstName ? 'Bonjour ' + firstName + ',' : 'Bonjour,';
  const status = school.subscription_status;
  const expired = status !== 'active' && status !== 'suspended' &&
    (status !== 'trial' || new Date(school.trial_ends_at) <= new Date());
  let followUp: string;
  if (status === 'active') {
    followUp = 'Je prends des nouvelles de votre utilisation de Gestilys. Est-ce que tout fonctionne bien pour votre établissement ? Vos retours m’aideront à améliorer le logiciel.';
  } else if (status === 'suspended') {
    followUp = 'Je reste disponible pour échanger avec vous sur votre accès à Gestilys et les prochaines étapes, si vous souhaitez reprendre la discussion.';
  } else if (expired) {
    followUp = 'Votre période d’essai de Gestilys est arrivée à son terme. Souhaitez-vous que nous fassions le point sur vos besoins et les forfaits disponibles, sans engagement ?';
  } else {
    followUp = 'Votre période d’essai de Gestilys est en cours. Avez-vous pu tester les fonctionnalités principales ? Je peux vous aider à découvrir les outils utiles à votre école et recueillir vos suggestions.';
  }
  const message = greeting + ' ' + followUp + ' Cordialement, l’équipe Gestilys.';
  return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);
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
  const [selectedSchool, setSelectedSchool] = useState<AdminSchool | null>(null);
  const [payments, setPayments] = useState<AdminManualPayment[]>([]);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'trial' | 'active' | 'expired' | 'suspended'>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<'dashboard' | 'revenus' | 'tarifs' | 'ecoles' | 'paiements'>('dashboard');
  const [dataLoading, setDataLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState<'Essentiel' | 'Premium' | 'Élite'>('Essentiel');
  const [editPeriod, setEditPeriod] = useState<'mensuel' | 'annuel'>('mensuel');
  const [trialDays, setTrialDays] = useState('14');
  const [priceInputs, setPriceInputs] = useState<Record<'Essentiel'|'Premium'|'Élite', string>>({ Essentiel: '10000', Premium: '20000', 'Élite': '30000' });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const loadData = useCallback(async (c: string) => {
    setDataLoading(true);
    try {
      const [s, p, pricing] = await Promise.all([adminListSchools(c), adminListPayments(c), loadPublicPlanPrices()]);
      setSchools(s);
      setPayments(p);
      setPriceInputs({
        Essentiel: String(pricing.find((plan) => plan.name === 'Essentiel')?.monthly ?? DEFAULT_PLAN_PRICES[0].monthly),
        Premium: String(pricing.find((plan) => plan.name === 'Premium')?.monthly ?? DEFAULT_PLAN_PRICES[1].monthly),
        'Élite': String(pricing.find((plan) => plan.name === 'Élite')?.monthly ?? DEFAULT_PLAN_PRICES[2].monthly),
      });
    } catch (err: any) {
      const message = err?.message || 'Erreur de chargement';
      setAuthError(message);
      setAuthed(false);
      sessionStorage.removeItem(DEV_CODE_STORAGE);
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
      const refreshedSchools = await adminListSchools(code);
      setSchools(refreshedSchools);
      const activated = refreshedSchools.find(s => s.id === payment.school_id);
      showToast(`${payment.school_name} — forfait ${activated?.plan || 'activé'} confirmé`);
    } catch (err: any) {
      showToast(err.message || 'Erreur validation');
    } finally {
      setActionLoading(null);
    }
  };

  const setSchoolStatus = async (schoolId: string, status: 'suspend' | 'restore') => {
    setActionLoading(schoolId);
    try {
      await adminSetSchoolStatus(code, schoolId, status);
      const refreshedSchools = await adminListSchools(code);
      setSchools(refreshedSchools);
      showToast(status === 'suspend' ? 'École suspendue' : 'Accès de l’école rétabli');
    } catch (err: any) {
      showToast(err.message || 'Impossible de modifier le statut de l’école');
    } finally {
      setActionLoading(null);
    }
  };

  const saveSchoolPlan = async (schoolId: string) => {
    setActionLoading(schoolId);
    try {
      await adminSetSchoolPlan(code, schoolId, editPlan, editPeriod);
      const refreshedSchools = await adminListSchools(code);
      setSchools(refreshedSchools);
      setSelectedSchool(refreshedSchools.find(s => s.id === schoolId) || null);
      showToast(`Forfait ${editPlan} enregistré (${editPeriod})`);
    } catch (err: any) { showToast(err.message || 'Impossible de modifier le forfait'); }
    finally { setActionLoading(null); }
  };

  const savePublicPricing = async () => {
    const names = ['Essentiel', 'Premium', 'Élite'] as const;
    const plans = names.map((name) => ({ name, monthly: Number(priceInputs[name]) }));
    if (plans.some((plan) => !Number.isInteger(plan.monthly) || plan.monthly < 1000 || plan.monthly > 1000000)) {
      showToast('Chaque tarif doit être un nombre entier entre 1 000 et 1 000 000 FCFA');
      return;
    }
    setActionLoading('public-pricing');
    try {
      await adminSavePublicPricing(code, plans);
      showToast('Tarifs publics enregistrés. La page des tarifs utilisera ces nouveaux montants.');
    } catch (err: any) {
      showToast(err.message || 'Impossible d’enregistrer les tarifs');
    } finally {
      setActionLoading(null);
    }
  };

  const saveTrialDays = async (schoolId: string) => {
    const days = Number(trialDays);
    if (!Number.isInteger(days) || days < 0 || days > 365) { showToast('Choisis une durée entre 0 et 365 jours'); return; }
    setActionLoading(schoolId);
    try {
      await adminSetTrialDays(code, schoolId, days);
      const refreshedSchools = await adminListSchools(code);
      setSchools(refreshedSchools);
      setSelectedSchool(refreshedSchools.find(s => s.id === schoolId) || null);
      showToast(`Période d’essai réglée à ${days} jour(s)`);
    } catch (err: any) { showToast(err.message || 'Impossible de modifier l’essai'); }
    finally { setActionLoading(null); }
  };

  const setSchoolPaidStatus = async (schoolId: string, paid: boolean, plan?: 'Essentiel' | 'Premium' | 'Élite', period?: 'mensuel' | 'annuel') => {
    setActionLoading(schoolId);
    try {
      await adminSetSchoolPaidStatus(code, schoolId, paid, plan, period);
      const refreshedSchools = await adminListSchools(code);
      setSchools(refreshedSchools);
      setSelectedSchool(current => current?.id === schoolId
        ? refreshedSchools.find(s => s.id === schoolId) || null
        : current);
      showToast(paid ? `Paiement confirmé : forfait ${plan} activé` : 'École marquée impayée');
    } catch (err: any) {
      showToast(err.message || 'Impossible de modifier le statut de paiement');
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
    return schools.filter((s) => {
      const matchesText = !q || [s.name, s.city, s.director_name, s.phone].some(v => (v || '').toLowerCase().includes(q));
      const expired = s.subscription_status !== 'active' && s.subscription_status !== 'suspended' && (s.subscription_status !== 'trial' || new Date(s.trial_ends_at) <= new Date());
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && s.subscription_status === 'active') ||
        (statusFilter === 'trial' && s.subscription_status === 'trial' && new Date(s.trial_ends_at) > new Date()) ||
        (statusFilter === 'expired' && expired) ||
        (statusFilter === 'suspended' && s.subscription_status === 'suspended');
      return matchesText && matchesStatus;
    });
  }, [schools, filter, statusFilter]);

  const exportSchoolsCsv = () => {
    const columns = ['École', 'Ville', 'Directeur', 'Téléphone', 'Plan', 'Statut', 'Élèves', 'Inscription', 'Fin essai'];
    const rows = filteredSchools.map(s => [
      s.name, s.city, s.director_name, s.phone, s.plan, statusBadge(s.subscription_status, s.trial_ends_at).label,
      String(s.student_count), s.created_at, s.trial_ends_at,
    ]);
    const csv = [columns, ...rows].map(row => row.map(value => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gestilys-ecoles.csv';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Export CSV préparé');
  };

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
  const validatedPayments = payments.filter((p) => p.status === 'valide');
  const rejectedPayments = payments.filter((p) => p.status === 'rejete');
  const confirmedManualRevenue = validatedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const revenueBetween = (start: Date, end = now) => validatedPayments
    .filter(p => new Date(p.received_at) >= start && new Date(p.received_at) < end)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const revenueToday = revenueBetween(todayStart);
  const revenueLast7Days = revenueBetween(weekStart);
  const revenueThisMonth = revenueBetween(monthStart);
  const revenuePreviousMonth = revenueBetween(previousMonthStart, monthStart);
  const monthlyRecurringRevenue = schools
    .filter(s => s.subscription_status === 'active')
    .reduce((sum, s) => {
      const monthly = Number(s.subscription_amount) || ({ Essentiel: 10000, Premium: 20000, 'Élite': 30000 } as Record<string, number>)[s.plan] || 0;
      return sum + (s.billing_period === 'annuel' ? monthly / 10 : monthly);
    }, 0);
  const annualRecurringRevenue = monthlyRecurringRevenue * 12;
  const planDistribution = (['Essentiel', 'Premium', 'Élite'] as const).map(plan => ({
    plan,
    count: schools.filter(s => s.subscription_status === 'active' && s.plan === plan).length,
  }));
  // Overview stats (declared before dependent metrics)
  const trialCount = schools.filter((s) => s.subscription_status === 'trial' && new Date(s.trial_ends_at) > new Date()).length;
  const paidCount = schools.filter((s) => s.subscription_status === 'active').length;
  const expiredCount = schools.filter(s => s.subscription_status === 'expired' || (s.subscription_status === 'trial' && new Date(s.trial_ends_at) <= new Date())).length;
  const activeTrialConversion = schools.length ? Math.round((paidCount / schools.length) * 100) : 0;
  const paymentProviderStats = (['Orange Money', 'Wave', 'Moov Money'] as const).map(provider => ({
    provider,
    count: payments.filter(p => p.provider === provider).length,
    confirmed: payments.filter(p => p.provider === provider && p.status === 'valide').reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
  }));

  // Per-period new client stats
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const newToday = schools.filter((s) => new Date(s.created_at) >= todayStart).length;
  const newThisMonth = schools.filter((s) => new Date(s.created_at) >= monthStart).length;
  const newThisYear = schools.filter((s) => new Date(s.created_at) >= yearStart).length;

  return (
    <div className="gestilys-admin min-h-screen bg-canvas bg-grid">
      <style>{`
        .gestilys-admin .ga-module-menu { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; max-width:1400px; margin:0 auto; padding:12px 16px; }
        @media(min-width:768px) { .gestilys-admin .ga-module-menu { grid-template-columns:repeat(5,minmax(0,1fr)); padding:14px 24px; } }
        .gestilys-admin .ga-module-menu button { color:#172554 !important; background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:11px 12px; font-size:13px; font-weight:800; text-align:center; }
        .gestilys-admin .ga-module-menu button[aria-current="page"] { color:#fff !important; background:linear-gradient(115deg,#172554,#1d4ed8); border-color:#f4bd35; box-shadow:0 5px 14px rgba(23,37,84,.16); }
        .gestilys-admin main[data-admin-module="dashboard"] > section:not([data-admin-module="dashboard"]), .gestilys-admin main[data-admin-module="revenus"] > section:not([data-admin-module="revenus"]), .gestilys-admin main[data-admin-module="tarifs"] > section:not([data-admin-module="tarifs"]), .gestilys-admin main[data-admin-module="ecoles"] > section:not([data-admin-module="ecoles"]), .gestilys-admin main[data-admin-module="paiements"] > section:not([data-admin-module="paiements"]) { display:none !important; }
        .gestilys-admin main[data-admin-module="dashboard"] > section[data-admin-module="dashboard"], .gestilys-admin main[data-admin-module="revenus"] > section[data-admin-module="revenus"], .gestilys-admin main[data-admin-module="tarifs"] > section[data-admin-module="tarifs"], .gestilys-admin main[data-admin-module="ecoles"] > section[data-admin-module="ecoles"], .gestilys-admin main[data-admin-module="paiements"] > section[data-admin-module="paiements"] { display:block; }
        .gestilys-admin { --ga-navy:#172554; --ga-blue:#1d4ed8; --ga-gold:#f4bd35; position:relative; isolation:isolate; background:radial-gradient(ellipse at 8% 5%,rgba(59,130,246,.14),transparent 32%),radial-gradient(ellipse at 94% 0%,rgba(244,189,53,.18),transparent 27%),linear-gradient(180deg,#f4f7ff 0%,#fff 55%,#f7f9fd 100%); }
        .gestilys-admin:before { content:""; position:fixed; inset:0; z-index:-1; pointer-events:none; background-image:linear-gradient(rgba(29,78,216,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(29,78,216,.035) 1px,transparent 1px); background-size:34px 34px; mask-image:linear-gradient(to bottom,black,transparent 85%); }
        .gestilys-admin header { border-color:rgba(244,189,53,.35); background:linear-gradient(110deg,#172554 0%,#1e3a8a 62%,#1d4ed8 125%); box-shadow:0 12px 34px rgba(23,37,84,.16); }
        .gestilys-admin main section > .rounded-3xl, .gestilys-admin main section > .rounded-2xl, .gestilys-admin main .shadow-card, .gestilys-admin main .shadow-cardLg { transition:box-shadow .2s,border-color .2s,transform .2s; }
        .gestilys-admin main .shadow-card:hover { box-shadow:0 14px 34px rgba(23,37,84,.09); }
        .gestilys-admin main .border-slate-200.bg-white { border-color:#e0e8f5; box-shadow:0 12px 32px rgba(23,37,84,.055); }
        .gestilys-admin main .bg-gradient-to-r.from-royal-950 { background:linear-gradient(115deg,#172554 0%,#1e3a8a 72%,#1d4ed8 130%); }
        .gestilys-admin main button:not([class*='text-white']):not([class*='text-emerald']):not([class*='text-red-']):not([class*='text-blue-']):not([class*='text-royal-']) { color:#172554; }
        .gestilys-admin main button.bg-white, .gestilys-admin main button.bg-white\/10 { color:#172554 !important; }
        .gestilys-admin main button.bg-white\/10 { color:#fff !important; }
        .gestilys-admin main button.bg-gradient-to-r.from-royal-800, .gestilys-admin main button.bg-gradient-to-br.from-gold-500 { color:#fff !important; }
        .gestilys-admin main button.border-white\/20.bg-white\/10 { background:#1e40af; border-color:#93c5fd; color:#fff !important; }
        .gestilys-admin main .text-slate-400 { color:#475569 !important; }
        .gestilys-admin main .text-slate-300 { color:#334155 !important; }
        .gestilys-admin main .text-slate-500 { color:#475569 !important; }
        .gestilys-admin main .text-slate-600 { color:#334155 !important; }
        .gestilys-admin main .bg-slate-50 { background:#f1f5f9; }
        .gestilys-admin main button:focus-visible,.gestilys-admin main input:focus-visible,.gestilys-admin main select:focus-visible { outline:3px solid rgba(147,197,253,.9); outline-offset:2px; }
        .gestilys-admin main button { transition:filter .18s,transform .18s,box-shadow .18s; }
        .gestilys-admin main button:hover:not(:disabled) { filter:brightness(1.025); }
        .gestilys-admin main button:active:not(:disabled) { transform:translateY(1px); }
        @media (prefers-reduced-motion:reduce) { .gestilys-admin main section > *, .gestilys-admin main button { transition:none !important; } }
      `}</style>
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
            <button onClick={() => setAdminMenuOpen(v => !v)} aria-label="Ouvrir les rubriques administrateur" aria-expanded={adminMenuOpen} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white"><Menu className="h-5 w-5" /></button>
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

      {adminMenuOpen && authed && <nav aria-label="Modules administrateur" className="sticky top-[65px] z-20 border-b border-blue-100 bg-white/95 shadow-lg backdrop-blur"><div className="ga-module-menu">{[["dashboard","Vue d’ensemble"],["revenus","Revenus"],["tarifs","Tarifs"],["ecoles","Écoles"],["paiements","Paiements"]].map(([module,label])=><button key={module} type="button" aria-current={activeModule===module ? "page" : undefined} onClick={()=>{setActiveModule(module as typeof activeModule);setAdminMenuOpen(false);window.scrollTo({top:0,behavior:"smooth"});}}>{label}</button>)}</div></nav>}
      <main data-admin-module={activeModule} className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        {dataLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-royal-700" />
          </div>
        ) : (
          <>
            <section id="admin-dashboard" data-admin-module="dashboard" className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-cardLg">
              <div className="flex flex-col gap-4 bg-gradient-to-r from-royal-950 via-royal-900 to-royal-800 p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-700 uppercase tracking-[0.18em] text-royal-200"><Activity className="h-4 w-4" /> Centre de contrôle</div>
                  <h2 className="mt-1 font-display text-xl font-800 sm:text-2xl">Pilotage de Gestilys</h2>
                  <p className="mt-1 text-sm text-royal-100">Vue opérationnelle des écoles, abonnements et paiements.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => loadData(code)} disabled={dataLoading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gold-500 bg-gold-400 px-3.5 py-2.5 text-sm font-800 text-royal-950 shadow-card transition hover:bg-gold-300 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${dataLoading ? 'animate-spin' : ''}`} /> Actualiser</button>
                  <button onClick={exportSchoolsCsv} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-sm font-800 text-royal-900 transition hover:bg-royal-50"><Download className="h-4 w-4" /> Exporter CSV</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-4">
                {[
                  { label: 'Écoles suivies', value: schools.length, detail: 'Comptes enregistrés' },
                  { label: 'Paiements à traiter', value: pendingPayments.length, detail: 'Validation manuelle', alert: pendingPayments.length > 0 },
                  { label: 'Paiements validés', value: payments.filter(p => p.status === 'valide').length, detail: 'Historique disponible' },
                  { label: 'Élèves recensés', value: schools.reduce((sum, s) => sum + (s.student_count || 0), 0).toLocaleString('fr-FR'), detail: 'Total communiqué par les écoles' },
                ].map((item) => <div key={item.label} className="bg-white p-4 sm:p-5">
                  <div className="text-xs font-700 text-slate-500">{item.label}</div>
                  <div className={`mt-1 font-display text-2xl font-800 ${item.alert ? 'text-amber-600' : 'text-ink'}`}>{item.value}</div>
                  <div className="mt-1 text-[11px] text-slate-400">{item.detail}</div>
                </div>)}
              </div>
            </section>

            {/* ── Payment and revenue reporting ── */}
            <section id="admin-revenus" data-admin-module="revenus" className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
              <div className="mb-4">
                <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-emerald-700">
                  <CreditCard className="h-3 w-3" /> Suivi financier
                </div>
                <h2 className="font-display text-lg font-800 tracking-tight text-ink sm:text-xl">Paiements et recettes confirmées</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Calcul basé uniquement sur les paiements manuels enregistrés dans Gestilys. Ce montant n’inclut pas d’éventuels paiements reçus hors de cet historique.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-700 text-emerald-800">Recettes confirmées</p>
                  <p className="mt-1 text-xl font-800 text-emerald-900">{formatFCFA(confirmedManualRevenue)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-700 text-slate-600">Paiements reçus</p>
                  <p className="mt-1 text-xl font-800 text-ink">{payments.length}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{validatedPayments.length} validés · {pendingPayments.length} en attente · {rejectedPayments.length} rejetés</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-700 text-slate-600">Montant en attente</p>
                  <p className="mt-1 text-xl font-800 text-amber-700">{formatFCFA(pendingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0))}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-700 text-slate-600">Montants rejetés</p>
                  <p className="mt-1 text-xl font-800 text-slate-700">{formatFCFA(rejectedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0))}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {paymentProviderStats.map(item => (
                  <div key={item.provider} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-3">
                    <div>
                      <p className="text-sm font-700 text-slate-800">{item.provider}</p>
                      <p className="text-xs text-slate-500">{item.count} paiement{item.count === 1 ? '' : 's'} enregistr{item.count === 1 ? 'é' : 'és'}</p>
                    </div>
                    <p className="text-sm font-800 text-royal-700">{formatFCFA(item.confirmed)}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Business metrics: MRR / ARR / sales ── */}
            <section data-admin-module="revenus" className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
              <div className="mb-4">
                <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-indigo-700"><TrendingUp className="h-3 w-3" /> Indicateurs business</div>
                <h2 className="font-display text-lg font-800 tracking-tight text-ink sm:text-xl">Revenus récurrents et activité commerciale</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">MRR/ARR estimés à partir des abonnements marqués actifs. Les recettes encaissées proviennent uniquement de l’historique des paiements validés : ce sont deux indicateurs différents.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"><p className="text-xs font-700 text-indigo-800">MRR estimé</p><p className="mt-1 text-xl font-800 text-indigo-950">{formatFCFA(Math.round(monthlyRecurringRevenue))}</p><p className="mt-1 text-[11px] text-indigo-700">Revenu mensuel récurrent</p></div>
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"><p className="text-xs font-700 text-indigo-800">ARR estimé</p><p className="mt-1 text-xl font-800 text-indigo-950">{formatFCFA(Math.round(annualRecurringRevenue))}</p><p className="mt-1 text-[11px] text-indigo-700">MRR × 12</p></div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-700 text-emerald-800">Part des écoles payantes</p><p className="mt-1 text-xl font-800 text-emerald-950">{activeTrialConversion}%</p><p className="mt-1 text-[11px] text-emerald-700">{paidCount} école(s) payante(s) sur {schools.length}</p></div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-700 text-slate-700">Panier moyen validé</p><p className="mt-1 text-xl font-800 text-ink">{formatFCFA(validatedPayments.length ? Math.round(confirmedManualRevenue / validatedPayments.length) : 0)}</p><p className="mt-1 text-[11px] text-slate-500">Par paiement, historique chargé</p></div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-700 text-slate-500">Aujourd’hui</p><p className="mt-1 text-base font-800 text-ink">{formatFCFA(revenueToday)}</p></div>
                <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-700 text-slate-500">7 derniers jours</p><p className="mt-1 text-base font-800 text-ink">{formatFCFA(revenueLast7Days)}</p></div>
                <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-700 text-slate-500">Mois en cours</p><p className="mt-1 text-base font-800 text-ink">{formatFCFA(revenueThisMonth)}</p></div>
                <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-700 text-slate-500">Mois précédent</p><p className="mt-1 text-base font-800 text-ink">{formatFCFA(revenuePreviousMonth)}</p></div>
              </div>
              <div className="mt-4">
                <p className="mb-2 text-xs font-800 uppercase tracking-wide text-slate-500">Répartition des abonnements actifs</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {planDistribution.map(item => <div key={item.plan} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-3"><span className="text-sm font-700 text-slate-700">{item.plan}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-800 text-slate-700">{item.count} école(s)</span></div>)}
                </div>
              </div>
            </section>

            {/* ── Overview: total + status breakdown ── */}
            <section data-admin-module="dashboard" className="mb-6">
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
            <section data-admin-module="dashboard" className="mb-6">
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
              <section id="admin-paiements" data-admin-module="paiements" className="mb-6">
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

            {/* ── Public pricing controls ── */}
            <section id="admin-tarifs" data-admin-module="tarifs" className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-gold-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-gold-700">
                    <CreditCard className="h-3 w-3" /> Offres publiques
                  </div>
                  <h2 className="font-display text-xl font-800 tracking-tight text-ink">Modifier les tarifs de Gestilys</h2>
                  <p className="mt-1 max-w-2xl text-sm text-slate-500">Modifie les prix mensuels ici. Le prix annuel reste calculé automatiquement sur 10 mensualités, pour 12 mois d’accès.</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-700 text-blue-700"><ShieldCheck className="h-3.5 w-3.5" /> Aperçu avant publication à venir</span>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(['Essentiel', 'Premium', 'Élite'] as const).map((plan) => (
                  <label key={plan} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="block text-sm font-800 text-royal-900">{plan}</span>
                    <span className="mt-2 flex items-center gap-2">
                      <input type="number" min="1000" max="1000000" step="500" inputMode="numeric" value={priceInputs[plan]} onChange={(e) => setPriceInputs((prev) => ({ ...prev, [plan]: e.target.value }))} className="h-11 min-w-0 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-700 text-ink" aria-label={`Prix mensuel ${plan} en FCFA`} />
                      <span className="text-xs font-700 text-slate-500">FCFA/mois</span>
                    </span>
                    <span className="mt-2 block text-xs text-slate-500">Annuel : {Number(priceInputs[plan] || 0) * 10 > 0 ? (Number(priceInputs[plan]) * 10).toLocaleString('fr-FR') : '—'} FCFA</span>
                  </label>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-500">Les nouveaux tarifs s’affichent sur la page publique après actualisation. Les abonnements déjà payés ne sont pas modifiés par ce réglage.</p>
                <button type="button" onClick={() => void savePublicPricing()} disabled={actionLoading === 'public-pricing'} style={{ background: "linear-gradient(115deg, #172554 0%, #1d4ed8 100%)", color: "#ffffff" }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-800 px-4 py-2 text-sm font-800 text-white shadow-card disabled:opacity-60">
                  {actionLoading === 'public-pricing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Enregistrer les tarifs
                </button>
              </div>
            </section>

            {/* ── Clients list ── */}
            <section id="admin-ecoles" data-admin-module="ecoles" className="mb-8">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-royal-700">
                    <Building2 className="h-3 w-3" /> Établissements
                  </div>
                  <h2 className="font-display text-xl font-800 tracking-tight text-ink sm:text-2xl">Liste des clients</h2>
                  <p className="mt-0.5 text-sm text-slate-500">Nom, contact, téléphone, statut et nombre d'élèves.</p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <div className="relative min-w-0 sm:w-64">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="École, ville, directeur, téléphone…" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-royal-400 focus:ring-2 focus:ring-royal-100" />
                  </div>
                  <div className="relative">
                    <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm font-600 text-slate-700 outline-none focus:border-royal-400 sm:w-44">
                      <option value="all">Tous les statuts</option><option value="active">Abonnés payants</option><option value="trial">En essai</option><option value="expired">Expirés</option><option value="suspended">Suspendus</option>
                    </select>
                  </div>
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
                          <button type="button" onClick={() => { setSelectedSchool(s); setEditPlan(s.plan || 'Essentiel'); setEditPeriod(s.billing_period || 'mensuel'); setTrialDays('14'); }} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-royal-200 bg-royal-50 px-3 py-2 text-sm font-700 text-royal-800">Voir la fiche complète</button>
                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                            <span className={`rounded-lg px-2.5 py-1 text-[11px] font-700 ${planBadge(s.plan)}`}>{s.plan}</span>
                            <span className="text-xs font-600 text-slate-500">Inscrit le {formatDate(s.created_at)}</span>
                          </div>
                          {s.subscription_status !== 'suspended' && <button type="button" onClick={() => s.subscription_status==='active' ? void setSchoolPaidStatus(s.id, false) : (setSelectedSchool(s), setEditPlan(s.plan || 'Essentiel'), setEditPeriod(s.billing_period || 'mensuel'), setTrialDays('14'))} disabled={actionLoading===s.id} className={`mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-700 ${s.subscription_status==='active'?'border-amber-200 bg-amber-50 text-amber-800':'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{s.subscription_status==='active'?'Marquer comme impayée':'Choisir forfait et confirmer'}</button>}
                          <button
                            type="button"
                            onClick={() => setSchoolStatus(s.id, s.subscription_status === 'suspended' ? 'restore' : 'suspend')}
                            disabled={actionLoading === s.id}
                            className={`mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-700 disabled:opacity-50 ${s.subscription_status === 'suspended' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}
                          >
                            {actionLoading === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : s.subscription_status === 'suspended' ? <RefreshCw className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            {s.subscription_status === 'suspended' ? 'Rétablir l’accès' : 'Suspendre l’école'}
                          </button>
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
                                <div className="flex flex-col items-end gap-2">
                                  <button type="button" onClick={() => { setSelectedSchool(s); setEditPlan(s.plan || 'Essentiel'); setEditPeriod(s.billing_period || 'mensuel'); setTrialDays('14'); }} className="inline-flex items-center gap-1 rounded-lg border border-royal-200 bg-royal-50 px-2.5 py-1.5 text-xs font-700 text-royal-800">Voir la fiche</button>
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider ${st.cls}`}>
                                    <StIcon className="h-3 w-3" /> {st.label}
                                  </span>
                                  {s.subscription_status !== 'suspended' && <button type="button" onClick={() => s.subscription_status==='active' ? void setSchoolPaidStatus(s.id, false) : (setSelectedSchool(s), setEditPlan(s.plan || 'Essentiel'), setEditPeriod(s.billing_period || 'mensuel'), setTrialDays('14'))} disabled={actionLoading===s.id} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-700 ${s.subscription_status==='active'?'border-amber-200 bg-amber-50 text-amber-800':'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{s.subscription_status==='active'?'Marquer impayée':'Choisir forfait'}</button>}
                                  <button
                                    type="button"
                                    onClick={() => setSchoolStatus(s.id, s.subscription_status === 'suspended' ? 'restore' : 'suspend')}
                                    disabled={actionLoading === s.id}
                                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-700 disabled:opacity-50 ${s.subscription_status === 'suspended' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}
                                  >
                                    {actionLoading === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : s.subscription_status === 'suspended' ? <RefreshCw className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                                    {s.subscription_status === 'suspended' ? 'Rétablir' : 'Suspendre'}
                                  </button>
                                </div>
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
              <section data-admin-module="paiements" className="mb-8">
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

      {selectedSchool && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3" role="dialog" aria-modal="true" aria-label="Fiche école">
          <div className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div><p className="text-xs font-800 uppercase tracking-wider text-royal-700">Fiche établissement</p><h2 className="mt-1 text-xl font-800 text-ink">{selectedSchool.name}</h2><p className="text-sm text-slate-500">{selectedSchool.city || 'Ville non renseignée'}</p></div>
              <button type="button" onClick={() => setSelectedSchool(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Fermer la fiche"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Directeur / directrice</p><p className="mt-1 font-700 text-ink">{selectedSchool.director_name || 'Non renseigné'}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Téléphone</p><p className="mt-1 font-700 text-ink">{selectedSchool.phone || 'Non renseigné'}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Nombre d’élèves</p><p className="mt-1 text-xl font-800 text-ink">{selectedSchool.student_count}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Abonnement</p><p className="mt-1 font-700 text-ink">{selectedSchool.plan} · {statusBadge(selectedSchool.subscription_status, selectedSchool.trial_ends_at).label}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Inscription</p><p className="mt-1 font-700 text-ink">{formatDate(selectedSchool.created_at)}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Fin de l’essai</p><p className="mt-1 font-700 text-ink">{formatDate(selectedSchool.trial_ends_at)}</p></div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 p-4">
              <h3 className="font-800 text-ink">Gestion du forfait</h3>
              <p className="mt-1 text-xs text-slate-500">Choisis le forfait réellement accordé après vérification du paiement. Ce réglage n’encaisse pas d’argent.</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-xs font-700 text-slate-600">Forfait
                  <select value={editPlan} onChange={e => setEditPlan(e.target.value as typeof editPlan)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
                    <option value="Essentiel">Essentiel — 10 000 FCFA/mois</option><option value="Premium">Premium — 20 000 FCFA/mois</option><option value="Élite">Élite — 30 000 FCFA/mois</option>
                  </select>
                </label>
                <label className="text-xs font-700 text-slate-600">Période
                  <select value={editPeriod} onChange={e => setEditPeriod(e.target.value as typeof editPeriod)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
                    <option value="mensuel">Mensuel</option><option value="annuel">Annuel (10 mois payés)</option>
                  </select>
                </label>
              </div>
              <button type="button" onClick={() => void saveSchoolPlan(selectedSchool.id)} disabled={actionLoading === selectedSchool.id} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-royal-700 px-4 py-2 text-sm font-800 text-white disabled:opacity-50">{actionLoading === selectedSchool.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Enregistrer le forfait</button>
            </div>
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="font-800 text-amber-900">Prolonger ou terminer l’essai</h3>
              <p className="mt-1 text-xs text-amber-800">0 jour termine l’essai; 14 jours donne deux semaines supplémentaires à partir d’aujourd’hui.</p>
              <div className="mt-3 flex gap-2">
                <input aria-label="Durée d’essai en jours" type="number" min="0" max="365" value={trialDays} onChange={e => setTrialDays(e.target.value)} className="h-11 min-w-0 flex-1 rounded-lg border border-amber-200 bg-white px-3 text-sm" />
                <button type="button" onClick={() => void saveTrialDays(selectedSchool.id)} disabled={actionLoading === selectedSchool.id} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-300 bg-white px-3 text-sm font-800 text-amber-900 disabled:opacity-50">Appliquer</button>
              </div>
            </div>
            {selectedSchool.subscription_status !== 'active' && <button type="button" onClick={() => void setSchoolPaidStatus(selectedSchool.id, true, editPlan, editPeriod)} disabled={actionLoading === selectedSchool.id} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-800 text-white disabled:opacity-50">{actionLoading === selectedSchool.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />} Confirmer l’argent reçu et activer ce forfait</button>}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {selectedSchool.phone && <a href={buildSchoolWhatsAppUrl(selectedSchool)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-800 text-white"><Phone className="h-4 w-4" /> Relancer sur WhatsApp</a>}
              <button type="button" onClick={() => { const s=selectedSchool; setSelectedSchool(null); void setSchoolStatus(s.id, s.subscription_status === 'suspended' ? 'restore' : 'suspend'); }} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-800 text-red-700">{selectedSchool.subscription_status === 'suspended' ? 'Rétablir l’accès' : 'Suspendre l’école'}</button>
            </div>
          </div>
        </div>
      )}
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
