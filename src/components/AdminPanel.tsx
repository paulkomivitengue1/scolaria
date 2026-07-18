import { useMemo, useState } from 'react';
import {
  ShieldCheck, Building2, CreditCard, Check, X, Search, BadgeCheck,
  Clock, AlertCircle, Smartphone, ArrowLeft, Sparkles, School,
} from 'lucide-react';
import { formatFCFA } from '../types';

/* ---------- Types (modular, ready for Supabase mapping) ---------- */

export interface School {
  id: string;
  name: string;
  city: string;
  plan: 'Essentiel' | 'Premium' | 'Élite';
  status: 'actif' | 'expire';
  expiresAt: string; // ISO date
}

export interface ManualPayment {
  id: string;
  schoolId: string;
  schoolName: string;
  provider: 'Orange Money' | 'Wave' | 'Moov Money';
  sender: string; // phone or transaction id
  amount: number;
  status: 'en_attente' | 'valide' | 'rejete';
  receivedAt: string; // ISO date
}

/* ---------- Seed data (simulated — to be replaced by Supabase) ---------- */

const SEED_SCHOOLS: School[] = [
  { id: 's1', name: 'École La Paix', city: 'Dakar', plan: 'Premium', status: 'actif', expiresAt: '2026-08-15' },
  { id: 's2', name: 'Complexe Scolaire Horizon', city: 'Thiès', plan: 'Élite', status: 'expire', expiresAt: '2026-06-30' },
  { id: 's3', name: 'Institution Les Coccinelles', city: 'Saint-Louis', plan: 'Essentiel', status: 'actif', expiresAt: '2026-09-01' },
  { id: 's4', name: 'Groupe Scolaire Al-Baraka', city: 'Touba', plan: 'Premium', status: 'expire', expiresAt: '2026-07-10' },
  { id: 's5', name: 'École Privée Le Phare', city: 'Mbour', plan: 'Élite', status: 'actif', expiresAt: '2026-10-20' },
];

const SEED_PAYMENTS: ManualPayment[] = [
  { id: 'p1', schoolId: 's2', schoolName: 'Complexe Scolaire Horizon', provider: 'Orange Money', sender: '77 123 45 67', amount: 30000, status: 'en_attente', receivedAt: '2026-07-18T08:42:00Z' },
  { id: 'p2', schoolId: 's4', schoolName: 'Groupe Scolaire Al-Baraka', provider: 'Wave', sender: 'TXN-WV-8842', amount: 30000, status: 'en_attente', receivedAt: '2026-07-18T09:15:00Z' },
  { id: 'p3', schoolId: 's1', schoolName: 'École La Paix', provider: 'Moov Money', sender: '76 987 65 43', amount: 25000, status: 'en_attente', receivedAt: '2026-07-17T17:30:00Z' },
];

/* ---------- Helpers ---------- */

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function planBadge(plan: School['plan']) {
  const styles: Record<School['plan'], string> = {
    Essentiel: 'bg-slate-100 text-slate-600',
    Premium: 'bg-royal-100 text-royal-700',
    Élite: 'bg-gradient-to-r from-gold-500 to-gold-600 text-white',
  };
  return styles[plan];
}

/* ---------- Main component ---------- */

interface Props {
  onExit: () => void;
}

