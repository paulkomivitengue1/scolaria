import { useEffect, useState } from 'react';
import { X, Pencil, FileText, PartyPopper, Utensils, Bus, Check, Layers, GraduationCap } from 'lucide-react';
import type { Student, FeeTypeDef, FeeConfigRow, FeeSubscription, TrancheDef } from '../types';
import { CLASS_LIST, formatFCFA, getFeeTotalForClass, FEE_TYPE_ICONS } from '../types';

interface Props {
  student: Student | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, updates: { firstName: string; lastName: string; className: string; parentName: string; parentPhone: string; fees: FeeSubscription[]; matricule: string; sexe: 'M' | 'F' }) => Promise<void>;
  feeTypes: FeeTypeDef[];
  feeConfig: FeeConfigRow[];
  tranches: TrancheDef[];
}

const FEE_ICONS: Record<string, typeof GraduationCap> = {
  GraduationCap, FileText, PartyPopper, Utensils, Bus, Layers,
};

interface FormState { firstName: string; lastName: string; className: string; parentName: string; parentPhone: string; matricule: string; sexe: 'M' | 'F'; }

export function EditStudentModal({ student, open, onClose, onSave, feeTypes, feeConfig, tranches }: Props) {
  const [form, setForm] = useState<FormState>({ firstName: '', lastName: '', className: '', parentName: '', parentPhone: '', matricule: '', sexe: 'M' });
  const [plans, setPlans] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && student) {
      setForm({
        firstName: student.firstName,
        lastName: student.lastName,
        className: student.className,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        matricule: student.matricule || '',
        sexe: student.sexe || 'M',
      });
      const initialPlans: Record<string, boolean> = {};
      feeTypes.forEach(f => {
        initialPlans[f.feeType] = student.fees.some(sf => sf.feeType === f.feeType);
      });
      setPlans(initialPlans);
    }
  }, [open, student, feeTypes]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!student) return null;

  const valid = form.firstName.trim() && form.lastName.trim() && form.className && form.parentName.trim() && form.parentPhone.trim() && form.sexe && Object.values(plans).some(Boolean);
  const selectedFeeTypes = feeTypes.filter(f => plans[f.feeType]);
  const totalForClass = (feeType: string) => form.className ? getFeeTotalForClass(feeConfig, feeType, form.className) : 0;
  const grandTotal = selectedFeeTypes.reduce((sum, f) => sum + totalForClass(f.feeType), 0);

  const submit = async () => {
    if (!valid || !student) return;
    setSubmitting(true);
    try {
      const existingFees = new Map(student.fees.map(f => [f.feeType, f]));
      const fees: FeeSubscription[] = selectedFeeTypes.map(f => {
        const existing = existingFees.get(f.feeType);
        const totalExpected = totalForClass(f.feeType);
        if (existing) {
          return { ...existing, totalExpected };
        }
        const payments: Record<string, { paid: number }> = f.paymentMode === 'tranche'
          ? Object.fromEntries(tranches.map(t => [t.index, { paid: 0 }]))
          : { single: { paid: 0 } };
        return { feeType: f.feeType, paymentMode: f.paymentMode, payments, totalExpected };
      });
      await onSave(student.id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        className: form.className.trim(),
        parentName: form.parentName.trim(),
        parentPhone: form.parentPhone.trim(),
        matricule: form.matricule.trim(),
        sexe: form.sexe,
        fees,
      });
      onClose();
    } catch {
      // error handled in parent
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-ink outline-none transition focus:border-royal-400 focus:ring-4';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity .22s ease' }}>
      <div className="modal-backdrop is-open" onClick={onClose} style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity .22s ease' }} aria-hidden="true" />
      <div className={`modal-panel relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2.5xl bg-white shadow-2xl transition sm:rounded-2.5xl ${open ? 'animate-slideUp' : 'opacity-0'}`}>
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-royal-700 to-royal-900 px-5 py-4 text-white">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,rgba(255,255,255,.18) 1px,transparent 0)', backgroundSize: '18px 18px' }} />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><Pencil className="h-5 w-5 text-gold-300" /></span><div><h2 className="font-display text-base font-700 leading-tight">Modifier l'élève</h2><p className="text-xs text-royal-100">{student.firstName} {student.lastName}</p></div></div>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 transition hover:bg-white/20 active:scale-95"><X className="h-4.5 w-4.5" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Prénom" span={2}><input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="Awa" className={inputCls} /></Field>
            <Field label="Nom" span={1}><input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Diallo" className={inputCls} /></Field>
          </div>
          <Field label="Classe"><select value={form.className} onChange={e => setForm({ ...form, className: e.target.value })} className={`${inputCls} cursor-pointer`}><option value="">Sélectionner…</option>{CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}</select></Field>
          <Field label="Nom du parent"><input value={form.parentName} onChange={e => setForm({ ...form, parentName: e.target.value })} placeholder="Mme Fatou Diallo" className={inputCls} /></Field>
          <Field label="WhatsApp du parent"><input value={form.parentPhone} onChange={e => setForm({ ...form, parentPhone: e.target.value })} placeholder="+221 77 123 45 67" className={inputCls} /></Field>

          <Field label="Matricule"><input value={form.matricule} onChange={e => setForm({ ...form, matricule: e.target.value })} placeholder="ECOLE-2026-001" className={inputCls} /></Field>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-600 text-slate-500">Sexe</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm({ ...form, sexe: 'M' })} className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 text-sm font-700 transition ${form.sexe === 'M' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}><span className="text-base leading-none">♂</span>Garçon</button>
              <button type="button" onClick={() => setForm({ ...form, sexe: 'F' })} className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 text-sm font-700 transition ${form.sexe === 'F' ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}><span className="text-base leading-none">♀</span>Fille</button>
            </div>
          </div>

          <h3 className="mb-2 mt-5 text-xs font-700 uppercase tracking-wider text-slate-500">Frais souscrits</h3>
          <div className="space-y-2">
            {feeTypes.map(ft => {
              const iconName = FEE_TYPE_ICONS[ft.feeType] ?? 'FileText';
              const Icon = FEE_ICONS[iconName] ?? FileText;
              const checked = plans[ft.feeType] ?? false;
              const price = totalForClass(ft.feeType);
              return (
                <button key={ft.feeType} type="button" onClick={() => setPlans(p => ({ ...p, [ft.feeType]: !p[ft.feeType] }))} className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${checked ? 'border-royal-400 bg-royal-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition ${checked ? 'border-royal-700 bg-royal-700' : 'border-slate-200 bg-white'}`}>{checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}</span>
                  <Icon className={`h-4.5 w-4.5 ${checked ? 'text-royal-700' : 'text-slate-400'}`} />
                  <span className="flex-1">
                    <span className="block text-sm font-700 text-ink">{ft.label}</span>
                    <span className="block text-xs text-slate-500">{form.className ? `${formatFCFA(price)} ${ft.paymentMode === 'tranche' ? `· ${tranches.length} tranches` : '· paiement unique'}` : 'Sélectionnez une classe pour le tarif'}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className={`mt-4 rounded-xl px-4 py-3 transition ${form.className ? 'bg-royal-50' : 'bg-slate-50'}`}>
            <div className="flex items-center justify-between border-t pt-1" style={{ borderColor: 'rgba(188,211,255,.4)' }}>
              <span className="text-xs font-600 text-slate-500">Total dû</span>
              <span className="font-display text-lg font-700 text-gold-600">{formatFCFA(grandTotal)}</span>
            </div>
          </div>
        </div>
        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3"><div className="flex gap-2">
          <button onClick={onClose} className="flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-600 text-slate-600 transition hover:bg-slate-50 active:scale-95">Annuler</button>
          <button onClick={submit} disabled={!valid || submitting} className="flex h-11 flex-[1.6] items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-royal-700 to-royal-900 text-sm font-700 text-white shadow-cardLg transition hover:brightness-110 active:scale-95 disabled:opacity-40">{submitting ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Enregistrement…</> : <><Check className="h-4 w-4" strokeWidth={3} />Enregistrer</>}</button>
        </div></div>
      </div>
    </div>
  );
}

function Field({ label, children, span = 3 }: { label: string; children: React.ReactNode; span?: 1 | 2 | 3; }) {
  return <div className="mt-3" style={{ gridColumn: `span ${span}` }}><label className="mb-1 block text-xs font-600 text-slate-500">{label}</label>{children}</div>;
}
