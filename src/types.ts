export type AppView = 'dashboard' | 'cahier' | 'classes' | 'bulletins' | 'stocks' | 'impayes' | 'depenses' | 'parametres';

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

// ── Tranches (per-school configurable) ─────────────────
export interface TrancheDef {
  index: number;       // 1-based
  label: string;       // e.g. "Tranche 1", "Premier versement"
}

// ── Fee types (per-school configurable) ────────────────
export type FeePaymentMode = 'tranche' | 'single';

export interface FeeTypeDef {
  feeType: string;          // 'scolarite', 'inscription', 'frais de fête', ...
  label: string;            // display label (same as feeType by default)
  paymentMode: FeePaymentMode;
  isDefault: boolean;       // true for built-in types (scolarite, cantine, transport, inscription, frais de fête)
}

// ── Fee configuration: amount per class per tranche ─────
// For tranche-based fees: one row per (feeType, className, trancheIndex)
// For single-payment fees: one row per (feeType, className), trancheIndex = null
export interface FeeConfigRow {
  feeType: string;
  className: string;
  paymentMode: FeePaymentMode;
  trancheIndex: number | null;
  amount: number;
}

// Grouped structure for UI: { feeType → { className → { trancheIndex → amount } } }
export type FeeAmountMap = Record<string, Record<string, Record<number | 'single', number>>>;

// ── Student & payments ─────────────────────────────────
export interface TranchePayment { paid: number; }
export interface FeeSubscription {
  feeType: string;
  paymentMode: FeePaymentMode;
  // For tranche-based: { 1: {paid: 0}, 2: {paid: 0}, ... }
  // For single: { single: {paid: 0} }
  payments: Record<string, TranchePayment>;
  // Total expected amount for this fee (sum of all tranche amounts or single amount)
  totalExpected: number;
}
export interface Student {
  id: string;
  lastName: string;
  firstName: string;
  className: string;
  parentName: string;
  parentPhone: string;
  fees: FeeSubscription[];
}

// ── School config (loaded from DB) ─────────────────────
export interface SchoolFeeConfig {
  tranches: TrancheDef[];
  feeTypes: FeeTypeDef[];
  feeConfig: FeeConfigRow[];   // flat rows from DB
}

// ── Legacy types kept for backward compatibility ───────
export type MonthKey = 'oct'|'nov'|'dec'|'jan'|'fev'|'mar'|'avr'|'mai'|'jun';
export type ServiceType = 'scolarite'|'cantine'|'transport';

export const MONTH_LABELS: Record<MonthKey,string> = { oct:'Octobre',nov:'Novembre',dec:'Décembre',jan:'Janvier',fev:'Février',mar:'Mars',avr:'Avril',mai:'Mai',jun:'Juin' };
export const MONTH_SHORT: Record<MonthKey,string>  = { oct:'Oct.',nov:'Nov.',dec:'Déc.',jan:'Jan.',fev:'Fév.',mar:'Mar.',avr:'Avr.',mai:'Mai',jun:'Juin' };
export const ALL_MONTHS: MonthKey[] = ['oct','nov','dec','jan','fev','mar','avr','mai','jun'];
export const NUM_MONTHS = 9;

// Legacy: kept for backward compat with code that still references these
export const TRANCHES: { id: 1|2|3; label: string; months: MonthKey[] }[] = [
  { id: 1, label: 'Tranche 1', months: ['oct','nov','dec'] },
  { id: 2, label: 'Tranche 2', months: ['jan','fev','mar'] },
  { id: 3, label: 'Tranche 3', months: ['avr','mai','jun'] },
];

// Default fee types seeded for new and existing schools
export const DEFAULT_FEE_TYPES: FeeTypeDef[] = [
  { feeType: 'scolarite',     label: 'Scolarité',    paymentMode: 'tranche', isDefault: true },
  { feeType: 'inscription',   label: 'Inscription',  paymentMode: 'single',  isDefault: true },
  { feeType: 'frais de fête', label: 'Frais de fête',paymentMode: 'single',  isDefault: true },
  { feeType: 'cantine',       label: 'Cantine',      paymentMode: 'tranche', isDefault: true },
  { feeType: 'transport',     label: 'Transport',    paymentMode: 'tranche', isDefault: true },
];

// Icon mapping for known fee types
export const FEE_TYPE_ICONS: Record<string, string> = {
  'scolarite': 'GraduationCap',
  'inscription': 'FileText',
  'frais de fête': 'PartyPopper',
  'cantine': 'Utensils',
  'transport': 'Bus',
};

