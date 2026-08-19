import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpenText, Sparkles, Filter, UserPlus,
  LogOut, CheckCircle2, Lock, AlertTriangle,
  Search,
} from 'lucide-react';
import { useAuth } from './lib/auth';
import {
  loadStudents, addStudentDB, recordPayment,
  loadUniformStock, loadBookStock, syncUniformStock, syncBookStock,
  loadSchoolFeeConfig, saveTranches, saveFeeConfig,
  loadGradePeriods, saveGradePeriods,
  updateSchoolName, yearEndStockReset,
} from './lib/db';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { FinancialHud } from './components/FinancialHud';
import { CahierGrid } from './components/CahierGrid';
import { PaymentModal } from './components/PaymentModal';
import { WhatsAppReceipt } from './components/WhatsAppReceipt';
import { AddStudentModal } from './components/AddStudentModal';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { StocksView } from './components/StocksView';
import { ReportCardView } from './components/ReportCardView';
import { AdminPanel } from './components/AdminPanel';
import { ClassView } from './components/ClassView';
import type { Student, UniformStockItem, BookStockItem, SchoolFeeConfig, FeeConfigRow, TrancheDef, FeeTypeDef, GradePeriod, AppView } from './types';
import { studentExpected, studentCollected, DEFAULT_FEE_TYPES } from './types';

const EMPTY_FEE_CONFIG: SchoolFeeConfig = {
  tranches: [{ index: 1, label: 'Tranche 1' }, { index: 2, label: 'Tranche 2' }, { index: 3, label: 'Tranche 3' }],
  feeTypes: DEFAULT_FEE_TYPES,
  feeConfig: [],
};

