import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, Sparkles, Filter, UserPlus, Settings2, LayoutGrid, LogOut, Boxes, CheckCircle2, ShieldCheck } from 'lucide-react';
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
import { DEFAULT_PRICING, DEFAULT_UNIFORM_STOCK, DEFAULT_BOOK_STOCK } from './data';
import type { Student, MonthKey, ServiceType, PricingConfig, UniformStockItem, BookStockItem } from './types';
import { studentExpected, studentCollected, uniformRemaining, bookRemaining } from './types';
import { getSchoolName, setSchoolName } from './whatsapp';

type AppScreen = 'landing' | 'auth' | 'dashboard' | 'admin';
type View = 'cahier' | 'stocks' | 'parametres';

const SESSION_KEY = 'scolaria_session';

function hasStoredSession(): boolean {
  try { return !!localStorage.getItem(SESSION_KEY); } catch { return false; }
}
function clearSession() { try { localStorage.removeItem(SESSION_KEY); } catch { /* noop */ } }

export default function App() {
  const [screen, setScreen] = useState<AppScreen>(() => {
    if (typeof window !== 'undefined' && window.location.hash.replace('#', '') === '/scolaria-admin') return 'admin';
    return hasStoredSession() ? 'dashboard' : 'landing';
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [uniforms, setUniforms] = useState<UniformStockItem[]>(DEFAULT_UNIFORM_STOCK);
  const [books, setBooks] = useState<BookStockItem[]>(DEFAULT_BOOK_STOCK);
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>('cahier');
  const [activeService, setActiveService] = useState<ServiceType>('scolarite');
  const [payOpen, setPayOpen] = useState(false);
  const [activeStudentId, setActiveStudentId] = useState<string|null>(null);
  const [activeMonth, setActiveMonth] = useState<MonthKey|null>(null);
  const [activeSvcModal, setActiveSvcModal] = useState<ServiceType|null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptStudentId, setReceiptStudentId] = useState<string|null>(null);
  const [receiptService, setReceiptService] = useState<ServiceType|null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [schoolName, setSchoolNameState] = useState<string>(() => getSchoolName());
  const [stockSales, setStockSales] = useState<number>(0);
  const [stockToast, setStockToast] = useState<string | null>(null);

  useEffect(() => {
    if (screen !== 'dashboard') document.body.style.background = '';
  }, [screen]);

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash.replace('#', '') === '/scolaria-admin') setScreen('admin');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const exitAdmin = () => {
    if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
    setScreen(hasStoredSession() ? 'dashboard' : 'landing');
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) || s.className.toLowerCase().includes(q) || s.parentName.toLowerCase().includes(q));
  }, [students, query]);

  const { totalCollected, outstanding, recoveryRate } = useMemo(() => {
    const total = students.reduce((s,st)=>s+studentExpected(st),0);
    const coll = students.reduce((s,st)=>s+studentCollected(st),0) + stockSales;
    return { totalCollected:coll, outstanding:Math.max(0,total-coll), recoveryRate: total>0?Math.round(coll/total*100):0 };
  }, [students, stockSales]);

  const activeStudent = students.find(s=>s.id===activeStudentId) ?? null;
  const receiptStudent = students.find(s=>s.id===receiptStudentId) ?? null;

  const openCell = (id:string, m:MonthKey, svc:ServiceType) => { setActiveStudentId(id); setActiveMonth(m); setActiveSvcModal(svc); setPayOpen(true); };
  const validatePayment = (id:string, svc:ServiceType, m:MonthKey, amt:number) => {
    setStudents(prev => prev.map(s => s.id===id ? { ...s, services: s.services.map(x => x.type===svc ? { ...x, payments: { ...x.payments, [m]: { paid: x.payments[m].paid + amt } } } : x) } : s));
  };
  const openReceipt = (s:Student, svc:ServiceType) => { setReceiptStudentId(s.id); setReceiptService(svc); setReceiptOpen(true); };
  const addStudent = (st:Student) => { setStudents(p=>[st,...p]); setAddOpen(false); };
  const handleLogout = () => { clearSession(); setSchoolNameState(getSchoolName()); setScreen('landing'); };
  const handleSchoolNameChange = (name: string) => { setSchoolName(name); setSchoolNameState(name); };

  const handleUniformSell = (item: UniformStockItem) => {
    setStockSales((v) => v + item.price);
    setStockToast(`+${item.price.toLocaleString('fr-FR')} FCFA — Tenue ${item.size} ajoutée à la caisse`);
    setTimeout(() => setStockToast(null), 3000);
  };

  const handleYearEnd = () => {
    setUniforms((prev) => prev.map((u) => ({ ...u, oldStock: uniformRemaining(u), newStock: 0, sold: 0 })));
    setBooks((prev) => prev.map((b) => ({ ...b, inStock: bookRemaining(b), sold: 0 })));
    setStockSales(0);
  };

  if (screen === 'admin') return <AdminPanel onExit={exitAdmin} />;
  if (screen === 'landing') return <LandingPage onEnter={() => setScreen('auth')} />;
  if (screen === 'auth') return <AuthPage onLogin={() => setScreen('dashboard')} onBack={() => setScreen('landing')} />;

  return (
    <div className="min-h-screen bg-canvas bg-grid">
      <Header query={query} onQuery={setQuery} resultCount={filtered.length} onLogout={handleLogout} />
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button onClick={()=>setView('cahier')} className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-700 transition ${view==='cahier'?'bg-royal-700 text-white shadow-sm':'text-slate-600 hover:bg-slate-100'}`}><LayoutGrid className="h-4 w-4"/>Cahier</button>
            <button onClick={()=>setView('stocks')} className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-700 transition ${view==='stocks'?'bg-royal-700 text-white shadow-sm':'text-slate-600 hover:bg-slate-100'}`}><Boxes className="h-4 w-4"/>Stocks</button>
            <button onClick={()=>setView('parametres')} className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-700 transition ${view==='parametres'?'bg-royal-700 text-white shadow-sm':'text-slate-600 hover:bg-slate-100'}`}><Settings2 className="h-4 w-4"/>Paramètres</button>
          </div>
          <button onClick={handleLogout} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-600 text-slate-600 transition hover:bg-slate-50 active:scale-95"><LogOut className="h-4 w-4"/>Déconnexion</button>
        </div>

        {view==='cahier' && (<>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-royal-700"><Sparkles className="h-3 w-3"/>Tableau de bord</div>
              <h1 className="font-display text-2xl font-700 tracking-tight text-ink sm:text-3xl">Le Cahier de Caisse</h1>
              <p className="mt-1 text-sm text-slate-500">Suivez et encaissez les frais de scolarité, cantine & transport.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex"><Filter className="h-4 w-4"/><span>{students.length} élève{students.length!==1?'s':''} · 2025 — 2026</span></div>
              <button onClick={()=>setAddOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 px-4 py-2.5 text-sm font-700 text-white shadow-gold transition hover:brightness-105 active:scale-95"><UserPlus className="h-4.5 w-4.5"/>Ajouter un élève</button>
            </div>
          </div>
          <FinancialHud totalCollected={totalCollected} outstanding={outstanding} recoveryRate={recoveryRate}/>
          <div className="mt-6">
            <div className="mb-3 flex items-center gap-2"><BookOpenText className="h-5 w-5 text-royal-700"/><h2 className="font-display text-lg font-700 text-ink">Cahier Interactif</h2>{students.length>0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-600 text-slate-500">{filtered.length} élève{filtered.length!==1?'s':''}</span>}</div>
            <CahierGrid students={filtered} activeService={activeService} onServiceChange={setActiveService} onCellClick={openCell} onWhatsApp={openReceipt} onAddClick={()=>setAddOpen(true)}/>
          </div>
        </>)}

        {view==='stocks' && <StocksView uniforms={uniforms} books={books} onUniformsChange={setUniforms} onBooksChange={setBooks} onUniformSell={handleUniformSell}/>}

        {view==='parametres' && <ConfigurationPanel pricing={pricing} onSave={setPricing} onReset={()=>setPricing(DEFAULT_PRICING)} schoolName={schoolName} onSchoolNameChange={handleSchoolNameChange} uniforms={uniforms} books={books} onYearEnd={handleYearEnd}/>}

        {stockToast && (
          <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 animate-fadeUp rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-700 text-emerald-700 shadow-cardLg">
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {stockToast}</span>
          </div>
        )}

        <footer className="mt-10 flex flex-col items-center gap-1 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
          <p className="font-600 text-slate-500">Scolaria — La référence premium de la gestion scolaire</p>
          <p>Afrique de l'Ouest · Conçu pour les intendances exigeantes</p>
          <button
            onClick={() => { window.location.hash = '/scolaria-admin'; setScreen('admin'); }}
            className="mt-3 inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-[10px] font-600 text-slate-300 transition hover:border-slate-200 hover:text-slate-500"
            title="Console super-admin"
          >
            <ShieldCheck className="h-3 w-3" /> admin
          </button>
        </footer>
      </main>

      <PaymentModal student={activeStudent} month={activeMonth} service={activeSvcModal} open={payOpen} onClose={()=>setPayOpen(false)} onValidate={validatePayment}/>
      <WhatsAppReceipt student={receiptStudent} open={receiptOpen} onClose={()=>setReceiptOpen(false)} schoolName={schoolName} initialService={receiptService} initialMonth={activeMonth}/>
      <AddStudentModal open={addOpen} onClose={()=>setAddOpen(false)} onAdd={addStudent} pricing={pricing}/>
    </div>
  );
}