export function AdminPanel({ onExit }: Props) {
  const [schools, setSchools] = useState<School[]>(SEED_SCHOOLS);
  const [payments, setPayments] = useState<ManualPayment[]>(SEED_PAYMENTS);
  const [filter, setFilter] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const validatePayment = (paymentId: string) => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return;
    setPayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, status: 'valide' } : p)));
    setSchools((prev) => prev.map((s) => (s.id === payment.schoolId ? { ...s, status: 'actif' } : s)));
    showToast(`${payment.schoolName} — 30 jours activés`);
  };

  const rejectPayment = (paymentId: string) => {
    setPayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, status: 'rejete' } : p)));
    showToast('Paiement rejeté');
  };

  const filteredSchools = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter((s) => s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q));
  }, [schools, filter]);

  const pendingPayments = payments.filter((p) => p.status === 'en_attente');
  const resolvedPayments = payments.filter((p) => p.status !== 'en_attente');
  const activeCount = schools.filter((s) => s.status === 'actif').length;

  return (
    <div className="min-h-screen bg-canvas bg-grid">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-royal-200 bg-gradient-to-r from-royal-900 via-royal-800 to-royal-900 shadow-cardLg">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-gold-300 backdrop-blur">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-lg font-800 tracking-tight text-white">Panneau Super-Admin</h1>
              <p className="text-[11px] font-600 text-royal-200">Scolaria · Console d'administration</p>
            </div>
          </div>
          <button
            onClick={onExit}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-700 text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" /> Retour à l'app
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Building2} label="Établissements" value={schools.length} accent="royal" />
          <StatCard icon={BadgeCheck} label="Actifs" value={activeCount} accent="emerald" />
          <StatCard icon={Clock} label="Paiements en attente" value={pendingPayments.length} accent="gold" />
          <StatCard icon={AlertCircle} label="Expirés" value={schools.length - activeCount} accent="red" />
        </div>

        {/* Section A: Schools */}
        <section className="mb-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-royal-700">
                <Building2 className="h-3 w-3" /> Établissements
              </div>
              <h2 className="font-display text-xl font-800 tracking-tight text-ink sm:text-2xl">Gestion des Établissements</h2>
              <p className="mt-0.5 text-sm text-slate-500">Liste des écoles clientes et de leur statut d'abonnement.</p>
            </div>
            <div className="relative max-w-xs">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Rechercher une école…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-royal-400 focus:ring-4"
              />
            </div>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {filteredSchools.map((s) => (
              <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-royal-50 text-royal-700">
                      <School className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="font-display text-base font-800 text-ink">{s.name}</div>
                      <div className="text-xs font-600 text-slate-400">{s.city}</div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-700 uppercase tracking-wider ${s.status === 'actif' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {s.status === 'actif' ? <BadgeCheck className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {s.status === 'actif' ? 'Actif' : 'Expiré'}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className={`rounded-lg px-2.5 py-1 text-[11px] font-700 ${planBadge(s.plan)}`}>{s.plan}</span>
                  <span className="text-xs font-600 text-slate-500">Expire le {formatDate(s.expiresAt)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] font-700 uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">Établissement</th>
                  <th className="px-3 py-3">Ville</th>
                  <th className="px-3 py-3">Plan</th>
                  <th className="px-3 py-3">Expire le</th>
                  <th className="px-5 py-3 text-right">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 transition hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-royal-50 text-royal-700">
                          <School className="h-4 w-4" />
                        </span>
                        <span className="font-700 text-ink">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{s.city}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-lg px-2.5 py-1 text-[11px] font-700 ${planBadge(s.plan)}`}>{s.plan}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{formatDate(s.expiresAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider ${s.status === 'actif' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {s.status === 'actif' ? <BadgeCheck className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        {s.status === 'actif' ? 'Actif' : 'Expiré'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section B: Manual payments */}
        <section>
          <div className="mb-4">
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-gold-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-gold-700">
              <CreditCard className="h-3 w-3" /> Paiements
            </div>
            <h2 className="font-display text-xl font-800 tracking-tight text-ink sm:text-2xl">Validation des Paiements Manuels</h2>
            <p className="mt-0.5 text-sm text-slate-500">Notifications Orange Money / Wave / Moov reçues et en attente de validation.</p>
          </div>

          {/* Pending */}
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 px-3 py-1 text-xs font-700 text-gold-700">
              <Clock className="h-3.5 w-3.5" /> En attente ({pendingPayments.length})
            </span>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {pendingPayments.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-card">
                Aucun paiement en attente.
              </div>
            )}
            {pendingPayments.map((p) => (
              <div key={p.id} className="rounded-2xl border border-gold-200 bg-gradient-to-br from-gold-50/50 to-white p-4 shadow-card">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-100 text-gold-700">
                      <Smartphone className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="font-display text-base font-800 text-ink">{p.schoolName}</div>
                      <div className="text-xs font-600 text-slate-500">{p.provider} · {p.sender}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg font-800 text-royal-700">{formatFCFA(p.amount)}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => validatePayment(p.id)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-3 text-sm font-700 text-white shadow-cardLg transition hover:brightness-105 active:scale-95"
                  >
                    <Check className="h-5 w-5" /> Valider 30 jours
                  </button>
                  <button
                    onClick={() => rejectPayment(p.id)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-700 text-red-600 transition active:scale-95"
                  >
                    <X className="h-5 w-5" /> Rejeter
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] font-700 uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">École</th>
                  <th className="px-3 py-3">Fournisseur</th>
                  <th className="px-3 py-3">Émetteur / ID Transaction</th>
                  <th className="px-3 py-3 text-right">Montant</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingPayments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">
                      Aucun paiement en attente.
                    </td>
                  </tr>
                )}
                {pendingPayments.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 transition hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-700 text-ink">{p.schoolName}</td>
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
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 px-3 py-1.5 text-xs font-700 text-white shadow-cardLg transition hover:brightness-105 active:scale-95"
                        >
                          <Check className="h-3.5 w-3.5" /> Valider 30 jours
                        </button>
                        <button
                          onClick={() => rejectPayment(p.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-700 text-red-600 transition hover:bg-red-100 active:scale-95"
                        >
                          <X className="h-3.5 w-3.5" /> Rejeter
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resolved (history) */}
          {resolvedPayments.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 flex items-center gap-2 text-xs font-700 uppercase tracking-wider text-slate-400">
                <Sparkles className="h-3.5 w-3.5" /> Historique récent
              </div>
              <div className="space-y-2">
                {resolvedPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-card">
                    <div className="flex items-center gap-2.5">
                      <span className={`grid h-8 w-8 place-items-center rounded-lg ${p.status === 'valide' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {p.status === 'valide' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </span>
                      <div>
                        <div className="font-700 text-ink">{p.schoolName}</div>
                        <div className="text-[11px] font-600 text-slate-400">{p.provider} · {p.sender}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-800 text-slate-700">{formatFCFA(p.amount)}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-700 uppercase tracking-wider ${p.status === 'valide' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {p.status === 'valide' ? 'Validé' : 'Rejeté'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
          <p className="font-600 text-slate-500">Scolaria Admin · Console Super-Administrateur</p>
          <p>Données simulées — connexion Supabase prévue pour la prochaine itération.</p>
        </footer>
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 animate-fadeUp rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-700 text-emerald-700 shadow-cardLg">
          <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4" /> {toast}</span>
        </div>
      )}
    </div>
  );
}

/* ---------- bits ---------- */

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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${styles[accent]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="text-[11px] font-700 uppercase tracking-wider text-slate-400">{label}</div>
          <div className="font-display text-2xl font-800 text-ink">{value}</div>
        </div>
      </div>
    </div>
  );
}