export default function App() {
  const { user, profile, loading, isTrialExpired, signOut, refreshProfile } = useAuth();

  const [isAdminPanel, setIsAdminPanel] = useState(() =>
    typeof window !== 'undefined' && window.location.hash.replace('#', '') === '/scolaria-admin'
  );

  const [students, setStudents] = useState<Student[]>([]);
  const [uniforms, setUniforms] = useState<UniformStockItem[]>([]);
  const [books, setBooks] = useState<BookStockItem[]>([]);
  const [feeConfig, setFeeConfig] = useState<SchoolFeeConfig>(EMPTY_FEE_CONFIG);
  const [gradePeriods, setGradePeriods] = useState<GradePeriod[]>([{ index: 1, label: 'Trimestre 1' }, { index: 2, label: 'Trimestre 2' }, { index: 3, label: 'Trimestre 3' }]);
  const [dataLoading, setDataLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [view, setView] = useState<AppView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeFeeType, setActiveFeeType] = useState<string>('scolarite');
  const [payOpen, setPayOpen] = useState(false);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [activeFeeTypeModal, setActiveFeeTypeModal] = useState<string | null>(null);
  const [activeTrancheKey, setActiveTrancheKey] = useState<number | 'single' | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptStudentId, setReceiptStudentId] = useState<string | null>(null);
  const [receiptFeeType, setReceiptFeeType] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const stockSales = useMemo(() => uniforms.reduce((sum, item) => sum + item.sold * item.price, 0), [uniforms]);
  const [payError, setPayError] = useState<string | null>(null);

  // ── Load all school data when user logs in ────────────
  const loadAllData = useCallback(async (schoolId: string) => {
    setDataLoading(true);
    try {
      const schoolConfig = await loadSchoolFeeConfig(schoolId);
      setFeeConfig(schoolConfig);

      const [stus, unis, bks, periods] = await Promise.all([
        loadStudents(schoolId, schoolConfig.feeConfig, schoolConfig.tranches),
        loadUniformStock(schoolId),
        loadBookStock(schoolId),
        loadGradePeriods(schoolId),
      ]);
      if (periods.length > 0) setGradePeriods(periods);
      setStudents(stus);
      setUniforms(unis);
      setBooks(bks);
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

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash.replace('#', '') === '/scolaria-admin') setIsAdminPanel(true);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

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
  const openCell = (id: string, feeType: string, trancheKey: number | 'single') => {
    setActiveStudentId(id);
    setActiveFeeTypeModal(feeType);
    setActiveTrancheKey(trancheKey);
    setPayOpen(true);
  };

  const validatePayment = async (id: string, feeType: string, trancheKey: number | 'single', amt: number) => {
    if (!profile?.schoolId) return;
    try {
      setPayError(null);
      await recordPayment(profile.schoolId, id, feeType, trancheKey, amt);
      setStudents(prev => prev.map(s => s.id === id ? {
        ...s,
        fees: s.fees.map(f => f.feeType === feeType ? {
          ...f,
          payments: {
            ...f.payments,
            [trancheKey]: { paid: (f.payments[trancheKey]?.paid ?? 0) + amt },
          },
        } : f),
      } : s));
    } catch (err: any) {
      setPayError(err.message || 'Erreur lors de l\'enregistrement du paiement.');
    }
  };

  const openReceipt = (s: Student, feeType: string) => {
    setReceiptStudentId(s.id);
    setReceiptFeeType(feeType);
    setReceiptOpen(true);
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

  // ── Stock handlers ────────────────────────────────────
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


  // ── Fee config save handler ───────────────────────────
  const handleFeeConfigSave = async (newTranches: TrancheDef[], newFeeTypes: FeeTypeDef[], newRows: FeeConfigRow[]) => {
    const newConfig: SchoolFeeConfig = { tranches: newTranches, feeTypes: newFeeTypes, feeConfig: newRows };
    setFeeConfig(newConfig);
    if (!profile?.schoolId) return;
    try {
      await Promise.all([
        saveTranches(profile.schoolId, newTranches),
        saveFeeConfig(profile.schoolId, newRows),
      ]);
    } catch (err) {
      console.error('Failed to save fee config:', err);
    }
  };

  const handleResetFeeConfig = () => {
    setFeeConfig(EMPTY_FEE_CONFIG);
  };

  const handleSaveGradePeriods = async (periods: GradePeriod[]) => {
    setGradePeriods(periods);
    if (!profile?.schoolId) return;
    try {
      await saveGradePeriods(profile.schoolId, periods);
    } catch (err) {
      console.error('Failed to save grade periods:', err);
    }
  };

  const handleYearEnd = async () => {
    if (!profile?.schoolId) return;
    try {
      await yearEndStockReset(profile.schoolId, uniforms, books);
      const [unis, bks] = await Promise.all([
        loadUniformStock(profile.schoolId),
        loadBookStock(profile.schoolId),
      ]);
      setUniforms(unis);
      setBooks(bks)
    } catch (err) {
      console.error('Year-end reset failed:', err);
    }
  };

  const handleNavigate = (v: AppView) => {
    setView(v);
    setSidebarOpen(false);
  };

  // ── Render ────────────────────────────────────────────

  if (isAdminPanel) {
    return <AdminPanel onExit={() => {
      if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
      setIsAdminPanel(false);
    }} />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-royal-700 animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return <LandingOrAuth onEnterAuth={() => {}} />;
  }

  if (isTrialExpired) {
    return <TrialExpired schoolName={profile.schoolName} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-canvas bg-grid">
      <Sidebar
        current={view}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(v => !v)}
        schoolName={profile.schoolName}
      />

      {/* Main content — offset by sidebar on desktop */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-sm">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            {/* Mobile: spacer for hamburger button */}
            <div className="w-12 shrink-0 lg:hidden" />

            {/* Search */}
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher un élève, classe, parent…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-royal-400 focus:ring-4"
              />
              {query && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-600 text-slate-400">{filtered.length}</span>}
            </div>

            {/* Right side: quick logout */}
            <button
              onClick={handleLogout}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 active:scale-95"
              title="Déconnexion"
              aria-label="Déconnexion"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          {dataLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-royal-700 animate-spin" />
            </div>
          )}

          {!dataLoading && (
            <>
              {view === 'dashboard' && (
                <DashboardView
                  students={students}
                  totalCollected={totalCollected}
                  outstanding={outstanding}
                  recoveryRate={recoveryRate}
                  stockSales={stockSales}
                  onNavigate={handleNavigate}
                />
              )}

              {view === 'cahier' && (<>
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-royal-700"><Sparkles className="h-3 w-3" />Tableau de bord</div>
                    <h1 className="font-display text-2xl font-700 tracking-tight text-ink sm:text-3xl">Le Cahier de Caisse</h1>
                    <p className="mt-1 text-sm text-slate-500">Suivez et encaissez les frais de scolarité et autres.</p>
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
                  <CahierGrid
                    students={filtered}
                    feeTypes={feeConfig.feeTypes}
                    tranches={feeConfig.tranches}
                    activeFeeType={activeFeeType}
                    onFeeTypeChange={setActiveFeeType}
                    onCellClick={openCell}
                    onWhatsApp={openReceipt}
                    onAddClick={() => setAddOpen(true)}
                  />
                </div>
              </>)}

              {view === 'classes' && (
                <ClassView
                  students={students}
                  feeTypes={feeConfig.feeTypes}
                  tranches={feeConfig.tranches}
                  onCellClick={openCell}
                  onWhatsApp={openReceipt}
                />
              )}

              {view === 'bulletins' && <ReportCardView students={students} gradePeriods={gradePeriods} schoolId={profile.schoolId} schoolName={profile.schoolName} academicYear="2025-2026" />}

              {view === 'stocks' && <StocksView uniforms={uniforms} books={books} onUniformsChange={handleUniformsChange} onBooksChange={handleBooksChange} />}

              {view === 'parametres' && <ConfigurationPanel
                feeConfig={feeConfig}
                onSaveFeeConfig={handleFeeConfigSave}
                onReset={handleResetFeeConfig}
                schoolName={profile.schoolName}
                onSchoolNameChange={handleSchoolNameChange}
                uniforms={uniforms}
                books={books}
                onYearEnd={handleYearEnd}
                gradePeriods={gradePeriods}
                onSaveGradePeriods={handleSaveGradePeriods}
              />}
            </>
          )}

          <footer className="mt-10 flex flex-col items-center gap-1 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
            <p className="font-600 text-slate-500">Gestilys — La référence premium de la gestion scolaire</p>
            <p>Afrique de l'Ouest · Conçu pour les intendances exigeantes</p>
          </footer>
        </main>
      </div>

      <PaymentModal
        student={activeStudent}
        feeType={activeFeeTypeModal}
        trancheKey={activeTrancheKey}
        open={payOpen}
        onClose={() => setPayOpen(false)}
        onValidate={validatePayment}
        feeTypes={feeConfig.feeTypes}
        tranches={feeConfig.tranches}
      />
      <WhatsAppReceipt
        student={receiptStudent}
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        schoolName={profile?.schoolName || ''}
        initialFeeType={receiptFeeType}
        feeTypes={feeConfig.feeTypes}
        tranches={feeConfig.tranches}
      />
      <AddStudentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={addStudent}
        feeTypes={feeConfig.feeTypes}
        feeConfig={feeConfig.feeConfig}
        tranches={feeConfig.tranches}
      />
    </div>
  );
}

function LandingOrAuth(_: { onEnterAuth: () => void }) {
  const [showAuth, setShowAuth] = useState(false);
  if (showAuth) return <AuthPage onBack={() => setShowAuth(false)} />;
  return <LandingPage onEnter={() => setShowAuth(true)} />;
}

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
