import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpenText, Sparkles, Filter, UserPlus, BarChart3, Users, CreditCard,
  LogOut, Lock, AlertTriangle, ArrowRight, Phone,
  Search, GraduationCap, Check, ShieldCheck, CircleHelp,
} from 'lucide-react';
import { useAuth } from './lib/auth';
import { generateMatricule, loadStudents, addStudentDB, recordPayment,
  loadUniformStock, loadBookStock, syncUniformStock, syncBookStock, loadSupplyStock, syncSupplyStock,
  loadSchoolFeeConfig, loadCurrentAcademicYear, saveTranches, saveFeeConfig,
  loadGradePeriods, saveGradePeriods,
  loadExpenses, addExpenseDB, deleteExpenseDB,
  updateSchoolName, loadSchoolLogo, saveSchoolLogo, yearEndStockReset,
  updateStudentDB, deleteStudentDB,
  loadTeachers, addTeacherDB, updateTeacherDB, deleteTeacherDB,
  loadSalaryPayments, paySalaryDB, unpaySalaryDB,
  loadSchoolClasses, addSchoolClass, setSchoolClassActive,
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
import { EditStudentModal } from './components/EditStudentModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { StocksView } from './components/StocksView';
import { ReportCardView } from './components/ReportCardView';
import { AdminPanel } from './components/AdminPanel';
import { UserGuide } from './components/UserGuide';
import { ClassView } from './components/ClassView';
import { StudentCardsView } from './components/StudentCardsView';
import { UnpaidTranchesView } from './components/UnpaidTranchesView';
import { ExpensesView } from './components/ExpensesView';
import { TeachersView } from './components/TeachersView';
import type { Student, UniformStockItem, BookStockItem, SupplyStockItem, SchoolFeeConfig, FeeConfigRow, TrancheDef, FeeTypeDef, GradePeriod, Expense, AppView, FeeSubscription, Teacher, SalaryPayment } from './types';
import { studentExpected, studentCollected, DEFAULT_FEE_TYPES, formatFCFA } from './types';

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
  const [supplies, setSupplies] = useState<SupplyStockItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
  const [feeConfig, setFeeConfig] = useState<SchoolFeeConfig>(EMPTY_FEE_CONFIG);
  const [classNames, setClassNames] = useState<string[]>([]);
  const [gradePeriods, setGradePeriods] = useState<GradePeriod[]>([{ index: 1, label: 'Trimestre 1' }, { index: 2, label: 'Trimestre 2' }, { index: 3, label: 'Trimestre 3' }]);
  const [dataLoading, setDataLoading] = useState(true);
  const [schoolLogo, setSchoolLogo] = useState('');
  const [currentAcademicYear, setCurrentAcademicYear] = useState('');

  const [query, setQuery] = useState('');
  const [view, setView] = useState<AppView>('dashboard');
  const [guideMode, setGuideMode] = useState<'onboarding' | 'module' | 'help' | null>(null);
  const [guideView, setGuideView] = useState<AppView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeFeeType, setActiveFeeType] = useState<string>('scolarite');
  const [payOpen, setPayOpen] = useState(false);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [activeFeeTypeModal, setActiveFeeTypeModal] = useState<string | null>(null);
  const [activeTrancheKey, setActiveTrancheKey] = useState<number | 'single' | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptStudentId, setReceiptStudentId] = useState<string | null>(null);
  const [receiptFeeType, setReceiptFeeType] = useState<string | null>(null);

  const [trancheReceiptOpen, setTrancheReceiptOpen] = useState(false);
  const [trancheReceiptStudentId, setTrancheReceiptStudentId] = useState<string | null>(null);
  const [trancheReceiptFeeType, setTrancheReceiptFeeType] = useState<string | null>(null);
  const [trancheReceiptKey, setTrancheReceiptKey] = useState<number | 'single' | null>(null);
  const [trancheReceiptAmount, setTrancheReceiptAmount] = useState(0);

  const [addOpen, setAddOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editStudentId, setEditStudentId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);

  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !profile?.schoolId || dataLoading) return;
    const key = 'gestilys-guide-started:' + profile.schoolId;
    const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
    const isNewAccount = createdAt > 0 && Date.now() - createdAt < 7 * 24 * 60 * 60 * 1000;
    try {
      if (isNewAccount && localStorage.getItem(key) !== 'done') setGuideMode('onboarding');
    } catch { /* If storage is unavailable, the help button remains available. */ }
  }, [user?.id, user?.created_at, profile?.schoolId, dataLoading]);

  const closeGuide = () => {
    if (guideMode === 'onboarding' && profile?.schoolId) {
      try { localStorage.setItem('gestilys-guide-started:' + profile.schoolId, 'done'); } catch { /* ignore storage errors */ }
    }
    if (guideMode === 'module' && profile?.schoolId) {
      try { localStorage.setItem('gestilys-guide-module:' + profile.schoolId + ':' + guideView, 'done'); } catch { /* ignore storage errors */ }
    }
    setGuideMode(null);
  };

  // ── Load all school data when user logs in ────────────
  const loadAllData = useCallback(async (schoolId: string) => {
    setDataLoading(true);
    try {
      const [schoolConfig, academicYear, schoolClasses] = await Promise.all([loadSchoolFeeConfig(schoolId), loadCurrentAcademicYear(schoolId), loadSchoolClasses(schoolId)]);
      setCurrentAcademicYear(academicYear);
      setFeeConfig(schoolConfig);
      setClassNames(schoolClasses);

      const results = await Promise.allSettled([
        loadStudents(schoolId, schoolConfig.feeConfig, schoolConfig.tranches),
        loadUniformStock(schoolId),
        loadBookStock(schoolId),
        loadSupplyStock(schoolId),
        loadGradePeriods(schoolId),
        loadExpenses(schoolId),
        loadTeachers(schoolId),
        loadSalaryPayments(schoolId),
      ]);

      if (results[0].status === 'fulfilled') setStudents(results[0].value);
      else console.error('Failed to load students:', results[0].reason);

      if (results[1].status === 'fulfilled') setUniforms(results[1].value);
      else console.error('Failed to load uniforms:', results[1].reason);

      if (results[2].status === 'fulfilled') setBooks(results[2].value);
      else console.error('Failed to load books:', results[2].reason);

      if (results[3].status === 'fulfilled') setSupplies(results[3].value);
      else console.error('Failed to load supplies:', results[3].reason);

      if (results[4].status === 'fulfilled' && results[4].value.length > 0) setGradePeriods(results[4].value);
      else if (results[4].status === 'rejected') console.error('Failed to load grade periods:', results[4].reason);

      if (results[5].status === 'fulfilled') setExpenses(results[5].value);
      else console.error('Failed to load expenses:', results[5].reason);

      if (results[6].status === 'fulfilled') setTeachers(results[6].value);
      else console.error('Failed to load teachers:', results[6].reason);

      if (results[7].status === 'fulfilled') setSalaryPayments(results[7].value);
      else console.error('Failed to load salary payments:', results[7].reason);
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
      setClassNames([]);
      setUniforms([]);
      setBooks([]);
      setSupplies([]);
      setExpenses([]);
      setTeachers([]);
      setSalaryPayments([]);
      setCurrentAcademicYear('');
      setDataLoading(false);
    }
  }, [user, profile?.schoolId, loadAllData]);

  useEffect(() => {
    if (!profile?.schoolId) { setSchoolLogo(''); return; }
    let cancelled = false;
    loadSchoolLogo(profile.schoolId).then(logo => { if (!cancelled) setSchoolLogo(logo); }).catch(err => console.error('Failed to load school logo:', err));
    return () => { cancelled = true; };
  }, [profile?.schoolId]);

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

  const stockSales = useMemo(
    () => uniforms.reduce((s, u) => s + u.sold * u.price, 0)
              + books.reduce((s, b) => s + b.sold * b.price, 0),
    [uniforms, books],
  );

  const { totalCollected, outstanding, recoveryRate } = useMemo(() => {
    const total = students.reduce((s, st) => s + studentExpected(st), 0);
    const coll = students.reduce((s, st) => s + studentCollected(st), 0) + stockSales;
    return {
      totalCollected: coll,
      outstanding: Math.max(0, total - coll),
      recoveryRate: total > 0 ? Math.round(coll / total * 100) : 0,
    };
  }, [students, stockSales]);

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);  const totalSalaryPaid = useMemo(() => salaryPayments.reduce((s, p) => s + p.amount, 0), [salaryPayments]);

  const activeStudent = students.find(s => s.id === activeStudentId) ?? null;
  const receiptStudent = students.find(s => s.id === receiptStudentId) ?? null;
  const trancheReceiptStudent = students.find(s => s.id === trancheReceiptStudentId) ?? null;
  const editStudent = students.find(s => s.id === editStudentId) ?? null;
  const deleteStudent = students.find(s => s.id === deleteStudentId) ?? null;

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
      setTrancheReceiptStudentId(id);
      setTrancheReceiptFeeType(feeType);
      setTrancheReceiptKey(trancheKey);
      setTrancheReceiptAmount(amt);
      setTrancheReceiptOpen(true);
    } catch (err: any) {
      setPayError(err.message || 'Erreur lors de l\'enregistrement du paiement.');
      throw err;
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

  const openEdit = (s: Student) => {
    setEditStudentId(s.id);
    setEditOpen(true);
  };

  const handleEditSave = async (id: string, updates: { firstName: string; lastName: string; className: string; parentName: string; parentPhone: string; fees: FeeSubscription[]; matricule: string; sexe: 'M' | 'F' }) => {
    try {
      await updateStudentDB(id, updates);
      setStudents(prev => prev.map(s => s.id === id ? {
        ...s,
        firstName: updates.firstName,
        lastName: updates.lastName,
        className: updates.className,
        parentName: updates.parentName,
        parentPhone: updates.parentPhone,
        matricule: updates.matricule,
        sexe: updates.sexe,
        fees: updates.fees,
      } : s));
    } catch (err: any) {
      setPayError(err.message || 'Erreur lors de la modification de l\'élève.');
      throw err;
    }
  };

  const openDelete = (s: Student) => {
    setDeleteStudentId(s.id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async (id: string) => {
    try {
      await deleteStudentDB(id);
      setStudents(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      setPayError(err.message || 'Erreur lors de la suppression de l\'élève.');
      throw err;
    }
  };

  const handleLogout = async () => { await signOut(); };

  const handleSchoolNameChange = async (name: string) => {
    if (!profile?.schoolId) throw new Error('École non identifiée.');
    await updateSchoolName(profile.schoolId, name);
    await refreshProfile();
  };

  const handleSchoolLogoChange = async (logoData: string) => {
    if (!profile?.schoolId) throw new Error('École non identifiée.');
    await saveSchoolLogo(profile.schoolId, logoData);
    setSchoolLogo(logoData);
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

  const handleSuppliesChange = useCallback((next: SupplyStockItem[]) => {
    const previous = supplies;
    setSupplies(next);
    if (profile?.schoolId) {
      syncSupplyStock(profile.schoolId, previous, next)
        .then(setSupplies)
        .catch(err => { console.error('Supply stock sync failed:', err); loadSupplyStock(profile.schoolId!).then(setSupplies).catch(console.error); });
    }
  }, [profile?.schoolId, supplies]);

  // ── Expense handlers ──────────────────────────────────
  const handleAddExpense = async (expense: Omit<Expense, 'id'>) => {
    if (!profile?.schoolId) return;
    try {
      const dbId = await addExpenseDB(profile.schoolId, expense);
      setExpenses(prev => [{ ...expense, id: dbId }, ...prev]);
    } catch (err) {
      console.error('Failed to add expense:', err);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteExpenseDB(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  // ── Teacher handlers ──────────────────────────────────
  const handleAddTeacher = async (t: Omit<Teacher, 'id'>) => {
    if (!profile?.schoolId) return;
    try {
      const dbId = await addTeacherDB(profile.schoolId, t);
      setTeachers(prev => [{ ...t, id: dbId }, ...prev]);
    } catch (err) {
      console.error('Failed to add teacher:', err);
    }
  };

  const handleUpdateTeacher = async (id: string, updates: { firstName: string; lastName: string; phone: string; subject: string; monthlySalary: number }) => {
    try {
      await updateTeacherDB(id, updates);
      setTeachers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    } catch (err) {
      console.error('Failed to update teacher:', err);
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    try {
      await deleteTeacherDB(id);
      setTeachers(prev => prev.filter(t => t.id !== id));
      setSalaryPayments(prev => prev.filter(p => p.teacherId !== id));
    } catch (err) {
      console.error('Failed to delete teacher:', err);
    }
  };

  const handlePaySalary = async (teacherId: string, month: string, amount: number) => {
    if (!profile?.schoolId) return;
    try {
      const dbId = await paySalaryDB(profile.schoolId, teacherId, month, amount);
      setSalaryPayments(prev => [{ id: dbId, teacherId, month, amount, paidAt: new Date().toISOString() }, ...prev]);
    } catch (err) {
      console.error('Failed to pay salary:', err);
    }  };

  const handleUnpaySalary = async (paymentId: string) => {
    try {
      await unpaySalaryDB(paymentId);
      setSalaryPayments(prev => prev.filter(p => p.id !== paymentId));
    } catch (err) {
      console.error('Failed to unpay salary:', err);
    }
  };

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

  const handleAddSchoolClass = async (name: string) => {
    if (!profile?.schoolId) throw new Error('École non identifiée. Reconnecte-toi puis réessaie.');
    const normalized = name.trim().replace(/\\s+/g, ' ');
    if (!normalized) throw new Error('Entre le nom de la classe.');
    if (classNames.some(c => c.toLocaleLowerCase() === normalized.toLocaleLowerCase())) {
      throw new Error('Cette classe est déjà disponible.');
    }
    await addSchoolClass(profile.schoolId, normalized);
    const additions: FeeConfigRow[] = [];
    for (const feeType of feeConfig.feeTypes) {
      if (feeType.paymentMode === 'tranche') {
        for (const tranche of feeConfig.tranches) additions.push({
          feeType: feeType.feeType, className: normalized, paymentMode: 'tranche',
          trancheIndex: tranche.index, amount: 0,
        });
      } else {
        additions.push({ feeType: feeType.feeType, className: normalized, paymentMode: 'single', trancheIndex: null, amount: 0 });
      }
    }
    const nextRows = [...feeConfig.feeConfig.filter(row => row.className !== normalized), ...additions];
    setClassNames(prev => [...prev, normalized].sort((x, y) => x.localeCompare(y, 'fr')));
    setFeeConfig(prev => ({ ...prev, feeConfig: nextRows }));
    try { await saveFeeConfig(profile.schoolId, nextRows); }
    catch (err) { console.error('Class added, but initial fee rows could not be saved:', err); throw new Error('Classe créée, mais les tarifs initiaux n’ont pas pu être enregistrés. Recharge les paramètres.'); }
  };

  const handleRemoveSchoolClass = async (name: string) => {
    if (!profile?.schoolId) throw new Error('École non identifiée. Reconnecte-toi puis réessaie.');
    if (classNames.length <= 1) throw new Error('L’école doit conserver au moins une classe disponible.');
    await setSchoolClassActive(profile.schoolId, name, false);
    setClassNames(prev => prev.filter(c => c !== name));
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

  const handleYearEnd = async (nextYear: string) => {
    if (!profile?.schoolId) throw new Error('École non identifiée. Reconnecte-toi puis réessaie.');
    await yearEndStockReset(profile.schoolId, nextYear);
    const [academicYear, refreshedStudents, refreshedUniforms, refreshedBooks, refreshedSupplies] = await Promise.all([
      loadCurrentAcademicYear(profile.schoolId),
      loadStudents(profile.schoolId, feeConfig.feeConfig, feeConfig.tranches),
      loadUniformStock(profile.schoolId),
      loadBookStock(profile.schoolId),
      loadSupplyStock(profile.schoolId),
    ]);
    setCurrentAcademicYear(academicYear);
    setStudents(refreshedStudents);
    setUniforms(refreshedUniforms);
    setBooks(refreshedBooks);
    setSupplies(refreshedSupplies);
  };

  const handleNavigate = (v: AppView) => {
    setView(v);
    setSidebarOpen(false);
    if (v !== 'dashboard' && guideMode !== 'onboarding' && profile?.schoolId) {
      const key = 'gestilys-guide-module:' + profile.schoolId + ':' + v;
      try {
        if (localStorage.getItem(key) !== 'done') {
          setGuideView(v);
          setGuideMode('module');
        }
      } catch { /* help remains available if browser storage is blocked */ }
    }
  };

  const startStudentFromGuide = () => {
    setView('inscriptions');
    setSidebarOpen(false);
    setAddOpen(true);
  };

  const isAdminEmail = (user?.email || '').trim().toLowerCase() === 'paulkomivitengue@gmail.com';
  const isMobileDevice = typeof navigator !== 'undefined' && (
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    Boolean((navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile) ||
    (navigator.maxTouchPoints > 0 && typeof window !== 'undefined' && window.innerWidth < 900)
  );
  const isAuthorizedAdmin = isAdminEmail && isMobileDevice;

  useEffect(() => {
    if (loading || !isAdminPanel || isAuthorizedAdmin) return;
    if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
    setIsAdminPanel(false);
  }, [loading, isAdminPanel, isAuthorizedAdmin]);

  // ── Render ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-royal-700 animate-spin" />
      </div>
    );
  }

  if (isAdminPanel && isAuthorizedAdmin) {
    return <AdminPanel onExit={() => {
      if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
      setIsAdminPanel(false);
    }} />;
  }

  if (!user) {
    return <LandingOrAuth onEnterAuth={() => {}} />;
  }

  // Never send an authenticated user to the public landing page just because
  // their school profile has not loaded or could not be fetched. Fail closed.
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-amber-100 text-amber-800">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-950">
            {loading ? 'Chargement de votre école…' : 'Impossible de charger votre compte'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            {loading
              ? 'Nous vérifions votre compte et le statut de votre essai. Cette étape peut prendre quelques secondes.'
              : 'Votre session est ouverte, mais les informations de votre école ne sont pas disponibles. Pour protéger vos données et vérifier votre abonnement, l’accès à l’espace scolaire reste bloqué. Réessayez ou contactez Gestilys.'}
          </p>
          {!loading && (
            <>
              {isAuthorizedAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminPanel(true);
                    window.location.hash = '/scolaria-admin';
                  }}
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-amber-500 bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-3 font-extrabold text-blue-950 shadow-md"
                  style={{ background: 'linear-gradient(105deg,#f4bd35,#ffdf73)', color: '#172554', border: '1px solid #d49a00' }}
                >
                  <ShieldCheck className="h-5 w-5" />
                  Ouvrir mon panneau administrateur
                </button>
              )}
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-800 px-4 py-3 font-bold text-white hover:bg-blue-900"
              >
                Réessayer
              </button>
              <a
                href="https://wa.me/22373369410?text=Bonjour%20Gestilys%2C%20je%20suis%20connect%C3%A9%20mais%20mon%20profil%20d%E2%80%99%C3%A9cole%20ne%20se%20charge%20pas."
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-bold text-emerald-900 hover:bg-emerald-100"
              >
                Contacter Gestilys sur WhatsApp
              </a>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100"
              >
                Se déconnecter
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (profile.subscriptionStatus === 'suspended') {
    return <SchoolSuspended schoolName={profile.schoolName} onLogout={handleLogout} />;
  }

  if (isTrialExpired || profile.subscriptionStatus === 'expired') {
    return <TrialExpired schoolName={profile.schoolName} schoolEmail={user.email || ''} onLogout={handleLogout} />;
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
        showAdminEntry={isAuthorizedAdmin}
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

            {/* Help stays available after the first-run guide is dismissed. */}
            <button
              type="button"
              onClick={() => { setGuideView(view); setGuideMode('help'); }}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-extrabold text-blue-900 transition hover:bg-blue-100"
              title="Ouvrir le mode d’emploi"
              aria-label="Aide et mode d’emploi"
            >
              <CircleHelp className="h-4 w-4" /><span className="hidden sm:inline">Aide</span>
            </button>
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
                  totalExpenses={totalExpenses}
                  onNavigate={handleNavigate}
                  onStartStudent={startStudentFromGuide}
                />
              )}

              {view === 'statistiques' && (
                <section className="animate-fadeIn space-y-6">
                  <div>
                    <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-royal-700"><BarChart3 className="h-3 w-3" /> Pilotage</div>
                    <h1 className="font-display text-2xl font-800 tracking-tight text-ink sm:text-3xl">Statistiques de l’établissement</h1>
                    <p className="mt-1 text-sm text-slate-500">Une vue synthétique des élèves, recettes, impayés et dépenses.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <div className="rounded-2xl border border-royal-100 bg-gradient-to-br from-royal-50 to-white p-4 shadow-card"><p className="text-xs font-700 uppercase tracking-wide text-royal-700">Élèves inscrits</p><p className="mt-2 font-display text-2xl font-800 text-ink">{students.length}</p></div>
                    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-card"><p className="text-xs font-700 uppercase tracking-wide text-emerald-700">Recettes enregistrées</p><p className="mt-2 font-display text-xl font-800 text-emerald-800">{formatFCFA(totalCollected)}</p></div>
                    <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-card"><p className="text-xs font-700 uppercase tracking-wide text-amber-700">Impayés estimés</p><p className="mt-2 font-display text-xl font-800 text-amber-800">{formatFCFA(outstanding)}</p></div>
                    <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-4 shadow-card"><p className="text-xs font-700 uppercase tracking-wide text-red-700">Dépenses</p><p className="mt-2 font-display text-xl font-800 text-red-800">{formatFCFA(totalExpenses + totalSalaryPaid)}</p></div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                    <h2 className="font-display text-lg font-800 text-ink">Répartition des élèves par classe</h2>
                    <p className="mt-1 text-xs text-slate-500">Nombre d’élèves actuellement enregistrés dans chaque classe.</p>
                    <div className="mt-4 space-y-3">
                      {Array.from(new Set(students.map(st => st.className).filter(Boolean))).sort((a,b) => a.localeCompare(b,'fr')).map(cls => {
                        const count = students.filter(st => st.className === cls).length;
                        const percent = students.length ? Math.round(count / students.length * 100) : 0;
                        return <div key={cls}><div className="mb-1 flex items-center justify-between gap-3 text-sm"><span className="font-700 text-slate-700">{cls}</span><span className="text-xs font-700 text-royal-700">{count} élève{count !== 1 ? 's' : ''} · {percent}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-royal-600 to-royal-800" style={{width: percent + '%'}} /></div></div>;
                      })}
                      {students.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Les statistiques apparaîtront après les premières inscriptions.</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2"><button onClick={() => handleNavigate('paiements')} className="rounded-xl bg-royal-700 px-4 py-2.5 text-sm font-700 text-white">Voir les paiements</button><button onClick={() => handleNavigate('impayes')} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-700 text-amber-800">Consulter les impayés</button></div>
                </section>
              )}

              {view === 'inscriptions' && (
                <section className="animate-fadeIn space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div><div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-teal-700"><UserPlus className="h-3 w-3" /> Scolarité</div><h1 className="font-display text-2xl font-800 tracking-tight text-ink sm:text-3xl">Inscriptions et élèves</h1><p className="mt-1 text-sm text-slate-500">Retrouvez les dossiers des élèves et ajoutez rapidement une inscription.</p></div>
                    <button onClick={() => setAddOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-royal-700 to-royal-900 px-4 py-3 text-sm font-700 text-white shadow-cardLg"><UserPlus className="h-4 w-4" /> Inscrire un élève</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-4"><p className="text-xs font-700 uppercase tracking-wide text-teal-700">Total inscrits</p><p className="mt-1 font-display text-2xl font-800 text-ink">{students.length}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-700 uppercase tracking-wide text-slate-500">Résultats filtrés</p><p className="mt-1 font-display text-2xl font-800 text-ink">{filtered.length}</p></div></div>
                  <div className="space-y-3">
                    {filtered.map(st => <div key={st.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-royal-50 text-royal-700"><Users className="h-5 w-5"/></span><div className="min-w-0"><p className="truncate font-display font-800 text-ink">{st.firstName} {st.lastName}</p><p className="mt-0.5 text-xs font-600 text-royal-700">{st.className} · Matricule {st.matricule || '—'}</p><p className="mt-1 text-xs text-slate-500">Parent : {st.parentName || '—'} · {st.parentPhone || 'Téléphone non renseigné'}</p></div></div><div className="flex gap-2"><button onClick={() => openEdit(st)} className="rounded-lg border border-royal-200 bg-royal-50 px-3 py-2 text-xs font-700 text-royal-700">Modifier</button><button onClick={() => openDelete(st)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-700 text-red-700">Supprimer</button></div></div>)}
                    {filtered.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Aucun élève trouvé. Utilisez « Inscrire un élève » pour commencer.</div>}
                  </div>
                </section>
              )}

              {view === 'paiements' && (
                <section className="animate-fadeIn space-y-5">
                  <div><div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-emerald-700"><CreditCard className="h-3 w-3" /> Finance</div><h1 className="font-display text-2xl font-800 tracking-tight text-ink sm:text-3xl">Suivi des paiements</h1><p className="mt-1 text-sm text-slate-500">Consultez les montants attendus, encaissés et restant à payer par élève.</p></div>
                  <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4"><p className="text-xs font-700 uppercase tracking-wide text-emerald-700">Encaissé</p><p className="mt-1 font-display text-xl font-800 text-emerald-800">{formatFCFA(students.reduce((sum,st) => sum + studentCollected(st),0))}</p></div><div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4"><p className="text-xs font-700 uppercase tracking-wide text-amber-700">Reste à payer</p><p className="mt-1 font-display text-xl font-800 text-amber-800">{formatFCFA(students.reduce((sum,st) => sum + Math.max(0, studentExpected(st)-studentCollected(st)),0))}</p></div></div>
                  <div className="space-y-3">
                    {filtered.map(st => <div key={st.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-display font-800 text-ink">{st.firstName} {st.lastName}</p><p className="text-xs text-slate-500">{st.className} · {st.matricule}</p></div><button onClick={() => openReceipt(st, st.fees[0]?.feeType || 'scolarite')} className="self-start rounded-lg bg-royal-700 px-3 py-2 text-xs font-700 text-white">Préparer un reçu WhatsApp</button></div><div className="space-y-2">{st.fees.map(fee => {const paid = Object.values(fee.payments).reduce((sum,p) => sum + p.paid,0); const remaining = Math.max(0,fee.totalExpected-paid); return <div key={fee.feeType} className="flex flex-col gap-1 rounded-xl bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"><span className="text-sm font-700 text-slate-700">{feeConfig.feeTypes.find(ft => ft.feeType === fee.feeType)?.label || fee.feeType}</span><span className="text-xs font-600 text-slate-600">Payé : <strong className="text-emerald-700">{formatFCFA(paid)}</strong> · Reste : <strong className={remaining > 0 ? 'text-amber-700' : 'text-emerald-700'}>{formatFCFA(remaining)}</strong></span></div>;})}</div></div>)}
                    {filtered.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Aucun élève trouvé.</div>}
                  </div>
                  <button onClick={() => handleNavigate('cahier')} className="rounded-xl border border-royal-200 bg-royal-50 px-4 py-2.5 text-sm font-700 text-royal-700">Ouvrir le cahier de caisse détaillé</button>
                </section>
              )}

              {view === 'cahier' && (<>
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-royal-700"><Sparkles className="h-3 w-3" />Tableau de bord</div>
                    <h1 className="font-display text-2xl font-700 tracking-tight text-ink sm:text-3xl">Le Cahier de Caisse</h1>
                    <p className="mt-1 text-sm text-slate-500">Suivez et encaissez les frais de scolarité et autres.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex"><Filter className="h-4 w-4" /><span>{students.length} élève{students.length !== 1 ? 's' : ''} · {currentAcademicYear || 'Année non définie'}</span></div>
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
                    onEdit={openEdit}
                    onDelete={openDelete}
                  />
                </div>
              </>)}

              {view === 'cartes' && <StudentCardsView students={students} schoolId={profile.schoolId} schoolName={profile.schoolName} schoolLogo={schoolLogo} onSchoolLogoChange={handleSchoolLogoChange} />}

              {view === 'classes' && (
                <ClassView
                  students={students}
                  feeTypes={feeConfig.feeTypes}
                  tranches={feeConfig.tranches}
                  onCellClick={openCell}
                  onWhatsApp={openReceipt}
                  onEdit={openEdit}
                  onDelete={openDelete}
                />
              )}

              {view === 'impayes' && (
                <UnpaidTranchesView students={students} feeConfig={feeConfig} />
              )}

              {view === 'depenses' && (
                <ExpensesView expenses={expenses} onAdd={handleAddExpense} onDelete={handleDeleteExpense} totalSalaryPaid={totalSalaryPaid} />
              )}

              {view === 'enseignants' && (
                <TeachersView
                  teachers={teachers}
                  salaryPayments={salaryPayments}
                  onAdd={handleAddTeacher}
                  onUpdate={handleUpdateTeacher}
                  onDelete={handleDeleteTeacher}
                  onPaySalary={handlePaySalary}
                  onUnpaySalary={handleUnpaySalary}
                />
              )}

              {view === 'bulletins' && <ReportCardView students={students} gradePeriods={gradePeriods} schoolId={profile.schoolId} schoolName={profile.schoolName} schoolLogo={schoolLogo} academicYear={currentAcademicYear} />}

              {view === 'stocks' && <StocksView uniforms={uniforms} books={books} supplies={supplies} onUniformsChange={handleUniformsChange} onBooksChange={handleBooksChange} onSuppliesChange={handleSuppliesChange} />}

              {view === 'parametres' && <ConfigurationPanel
                feeConfig={feeConfig}
                classNames={classNames}
                onAddClass={handleAddSchoolClass}
                onRemoveClass={handleRemoveSchoolClass}
                onSaveFeeConfig={handleFeeConfigSave}
                onReset={handleResetFeeConfig}
                schoolName={profile.schoolName}
                onSchoolNameChange={handleSchoolNameChange}
                schoolLogo={schoolLogo}
                onSchoolLogoChange={handleSchoolLogoChange}
                uniforms={uniforms}
                books={books}
                supplies={supplies}
                currentAcademicYear={currentAcademicYear}
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
        schoolId={profile?.schoolId || ''}
        initialFeeType={receiptFeeType}
        feeTypes={feeConfig.feeTypes}
        tranches={feeConfig.tranches}
      />
      <WhatsAppReceipt
        student={trancheReceiptStudent}
        open={trancheReceiptOpen}
        onClose={() => setTrancheReceiptOpen(false)}
        schoolName={profile?.schoolName || ''}
        schoolId={profile?.schoolId || ''}
        initialFeeType={trancheReceiptFeeType}
        feeTypes={feeConfig.feeTypes}
        tranches={feeConfig.tranches}
        trancheKey={trancheReceiptKey}
        paidAmount={trancheReceiptAmount}
      />
      <UserGuide
        open={guideMode !== null}
        mode={guideMode || 'help'}
        view={guideView}
        schoolName={profile?.schoolName || ''}
        onClose={closeGuide}
        onNavigate={handleNavigate}
        onStartStudent={startStudentFromGuide}
      />
      <AddStudentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onOpenSettings={() => { setAddOpen(false); handleNavigate('parametres'); }}
        onAdd={addStudent}
        feeTypes={feeConfig.feeTypes}
        feeConfig={feeConfig.feeConfig}
        tranches={feeConfig.tranches}
        schoolName={profile?.schoolName || ''}
        schoolId={profile?.schoolId || ''}
        classNames={classNames}
        onGenerateMatricule={generateMatricule}      />
      <EditStudentModal
        student={editStudent}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleEditSave}
        feeTypes={feeConfig.feeTypes}
        feeConfig={feeConfig.feeConfig}
        tranches={feeConfig.tranches}
        classNames={classNames}
      />
      <DeleteConfirmModal
        student={deleteStudent}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

function LandingOrAuth(_: { onEnterAuth: () => void }) {
  const [showAuth, setShowAuth] = useState(false);
  if (showAuth) return <AuthPage onBack={() => setShowAuth(false)} />;
  return <LandingPage onEnter={() => setShowAuth(true)} />;
}

function SchoolSuspended({ schoolName, onLogout }: { schoolName: string; onLogout: () => void }) {
  const message = encodeURIComponent(`Bonjour Gestilys, l’accès de l’école « ${schoolName} » est suspendu. Pouvez-vous m’aider à rétablir l’accès ?`);
  return (
    <div className="gestilys-suspended-page min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <style>{`
        .gestilys-suspended-page { --gs-navy:#172554; --gs-blue:#1d4ed8; --gs-gold:#f4bd35; position:relative; isolation:isolate; display:flex; align-items:center; justify-content:center; overflow:hidden; background:radial-gradient(ellipse at 8% 10%,rgba(59,130,246,.24),transparent 32%),radial-gradient(ellipse at 95% 3%,rgba(244,189,53,.24),transparent 30%),linear-gradient(145deg,#101c42 0%,#172554 48%,#1e40af 115%); }
        .gestilys-suspended-page:before { content:""; position:absolute; inset:0; z-index:-1; pointer-events:none; background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px); background-size:32px 32px; mask-image:linear-gradient(to bottom,black,transparent 88%); }
        .gs-suspended-shell { width:min(650px,100%); overflow:hidden; border:1px solid rgba(255,255,255,.28); border-radius:28px; background:#fff; box-shadow:0 30px 90px rgba(2,6,23,.4); }
        .gs-suspended-top { position:relative; overflow:hidden; padding:22px; color:#fff; background:linear-gradient(115deg,#172554 0%,#1d4ed8 72%,#0f766e 135%); }
        .gs-suspended-top:after { content:""; position:absolute; right:-50px; top:-100px; width:210px; height:210px; border:24px solid rgba(255,255,255,.10); border-radius:50%; pointer-events:none; }
        .gs-suspended-brand { display:flex; align-items:center; gap:11px; font-weight:950; letter-spacing:-.04em; font-size:22px; }
        .gs-suspended-brand-mark { display:grid; place-items:center; width:43px; height:43px; flex:none; border:1px solid rgba(255,255,255,.35); border-radius:14px; color:#172554; background:linear-gradient(135deg,#ffe89a,#f4bd35); box-shadow:0 8px 22px rgba(244,189,53,.2); }
        .gs-suspended-badge { display:inline-flex; align-items:center; gap:7px; margin-top:20px; border:1px solid #fecaca; border-radius:999px; padding:7px 11px; color:#991b1b; background:#fff1f2; font-size:11px; font-weight:950; letter-spacing:.08em; text-transform:uppercase; }
        .gs-suspended-title { margin-top:12px; color:#fff!important; font-size:clamp(27px,5vw,38px); font-weight:950; letter-spacing:-.045em; line-height:1.08; }
        .gs-suspended-top-copy { margin-top:9px; max-width:510px; color:#eff6ff!important; font-size:13px; line-height:1.7; }
        .gs-suspended-body { padding:20px; color:#172554; }
        .gs-suspended-school { border:1px solid #bfdbfe; border-radius:16px; padding:14px; background:linear-gradient(120deg,#eff6ff,#fff 75%); }
        .gs-suspended-school-label { color:#1d4ed8!important; font-size:10px; font-weight:950; letter-spacing:.12em; text-transform:uppercase; }
        .gs-suspended-school-name { margin-top:4px; color:#172554!important; overflow-wrap:anywhere; font-size:17px; font-weight:900; }
        .gs-suspended-copy { color:#334155!important; font-size:13px; line-height:1.75; }
        .gs-suspended-info { display:flex; align-items:flex-start; gap:10px; margin-top:15px; border:1px solid #fde68a; border-radius:15px; padding:13px; color:#713f12; background:#fffbeb; }
        .gs-suspended-info p { color:#713f12!important; font-size:12px; line-height:1.65; }
        .gs-suspended-primary { display:flex; align-items:center; justify-content:center; gap:9px; width:100%; min-height:50px; margin-top:18px; border:1px solid #047857; border-radius:14px; padding:12px 16px; color:#fff!important; background:linear-gradient(110deg,#059669,#047857); box-shadow:0 10px 22px rgba(5,150,105,.2); font-size:13px; font-weight:900; text-decoration:none; transition:transform .18s,filter .18s; }
        .gs-suspended-primary:hover { transform:translateY(-1px); filter:brightness(1.04); }
        .gs-suspended-secondary { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; min-height:46px; margin-top:9px; border:1px solid #cbd5e1; border-radius:13px; padding:10px 16px; color:#172554!important; background:#fff; font-size:13px; font-weight:850; }
        .gs-suspended-secondary:hover { background:#f8fafc; }
        .gs-suspended-footer { margin-top:15px; text-align:center; color:#cbd5e1; font-size:11px; line-height:1.6; }
        @media(min-width:560px) { .gs-suspended-top { padding:28px 30px; } .gs-suspended-body { padding:26px 30px 28px; } }
        @media(prefers-reduced-motion:reduce) { .gs-suspended-primary { transition:none; } .gs-suspended-primary:hover { transform:none; } }
      `}</style>
      <div className="gs-suspended-shell">
        <header className="gs-suspended-top">
          <div className="gs-suspended-brand"><span className="gs-suspended-brand-mark"><GraduationCap className="h-6 w-6" /></span><span>Gestilys<span className="text-[#f4bd35]">.</span></span></div>
          <div className="gs-suspended-badge"><Lock className="h-3.5 w-3.5" /> Accès temporairement suspendu</div>
          <h1 className="gs-suspended-title">Retrouvons l’accès à votre école.</h1>
          <p className="gs-suspended-top-copy">Votre espace Gestilys est actuellement suspendu par l’administration. Notre équipe peut vous aider à comprendre la situation et à examiner la réactivation.</p>
        </header>
        <main className="gs-suspended-body">
          <div className="gs-suspended-school">
            <p className="gs-suspended-school-label">Établissement concerné</p>
            <p className="gs-suspended-school-name">{schoolName || 'Votre établissement'}</p>
          </div>
          <p className="gs-suspended-copy mt-4">Les données de votre école sont conservées. Contactez l’équipe Gestilys pour connaître la raison de la suspension ou demander un rétablissement de l’accès.</p>
          <div className="gs-suspended-info"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><p><strong>Besoin d’aide ?</strong><br />Envoyez-nous un message. Indiquez le nom de l’établissement pour accélérer la vérification.</p></div>
          <a href={`https://wa.me/22373369410?text=${message}`} target="_blank" rel="noreferrer" className="gs-suspended-primary"><Phone className="h-4 w-4" /> Contacter Gestilys sur WhatsApp <ArrowRight className="h-4 w-4" /></a>
          <button onClick={onLogout} className="gs-suspended-secondary"><LogOut className="h-4 w-4" /> Se déconnecter</button>
        </main>
      </div>
      <p className="gs-suspended-footer">Gestilys · Gestion scolaire simplifiée · Vos données restent associées à votre établissement.</p>
    </div>
  );
}
function TrialExpired({ schoolName, schoolEmail, onLogout }: { schoolName: string; schoolEmail: string; onLogout: () => void }) {
  const [billingPeriod, setBillingPeriod] = useState<'mensuel' | 'annuel'>('annuel');
  const plans = [
    { name: 'Essentiel' as const, monthly: 10000, detail: 'Les outils indispensables pour suivre les élèves et les frais scolaires.', tone: 'blue', features: ['Suivi des élèves et des classes', 'Encaissements et frais scolaires', 'Reçus à partager sur WhatsApp'] },
    { name: 'Premium' as const, monthly: 20000, detail: 'Un suivi administratif et financier plus complet au quotidien.', tone: 'violet', features: ['Tout le contenu Essentiel', 'Suivi des dépenses et des stocks', 'Tableaux de bord et bulletins'], popular: true },
    { name: 'Élite' as const, monthly: 30000, detail: 'Pour les établissements qui souhaitent un suivi plus approfondi.', tone: 'gold', features: ['Tout le contenu Premium', 'Accompagnement prioritaire', 'Configuration adaptée à votre école'] },
  ];
  const whatsappUrl = (planName: string, amount: number, period: 'mensuel' | 'annuel') => {
    const periodLabel = period === 'mensuel' ? 'mensuel, 1 mois' : 'annuel, 12 mois d’accès pour le prix de 10 mois (2 mois offerts)';
    const message = encodeURIComponent(
      "Bonjour, je souhaite m'abonner à Gestilys, formule " + planName + " (" + amount.toLocaleString('fr-FR') + " FCFA, " + periodLabel + "), pour l'école " + schoolName + " (" + schoolEmail + "). Merci de m'indiquer les étapes pour régler et activer mon abonnement."
    );
    return 'https://wa.me/22373369410?text=' + message;
  };
  const adviceUrl = 'https://wa.me/22373369410?text=' + encodeURIComponent("Bonjour Gestilys, je souhaite être conseillé pour choisir une formule. École : " + schoolName + ". E-mail : " + schoolEmail + ". Merci de me guider.");
  return (
    <div className="gestilys-billing min-h-screen overflow-hidden px-4 py-6 text-slate-900 sm:px-6 sm:py-10">
      <style>{`
        .gestilys-billing { --gb-navy:#172554; --gb-blue:#1d4ed8; --gb-gold:#f4bd35; position:relative; isolation:isolate; background:radial-gradient(ellipse at 8% 8%,rgba(59,130,246,.17),transparent 34%),radial-gradient(ellipse at 94% 3%,rgba(244,189,53,.23),transparent 30%),linear-gradient(180deg,#f4f7ff 0%,#fff 58%,#f7f9fd 100%); }
        .gestilys-billing:before { content:""; position:absolute; inset:0; z-index:-1; pointer-events:none; background-image:linear-gradient(rgba(29,78,216,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(29,78,216,.04) 1px,transparent 1px); background-size:32px 32px; mask-image:linear-gradient(to bottom,black,transparent 78%); }
        .gb-shell { width:min(1120px,100%); margin-inline:auto; }
        .gb-brand { display:flex; align-items:center; gap:11px; color:var(--gb-navy); font-weight:900; letter-spacing:-.04em; }
        .gb-brand-mark { display:grid; place-items:center; width:43px; height:43px; border-radius:14px; color:var(--gb-navy); background:linear-gradient(135deg,#f9d56e,#f4bd35); box-shadow:0 8px 22px rgba(244,189,53,.25); }
        .gb-eyebrow { display:inline-flex; align-items:center; gap:8px; padding:7px 12px; border:1px solid #dbeafe; border-radius:999px; background:#eff6ff; color:#1d4ed8; font-size:11px; font-weight:850; letter-spacing:.1em; text-transform:uppercase; }
        .gb-title { color:#172554; font-size:clamp(32px,5vw,54px); font-weight:900; letter-spacing:-.055em; line-height:1.06; }
        .gb-title span { color:#1d4ed8; }
        .gb-card { position:relative; overflow:hidden; border:1px solid #e0e8f5; border-radius:24px; background:rgba(255,255,255,.92); box-shadow:0 16px 42px rgba(23,37,84,.075); transition:transform .2s,box-shadow .2s,border-color .2s; }
        .gb-card:hover { transform:translateY(-4px); box-shadow:0 24px 55px rgba(23,37,84,.13); }
        .gb-card:before { content:""; position:absolute; inset:0 0 auto; height:5px; background:linear-gradient(90deg,#60a5fa,#1d4ed8); }
        .gb-card.violet:before { background:linear-gradient(90deg,#818cf8,#4338ca); }
        .gb-card.gold:before { background:linear-gradient(90deg,#f9d56e,#e0a800); }
        .gb-card.popular { border-color:#f0c653; background:linear-gradient(155deg,#172554 0%,#1e3a8a 68%,#1d4ed8 130%); box-shadow:0 24px 58px rgba(23,37,84,.23); color:#fff; transform:translateY(-7px); }
        .gb-card.popular:before { height:6px; background:linear-gradient(90deg,#f9d56e,#f4bd35,#fff0b3); }
        .gb-card.popular:hover { box-shadow:0 30px 68px rgba(23,37,84,.28); transform:translateY(-10px); }
        .gb-card.popular .gb-plan-badge { display:inline-flex; align-items:center; justify-content:center; background:#f4bd35 !important; color:#172554 !important; border:1px solid #f4bd35 !important; box-shadow:0 4px 12px rgba(244,189,53,.2); }
        .gb-card.popular .gb-plan-detail,.gb-card.popular .gb-plan-period,.gb-card.popular .gb-plan-features li { color:#dbeafe !important; }
        .gb-card .gb-plan-savings { display:block; color:#065f46 !important; background:#d1fae5 !important; border:1px solid #6ee7b7 !important; border-radius:12px; padding:10px 12px; font-weight:850; line-height:1.5; opacity:1 !important; text-shadow:none !important; }
        .gb-card.popular .gb-plan-savings { color:#064e3b !important; background:#d1fae5 !important; border-color:#6ee7b7 !important; }
        .gb-card.popular .gb-plan-popular-label { display:inline-flex; align-items:center; justify-content:center; min-height:32px; padding:8px 14px; background:#f4bd35 !important; background-image:linear-gradient(135deg,#ffe58a 0%,#f4bd35 55%,#eab308 100%) !important; color:#172554 !important; border:2px solid #f4bd35 !important; border-radius:999px; font-size:10px; font-weight:950; line-height:1.15; letter-spacing:.04em; white-space:nowrap; box-shadow:0 5px 0 rgba(23,37,84,.16),0 8px 18px rgba(244,189,53,.32); text-shadow:none !important; }
        .gb-card.popular .gb-plan-note { color:#172554 !important; background:#f8fafc !important; background-image:linear-gradient(135deg,#eff6ff,#fff) !important; border-color:#bfdbfe !important; }
        .gb-card.popular .gb-plan-note { display:block; color:#172554 !important; background:linear-gradient(135deg,#eff6ff,#fff); border:1px solid #bfdbfe; border-radius:10px; padding:9px 10px; font-weight:750; }
        .gb-card.popular .gb-plan-price { text-shadow:0 2px 12px rgba(0,0,0,.12); }
        .gb-card.popular .gb-plan-price { color:#fff !important; }
        .gb-card.popular .gb-plan-features { border-color:rgba(219,234,254,.2); }
        .gb-card.popular .gb-check { background:rgba(244,189,53,.16); color:#f9d56e; }
        @media (max-width:767px) { .gb-card.popular { transform:none; } .gb-card.popular:hover { transform:translateY(-3px); } }
        .gb-switch { display:flex; gap:5px; padding:5px; border:1px solid #dce5f2; border-radius:16px; background:rgba(255,255,255,.8); box-shadow:0 8px 24px rgba(23,37,84,.06); }
        .gb-switch button { border:0; border-radius:11px; padding:11px 17px; font-size:13px; font-weight:850; cursor:pointer; color:#52627a; background:transparent; transition:all .2s; }
        .gb-switch button.active { color:#172554; background:linear-gradient(135deg,#f9d56e,#f4bd35); box-shadow:0 5px 14px rgba(244,189,53,.22); }
        .gb-cta { display:inline-flex; align-items:center; justify-content:center; gap:9px; min-height:48px; border-radius:14px; padding:12px 16px; color:#172554; background:linear-gradient(135deg,#f9d56e,#f4bd35); box-shadow:0 8px 22px rgba(244,189,53,.22); font-size:13px; font-weight:900; text-decoration:none; transition:transform .18s,box-shadow .18s; }
        .gb-cta:hover { transform:translateY(-2px); box-shadow:0 12px 28px rgba(244,189,53,.32); }
        .gb-cta-secondary { color:white; background:#172554; box-shadow:0 8px 22px rgba(23,37,84,.17); }
        .gb-cta-secondary:hover { box-shadow:0 12px 28px rgba(23,37,84,.25); }
        .gb-check { display:grid; place-items:center; width:20px; height:20px; flex:none; border-radius:7px; color:#1d4ed8; background:#eff6ff; }
        @media (prefers-reduced-motion:reduce) { .gb-card,.gb-cta { transition:none; } .gb-card:hover,.gb-cta:hover { transform:none; } }
      `}</style>
      <div className="gb-shell">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="gb-brand"><span className="gb-brand-mark"><GraduationCap className="h-6 w-6" /></span><span className="text-2xl">Gestilys<span className="ml-1 text-blue-700">.</span><span className="mt-0.5 block text-[10px] font-extrabold uppercase tracking-[.19em] text-slate-500">La gestion scolaire simplifiée</span></span></div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/85 px-3 py-2 text-xs font-extrabold text-blue-950 shadow-sm"><Lock className="h-4 w-4 text-amber-600" /> Essai gratuit terminé</div>
        </header>

        <section className="relative mx-auto max-w-3xl py-10 text-center sm:py-14">
          <div className="pointer-events-none absolute left-1/2 top-12 -z-10 h-44 w-44 -translate-x-1/2 rounded-full bg-blue-200/40 blur-3xl" />
          <span className="gb-eyebrow"><Sparkles className="h-3.5 w-3.5" /> Votre école, votre espace de gestion</span>
          <h1 className="gb-title mt-5">Continuez à faire grandir <span>votre école.</span></h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">La période d’essai de <strong className="text-blue-950">{schoolName}</strong> est terminée. Choisissez la formule adaptée à votre établissement et demandez son activation en quelques échanges sur WhatsApp.</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-bold text-slate-600"><span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-blue-600" /> Vos données sont conservées</span><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-600" /> Aucun paiement automatique</span></div>
        </section>

        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-extrabold uppercase tracking-[.14em] text-blue-950">Choisissez votre période</p>
          <div className="gb-switch" role="group" aria-label="Période de facturation">
            <button type="button" onClick={() => setBillingPeriod('mensuel')} aria-pressed={billingPeriod === 'mensuel'} className={billingPeriod === 'mensuel' ? 'active' : ''}>Mensuel</button>
            <button type="button" onClick={() => setBillingPeriod('annuel')} aria-pressed={billingPeriod === 'annuel'} className={billingPeriod === 'annuel' ? 'active' : ''}>Annuel · 2 mois offerts</button>
          </div>
          <p className="text-center text-xs text-slate-500">{billingPeriod === 'annuel' ? 'Payez 10 mois, profitez de 12 mois d’accès.' : 'Un mois d’accès, renouvelable selon vos besoins.'}</p>
        </div>

        <div className="mt-7 grid items-stretch gap-5 md:grid-cols-3">
          {plans.map((plan) => {
            const amount = billingPeriod === 'mensuel' ? plan.monthly : plan.monthly * 10;
            const tone = plan.tone === 'gold' ? { border: 'border-amber-300', badge: 'bg-amber-100 text-amber-950' } : plan.tone === 'violet' ? { border: 'border-indigo-200', badge: 'bg-indigo-50 text-indigo-900' } : { border: 'border-blue-200', badge: 'bg-blue-50 text-blue-900' };
            return (
              <article key={plan.name} className={'gb-card ' + (plan.tone === 'violet' ? 'violet ' : plan.tone === 'gold' ? 'gold ' : '') + (plan.popular ? 'popular ' : '') + 'flex flex-col p-5 sm:p-6'}>
                {plan.popular && <span className="gb-plan-popular-label absolute right-4 top-4 z-10">LE PLUS CHOISI</span>}
                <span className={'gb-plan-badge inline-flex w-fit rounded-full px-3 py-1.5 text-[11px] font-extrabold ' + tone.badge}>{plan.name}</span>
                <p className="gb-plan-detail mt-4 min-h-[50px] pr-2 text-sm leading-6 text-slate-600">{plan.detail}</p>
                <div className="mt-5 flex items-end gap-2"><strong className="gb-plan-price text-3xl font-extrabold tracking-tight text-blue-950 sm:text-4xl">{amount.toLocaleString('fr-FR')}</strong><span className="gb-plan-period pb-1 text-xs font-bold text-slate-500">FCFA / {billingPeriod === 'mensuel' ? 'mois' : 'an'}</span></div>
                {billingPeriod === 'annuel' && <div className="gb-plan-savings mt-3 text-xs">✓ 2 mois offerts · Économie de {(plan.monthly * 2).toLocaleString('fr-FR')} FCFA</div>}
                <p className="gb-plan-note mt-3 text-xs leading-5 text-slate-500">{billingPeriod === 'annuel' ? '12 mois d’accès, prix équivalent à 10 mensualités.' : 'Paiement pour un mois d’accès.'}</p>
                <ul className="gb-plan-features mt-5 flex-1 space-y-3 border-t border-slate-100 pt-5">{plan.features.map(feature => <li key={feature} className="flex items-start gap-2.5 text-xs font-semibold leading-5 text-slate-700"><span className="gb-check mt-0.5"><Check className="h-3 w-3" /></span><span>{feature}</span></li>)}</ul>
                <a href={whatsappUrl(plan.name, amount, billingPeriod)} target="_blank" rel="noreferrer" className="gb-cta mt-6 w-full">Choisir cette formule <ArrowRight className="h-4 w-4" /></a>
              </article>
            );
          })}
        </div>

        <section className="gb-card mt-8 flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:justify-between sm:p-8">
          <div className="max-w-xl"><span className="gb-eyebrow">Besoin d’un conseil ?</span><h2 className="mt-3 text-xl font-extrabold tracking-tight text-blue-950">On vous aide à choisir.</h2><p className="mt-2 text-sm leading-6 text-slate-600">Expliquez-nous les besoins de votre établissement : nous vous guiderons vers la formule la plus adaptée.</p></div>
          <a href={adviceUrl} target="_blank" rel="noreferrer" className="gb-cta gb-cta-secondary shrink-0"><Phone className="h-4 w-4" /> Parler à Gestilys <ArrowRight className="h-4 w-4" /></a>
        </section>

        <footer className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-blue-100 py-6 text-center sm:flex-row sm:text-left"><p className="text-xs font-semibold text-slate-500">© {new Date().getFullYear()} Gestilys · Pensé pour les écoles d’Afrique de l’Ouest</p><button onClick={onLogout} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-extrabold text-blue-950 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"><LogOut className="h-4 w-4" /> Se déconnecter</button></footer>
      </div>
    </div>
  );
}