// Accent colors for known fee types
export const FEE_TYPE_ACCENTS: Record<string, { wrap: string; text: string; dot: string }> = {
  'scolarite':     { wrap: 'bg-royal-50',    text: 'text-royal-700',    dot: 'bg-royal-700' },
  'inscription':   { wrap: 'bg-teal-50',     text: 'text-teal-700',     dot: 'bg-teal-600' },
  'frais de fête': { wrap: 'bg-pink-50',     text: 'text-pink-600',     dot: 'bg-pink-500' },
  'cantine':       { wrap: 'bg-gold-50',     text: 'text-gold-600',     dot: 'bg-gold-500' },
  'transport':     { wrap: 'bg-emerald-50',  text: 'text-emerald-600',  dot: 'bg-emerald-600' },
};

export const getFeeAccent = (feeType: string): { wrap: string; text: string; dot: string } =>
  FEE_TYPE_ACCENTS[feeType] ?? { wrap: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-500' };

// ── Classes ────────────────────────────────────────────
export const CLASS_LIST = ['Jardin','1ère année','2ème année','3ème année','4ème année','5ème année','6ème année','7ème année','8ème année','9ème année'];

// ── Legacy pricing types (kept for backward compat) ────
export type ClassPricing = Record<ServiceType,number>;
export type PricingConfig = Record<string,ClassPricing>;

// ── Formatting helpers ─────────────────────────────────
export const formatFCFA = (n:number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
export const formatFCFAShort = (n:number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));

// ── Fee calculation helpers ────────────────────────────
export const feeTotalExpected = (fee: FeeSubscription) => fee.totalExpected;
export const feeCollected = (fee: FeeSubscription) =>
  Object.values(fee.payments).reduce((s, p) => s + p.paid, 0);
export const feeOutstanding = (fee: FeeSubscription) =>
  Math.max(0, feeTotalExpected(fee) - feeCollected(fee));

export const studentExpected = (s: Student) =>
  s.fees.reduce((sum, f) => sum + feeTotalExpected(f), 0);
export const studentCollected = (s: Student) =>
  s.fees.reduce((sum, f) => sum + feeCollected(f), 0);
export const studentOutstanding = (s: Student) =>
  s.fees.reduce((sum, f) => sum + feeOutstanding(f), 0);

export function cellStatus(paid: number, expected: number): PaymentStatus {
  if (paid >= expected - 0.5) return 'paid';
  if (paid > 0) return 'partial';
  return 'unpaid';
}

export function emptyTranchePayments(trancheCount: number): Record<string, TranchePayment> {
  const m: Record<string, TranchePayment> = {};
  for (let i = 1; i <= trancheCount; i++) m[i] = { paid: 0 };
  return m;
}

export function emptySinglePayment(): Record<string, TranchePayment> {
  return { single: { paid: 0 } };
}

// Get the amount for a specific fee type / class / tranche from the config
export function getFeeAmount(
  feeConfig: FeeConfigRow[],
  feeType: string,
  className: string,
  trancheIndex: number | null
): number {
  const row = feeConfig.find(
    r => r.feeType === feeType && r.className === className && r.trancheIndex === trancheIndex
  );
  return row?.amount ?? 0;
}

// Get total expected for a fee type / class (sum all tranches or single amount)
export function getFeeTotalForClass(
  feeConfig: FeeConfigRow[],
  feeType: string,
  className: string
): number {
  return feeConfig
    .filter(r => r.feeType === feeType && r.className === className)
    .reduce((sum, r) => sum + r.amount, 0);
}

// ── Legacy helpers (kept for backward compat) ──────────
export const monthlyShare = (annualFee: number) => annualFee / NUM_MONTHS;
export const monthRemaining = (paid: number, fee: number) => Math.max(0, fee - paid);
export function emptyPayments(): Record<MonthKey, { paid: number }> {
  return ALL_MONTHS.reduce((a, m) => ({ ...a, [m]: { paid: 0 } }), {} as Record<MonthKey, { paid: number }>);
}
export function serviceOutstanding(svc: { annualFee: number; payments: Record<string, { paid: number }> }) {
  return Math.max(0, svc.annualFee - Object.values(svc.payments).reduce((s, p) => s + p.paid, 0));
}
export function monthlyTotalFor(cls: string, sel: ServiceType[], p: PricingConfig) {
  const cp = p[cls]; if (!cp) return 0;
  return sel.reduce((sum, t) => sum + monthlyShare(cp[t] ?? 0), 0);
}
export function annualTotalFor(cls: string, sel: ServiceType[], p: PricingConfig) {
  const cp = p[cls]; if (!cp) return 0;
  return sel.reduce((sum, t) => sum + (cp[t] ?? 0), 0);
}
export interface ServiceDef { type: ServiceType; label: string; shortLabel: string; accent: string; icon: 'GraduationCap'|'Utensils'|'Bus'; }
export const SERVICES: ServiceDef[] = [
  { type:'scolarite', label:'Scolarité',  shortLabel:'Scol.',   accent:'royal',   icon:'GraduationCap' },
  { type:'cantine',   label:'Cantine',    shortLabel:'Cantine', accent:'gold',    icon:'Utensils' },
  { type:'transport', label:'Transport',  shortLabel:'Transp.', accent:'emerald', icon:'Bus' },
];
export const SERVICE_MAP: Record<ServiceType,ServiceDef> = SERVICES.reduce((a,s) => ({...a,[s.type]:s}), {} as Record<ServiceType,ServiceDef>);

/* ---- Stock management ---- */
export type UniformCycle = 'maternelle' | 'cycle1' | 'cycle2';
export type UniformSize = '4'|'6'|'8'|'10'|'12'|'S'|'M'|'L'|'XL';
export const UNIFORM_CYCLES: { id: UniformCycle; label: string }[] = [
  { id: 'maternelle', label: 'Maternelle / Jardin' },
  { id: 'cycle1', label: '1er Cycle' },
  { id: 'cycle2', label: '2nd Cycle' },
];
export const UNIFORM_SIZES: UniformSize[] = ['4','6','8','10','12','S','M','L','XL'];

export interface UniformStockItem {
  id: string;
  cycle: UniformCycle;
  size: UniformSize;
  oldStock: number;
  newStock: number;
  sold: number;
  price: number;
}
export type UniformStockMap = Record<string, UniformStockItem>;

export const uniformAvailable = (i: UniformStockItem) => i.oldStock + i.newStock - i.sold;
export const uniformRemaining = (i: UniformStockItem) => Math.max(0, uniformAvailable(i));

export type BookClass = 'Jardin'|'1ère année'|'2ème année'|'3ème année'|'4ème année'|'5ème année'|'6ème année'|'7ème année'|'8ème année'|'9ème année';
export const BOOK_CLASSES: BookClass[] = ['Jardin','1ère année','2ème année','3ème année','4ème année','5ème année','6ème année','7ème année','8ème année','9ème année'];
export const BOOK_SUBJECTS = ['Lecture','Calcul','Écriture','Dictée','Grammaire','Conjugaison','Histoire-Géo','Sciences','Anglais','EPS'] as const;
export type BookSubject = typeof BOOK_SUBJECTS[number];

export interface BookStockItem {
  id: string;
  className: BookClass;
  subject: BookSubject;
  inStock: number;
  sold: number;
}
export type BookStockMap = Record<string, BookStockItem>;

export const bookRemaining = (b: BookStockItem) => Math.max(0, b.inStock - b.sold);

/* ---- Report cards (bulletins) ---- */
export interface GradePeriod {
  index: number;
  label: string;
}

export interface GradeRow {
  id: string;
  subject: string;
  score: number;
  maxScore: number;
  coefficient: number;
}

export interface ReportCard {
  id: string;
  studentId: string;
  periodIndex: number;
  periodLabel: string;
  academicYear: string;
  status: 'draft' | 'finalized';
  appreciation: string;
  grades: GradeRow[];
  updatedAt: string;
}

export const DEFAULT_SUBJECTS = [
  'Lecture', 'Calcul', 'Écriture', 'Dictée', 'Grammaire', 'Conjugaison',
  'Histoire-Géo', 'Sciences', 'Anglais', 'EPS', 'Dessin', 'Récitation',
];

export const gradePercentage = (g: GradeRow) =>
  g.maxScore > 0 ? (g.score / g.maxScore) * 100 : 0;

export const gradeAverage = (grades: GradeRow[]): number => {
  const valid = grades.filter(g => g.maxScore > 0 && g.coefficient > 0);
  if (valid.length === 0) return 0;
  const weightedSum = valid.reduce((s, g) =>
    s + (g.score / g.maxScore) * 20 * g.coefficient, 0
  );
  const totalCoeff = valid.reduce((s, g) => s + g.coefficient, 0);
  return totalCoeff > 0 ? weightedSum / totalCoeff : 0;
};

export const gradeAppreciation = (avg: number): string => {
  if (avg >= 16) return 'Excellent';
  if (avg >= 14) return 'Très bien';
  if (avg >= 12) return 'Bien';
  if (avg >= 10) return 'Assez bien';
  if (avg >= 8) return 'Passable';
  return 'Insuffisant';
};

export const gradeColor = (avg: number): string => {
  if (avg >= 14) return 'text-emerald-600';
  if (avg >= 12) return 'text-teal-600';
  if (avg >= 10) return 'text-gold-600';
  if (avg >= 8) return 'text-orange-600';
  return 'text-red-600';
};

/* ---- Dépenses ---- */
export type ExpenseCategory = 'salaire' | 'fournitures' | 'entretien' | 'autre';

export const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string }[] = [
  { id: 'salaire', label: 'Salaires' },
  { id: 'fournitures', label: 'Fournitures' },
  { id: 'entretien', label: 'Entretien' },
  { id: 'autre', label: 'Autre' },
];

export interface Expense {
  id: string;
  label: string;
  amount: number;
  category: ExpenseCategory;
  expenseDate: string; // format ISO 'YYYY-MM-DD'
  }
