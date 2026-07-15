export type PaymentStatus = 'paid' | 'partial' | 'unpaid';
export type MonthKey = 'oct'|'nov'|'dec'|'jan'|'fev'|'mar'|'avr'|'mai'|'jun';
export type ServiceType = 'scolarite'|'cantine'|'transport';

export interface TrancheDef { id: 1|2|3; label: string; months: MonthKey[]; }
export interface MonthPayment { paid: number; }
export interface ServiceSubscription { type: ServiceType; annualFee: number; payments: Record<MonthKey, MonthPayment>; }
export interface Student { id: string; lastName: string; firstName: string; className: string; parentName: string; parentPhone: string; services: ServiceSubscription[]; }

export const TRANCHES: TrancheDef[] = [
  { id: 1, label: 'Tranche 1', months: ['oct','nov','dec'] },
  { id: 2, label: 'Tranche 2', months: ['jan','fev','mar'] },
  { id: 3, label: 'Tranche 3', months: ['avr','mai','jun'] },
];
export const MONTH_LABELS: Record<MonthKey,string> = { oct:'Octobre',nov:'Novembre',dec:'Décembre',jan:'Janvier',fev:'Février',mar:'Mars',avr:'Avril',mai:'Mai',jun:'Juin' };
export const MONTH_SHORT: Record<MonthKey,string>  = { oct:'Oct.',nov:'Nov.',dec:'Déc.',jan:'Jan.',fev:'Fév.',mar:'Mar.',avr:'Avr.',mai:'Mai',jun:'Juin' };
export const ALL_MONTHS: MonthKey[] = ['oct','nov','dec','jan','fev','mar','avr','mai','jun'];
export const NUM_MONTHS = 9;

export interface ServiceDef { type: ServiceType; label: string; shortLabel: string; accent: string; icon: 'GraduationCap'|'Utensils'|'Bus'; }
export const SERVICES: ServiceDef[] = [
  { type:'scolarite', label:'Scolarité',  shortLabel:'Scol.',   accent:'royal',   icon:'GraduationCap' },
  { type:'cantine',   label:'Cantine',    shortLabel:'Cantine', accent:'gold',    icon:'Utensils' },
  { type:'transport', label:'Transport',  shortLabel:'Transp.', accent:'emerald', icon:'Bus' },
];
export const SERVICE_MAP: Record<ServiceType,ServiceDef> = SERVICES.reduce((a,s) => ({...a,[s.type]:s}), {} as Record<ServiceType,ServiceDef>);

export const CLASS_LIST = ['Jardin','1ère année','2ème année','3ème année','4ème année','5ème année','6ème année','7ème année','8ème année','9ème année'];
export type ClassPricing = Record<ServiceType,number>;
export type PricingConfig = Record<string,ClassPricing>;

export const formatFCFA = (n:number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
export const formatFCFAShort = (n:number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));
export const monthlyShare = (annualFee:number) => annualFee / NUM_MONTHS;
export const monthRemaining = (paid:number, fee:number) => Math.max(0, fee - paid);
export function emptyPayments(): Record<MonthKey,MonthPayment> {
  return ALL_MONTHS.reduce((a,m) => ({...a,[m]:{paid:0}}), {} as Record<MonthKey,MonthPayment>);
}
export function cellStatus(paid:number, fee:number): PaymentStatus {
  if (paid >= fee - 0.5) return 'paid';
  if (paid > 0) return 'partial';
  return 'unpaid';
}
export function serviceOutstanding(svc:ServiceSubscription) { return Math.max(0, svc.annualFee - ALL_MONTHS.reduce((s,m) => s + svc.payments[m].paid, 0)); }
export function studentOutstanding(s:Student) { return s.services.reduce((sum,svc) => sum + serviceOutstanding(svc), 0); }
export function studentExpected(s:Student) { return s.services.reduce((sum,svc) => sum + svc.annualFee, 0); }
export function studentCollected(s:Student) { return s.services.reduce((sum,svc) => sum + ALL_MONTHS.reduce((m,k) => m + svc.payments[k].paid, 0), 0); }
export function monthlyTotalFor(cls:string, sel:ServiceType[], p:PricingConfig) {
  const cp = p[cls]; if (!cp) return 0;
  return sel.reduce((sum,t) => sum + monthlyShare(cp[t] ?? 0), 0);
}
export function annualTotalFor(cls:string, sel:ServiceType[], p:PricingConfig) {
  const cp = p[cls]; if (!cp) return 0;
  return sel.reduce((sum,t) => sum + (cp[t] ?? 0), 0);
}
