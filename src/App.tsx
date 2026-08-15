import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpenText, Sparkles, Filter, UserPlus, Settings2, LayoutGrid,
  LogOut, Boxes, CheckCircle2, Lock, AlertTriangle,
} from 'lucide-react';
import { useAuth } from './lib/auth';
import {
  loadStudents, addStudentDB, recordPayment,
  loadUniformStock, loadBookStock, syncUniformStock, syncBookStock,
  loadPricing, savePricing, updateSchoolName, yearEndStockReset,
} from './lib/db';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { Header } from './components/Header';
import { FinancialHud } from './components/FinancialHud';
import { CahierGrid } from './components/CahierGrid';
import { PaymentModal } from './components/PaymentModal';
import { WhatsAppReceipt } from './components/WhatsAppReceipt';
import { AddStudentModal } from './components/AddStudentModal';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { StocksView } from './components/StocksView';
import { AdminPanel } from './components/AdminPanel';
import { DEFAULT_PRICING } from './data';
import type { Student, MonthKey, ServiceType, PricingConfig, UniformStockItem, BookStockItem } from './types';
import { studentExpected, studentCollected } from './types';

type View = 'cahier' | 'stocks' | 'parametres';

export default function App() {
  const { user, profile, loading, isTrialExpired, signOut, refreshProfile } = useAuth();

  // Admin panel — accessible only via /scolaria-admin hash URL, never via a visible button
  const [isAdminPanel, setIsAdminPanel] = useState(() =>
    typeof window !== 'undefined' && window.location.hash.replace('#', '') === '/scolaria-admin'
  );

  const [students, setStudents] = useState<Student[]>([]);
  const [uniforms, setUniforms] = useState<UniformStockItem[]>([]);
  const [books, setBooks] = useState<BookStockItem[]>([]);
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [dataLoading, setDataLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>('cahier');
  const [activeService, setActiveService] = useState<ServiceType>('scolarite');
  const [payOpen, setPayOpen] = useState(false);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [activeMonth, setActiveMonth] = useState<MonthKey | null>(null);
  const [activeSvcModal, setActiveSvcModal] = useState<ServiceType | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptStudentId, setReceiptStudentId] = useState<string | null>(null);
  const [receiptService, setReceiptService] = useState<ServiceType | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [stockSales, setStockSales] = useState<number>(0);
  const [stockToast, setStockToast] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  // ── Load all school data when user logs in ────────────
  const loadAllData = useCallback(async (schoolId: string) => {
    setDataLoading(true);
    try {
      const [stus, unis, bks, prc] = await Promise.all([
        loadStudents(schoolId),
        loadUniformStock(schoolId),
        loadBookStock(schoolId),
        loadPricing(schoolId),
      ]);
      setStudents(stus);
      setUniforms(unis);
      setBooks(bks);
      setPricing(prc);
    } catch (err) {
      console.error('Failed to load school data:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && profile?.schoolId) {
      loadAllData(profile.schoolId);
    } else if (!user) {
      setStudents([]);
      setUniforms([]);
      setBooks([]);
      setDataLoading(false);
    }
  }, [user, profile?.schoolId, loadAllData]);

  // ── Hash route for admin panel ────────────────────────
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash.replace('#', '') === '/scolaria-admin') setIsAdminPanel(true);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // ── Compute financial summary ─────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.className.toLowerCase().includes(q) ||
      s.parentName.toLowerCase().includes(q)
    );
  }, [students, query]);

  const { totalCollected, outstanding, recoveryRate } = useMemo(() => {
    const total = students.reduce((s, st) => s + studentExpected(st), 0);
    const coll = students.reduce((s, st) => s + studentCollected(st), 0) + stockSales;
    return {
      totalCollected: coll,
      outstanding: Math.max(0, total - coll),
      recoveryRate: total > 0 ? Math.round(coll / total * 100) : 0,
    };
  }, [students, stockSales]);

  const activeStudent = students.find(s => s.id === activeStudentId) ?? null;
  const receiptStudent = students.find(s => s.id === receiptStudentId) ?? null;

  // ── Handlers ──────────────────────────────────────────
  const openCell = (id: string, m: MonthKey, svc: ServiceType) => {
    setActiveStudentId(id); setActiveMonth(m); setActiveSvcModal(svc); setPayOpen(true);
  };

  const validatePayment = async (id: string, svc: ServiceType, m: MonthKey, amt: number) => {
    if (!profile?.schoolId) return;
    try {
      setPayError(null);
      await recordPayment(profile.schoolId, id, svc, m, amt);
      // Optimistically update the local state
      setStudents(prev => prev.map(s => s.id === id ? {
        ...s,
        services: s.services.map(x => x.type === svc ? {
          ...x,
          payments: { ...x.payments, [m]: { paid: x.payments[m].paid + amt } }
        } : x)
      } : s));
    } catch (err: any) {
      setPayError(err.message || 'Erreur lors de l\'enregistrement du paiement.');
    }
  };

  const openReceipt = (s: Student, svc: ServiceType) => {
    setReceiptStudentId(s.id); setReceiptService(svc); setReceiptOpen(true);
  };

  const addStudent = async (st: Student) => {
    if (!profile?.schoolId) return;
    try {
      const dbId = await addStudentDB(profile.schoolId, st);
      setStudents(p => [{ ...st, id: dbId }, ...p]);
      setAddOpen(false);
    } catch (err: any) {
      console.error('Failed to add student:', err);
    }
  };

  const handleLogout = async () => { await signOut(); };

  const handleSchoolNameChange = async (name: string) => {
    if (!profile?.schoolId) return;
    try {
      await updateSchoolName(profile.schoolId, name);
      await refreshProfile();
    } catch (err) {
      console.error('Failed to update school name:', err);
    }
  };

  // ── Stock handlers with DB sync ───────────────────────
  const handleUniformsChange = useCallback((next: UniformStockItem[]) => {
    setUniforms(next);
    if (profile?.schoolId) {
      syncUniformStock(profile.schoolId, uniforms, next).then(synced => {
        setUniforms(synced);
      }).catch(err => console.error('Uniform sync failed:', err));
    }
  }, [profile?.schoolId, uniforms]);

  const handleBooksChange = useCallback((next: BookStockItem[]) => {
    setBooks(next);
    if (profile?.schoolId) {
      syncBookStock(profile.schoolId, books, next).then(synced => {
        setBooks(synced);
      }).catch(err => console.error('Book sync failed:', err));
    }
  }, [profile?.schoolId, books]);

  const handleUniformSell = (item: UniformStockItem) => {
    setStockSales(v => v + item.price);
    setStockToast(`+${item.price.toLocaleString('fr-FR')} FCFA — Tenue ${item.size} ajoutée à la caisse`);
    setTimeout(() => setStockToast(null), 3000);
  };

  const handlePricingSave = async (newPricing: PricingConfig) => {
    setPricing(newPricing);
    if (!profile?.schoolId) return;
    try { await savePricing(profile.schoolId, newPricing); }
    catch (err) { console.error('Failed to save pricing:', err); }
  };

  const handleYearEnd = async () => {
    if (!profile?.schoolId) return;
    try {
      await yearEndStockReset(profile.schoolId, uniforms, books);
      // Refresh stock from DB
      const [unis, bks] = await Promise.all([
        loadUniformStock(profile.schoolId),
        loadBookStock(profile.schoolId),
      ]);
      setUniforms(unis);
      setBooks(bks);
      setStockSales(0);
    } catch (err) { console.error('Year-end reset failed:', err); }
  };

  // ── Render ────────────────────────────────────────────

  // Admin panel — checked BEFORE auth/loading so it's accessible even when not logged in.
  // The AdminPanel component has its own developer-code login screen.
  if (isAdminPanel) {
    return <AdminPanel onExit={() => {
      if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
      setIsAdminPanel(false);
    }} />;
  }

  // Loading spinner while auth state resolves
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-royal-700 animate-spin" />
      </div>
    );
  }

  // Not logged in → landing or auth
  if (!user || !profile) {
    return <LandingOrAuth onEnterAuth={() => {}} />;
  }

  // Trial expired → soft-block screen
  if (isTrialExpired) {
    return <TrialExpired schoolName={profile.schoolName} onLogout={handleLogout} />;
  }

  // Main dashboard
  return (
    <div className="min-h-screen bg-canvas bg-grid">
      <Header query={query} onQuery={setQuery} resultCount={filtered.length} onLogout={handleLogout} />
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {dataLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-royal-700 animate-spin" />
          </div>
        )}

        {!dataLoading && (
          <>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                <button onClick={() => setView('cahier')} className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-700 transition ${view === 'cahier' ? 'bg-royal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}><LayoutGrid className="h-4 w-4" />Cahier</button>
                <button onClick={() => setView('stocks')} className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-700 transition ${view === 'stocks' ? 'bg-royal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}><Boxes className="h-4 w-4" />Stocks</button>
                <button onClick={() => setView('parametres')} className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-700 transition ${view === 'parametres' ? 'bg-royal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}><Settings2 className="h-4 w-4" />Paramètres</button>
              </div>
              <button onClick={handleLogout} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-600 text-slate-600 transition hover:bg-slate-50 active:scale-95"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Déconnexion</span></button>
            </div>

            {view === 'cahier' && (<>
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-royal-700"><Sparkles className="h-3 w-3" />Tableau de bord</div>
                  <h1 className="font-display text-2xl font-700 tracking-tight text-ink sm:text-3xl">Le Cahier de Caisse</h1>
                  <p className="mt-1 text-sm text-slate-500">Suivez et encaissez les frais de scolarité, cantine & transport.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex"><Filter className="h-4 w-4" /><span>{students.length} élève{students.length !== 1 ? 's' : ''} · 2025 — 2026</span></div>
                  <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 px-4 py-2.5 text-sm font-700 text-white shadow-gold transition hover:brightness-105 active:scale-95"><UserPlus className="h-4.5 w-4.5" />Ajouter un élève</button>
                </div>
              </div>
              <FinancialHud totalCollected={totalCollected} outstanding={outstanding} recoveryRate={recoveryRate} />
              {payError && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{payError}</span>
                </div>
              )}
              <div className="mt-6">
                <div className="mb-3 flex items-center gap-2"><BookOpenText className="h-5 w-5 text-royal-700" /><h2 className="font-display text-lg font-700 text-ink">Cahier Interactif</h2>{students.length > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-600 text-slate-500">{filtered.length} élève{filtered.length !== 1 ? 's' : ''}</span>}</div>
                <CahierGrid students={filtered} activeService={activeService} onServiceChange={setActiveService} onCellClick={openCell} onWhatsApp={openReceipt} onAddClick={() => setAddOpen(true)} />
              </div>
            </>)}

            {view === 'stocks' && <StocksView uniforms={uniforms} books={books} onUniformsChange={handleUniformsChange} onBooksChange={handleBooksChange} onUniformSell={handleUniformSell} />}

            {view === 'parametres' && <ConfigurationPanel pricing={pricing} onSave={handlePricingSave} onReset={() => setPricing(DEFAULT_PRICING)} schoolName={profile.schoolName} onSchoolNameChange={handleSchoolNameChange} uniforms={uniforms} books={books} onYearEnd={handleYearEnd} />}
          </>
        )}

        {stockToast && (
          <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 animate-fadeUp rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-700 text-emerald-700 shadow-cardLg">
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {stockToast}</span>
          </div>
        )}

        <footer className="mt-10 flex flex-col items-center gap-1 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
          <p className="font-600 text-slate-500">Gestilys — La référence premium de la gestion scolaire</p>
          <p>Afrique de l'Ouest · Conçu pour les intendances exigeantes</p>
        </footer>
      </main>

      <PaymentModal student={activeStudent} month={activeMonth} service={activeSvcModal} open={payOpen} onClose={() => setPayOpen(false)} onValidate={validatePayment} />
      <WhatsAppReceipt student={receiptStudent} open={receiptOpen} onClose={() => setReceiptOpen(false)} schoolName={profile?.schoolName || ''} initialService={receiptService} initialMonth={activeMonth} />
      <AddStudentModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={addStudent} pricing={pricing} />
    </div>
  );
}

/* ── Landing / Auth router ─────────────────────────────── */

function LandingOrAuth(_: { onEnterAuth: () => void }) {
  const [showAuth, setShowAuth] = useState(false);
  if (showAuth) return <AuthPage onBack={() => setShowAuth(false)} />;
  return <LandingPage onEnter={() => setShowAuth(true)} />;
}

/* ── Trial expired soft-block ──────────────────────────── */

function TrialExpired({ schoolName, onLogout }: { schoolName: string; onLogout: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-royal-900 to-royal-800 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gold-500/20 text-gold-300 shadow-lg">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-800 text-white">Essai expiré</h1>
        <p className="mt-2 text-sm leading-relaxed text-royal-100">
          La période d'essai gratuite de 14 jours pour <strong className="text-white">{schoolName}</strong> est terminée.
          Vos données sont conservées en sécurité. Pour continuer à utiliser Gestilys, veuillez souscrire à un abonnement.
        </p>
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-sm">
          <h2 className="font-display text-base font-700 text-white">Reprenez où vous vous êtes arrêté</h2>
          <ul className="mt-3 space-y-2 text-sm text-royal-100">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-gold-300" /> Vos élèves et paiements sont conservés</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-gold-300" /> Vos stocks et tarifs sont intacts</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-gold-300" /> Aucune donnée ne sera supprimée</li>
          </ul>
        </div>
        <button onClick={onLogout} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-700 text-white transition hover:bg-white/10 active:scale-95">
          <LogOut className="h-4 w-4" /> Se déconnecter
        </button>
      </div>
    </div>
  );
}
