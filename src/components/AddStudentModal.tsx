import { useEffect, useState } from 'react';
import { X, UserPlus, GraduationCap, FileText, PartyPopper, Utensils, Bus, Check, Layers, Settings2, AlertCircle } from 'lucide-react';
import type { Student, FeeTypeDef, FeeConfigRow, FeeSubscription, TrancheDef } from '../types';
import { formatFCFA, getFeeTotalForClass, FEE_TYPE_ICONS, emptyTranchePayments, emptySinglePayment } from '../types';

interface AddStudentModalProps {
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onAdd: (s: Student) => void | Promise<void>;
  errorMessage?: string | null;
  onClearError?: () => void;
  feeTypes: FeeTypeDef[];
  feeConfig: FeeConfigRow[];
  tranches: TrancheDef[];
  schoolName: string;
  schoolId: string;
  classNames: string[];
  onGenerateMatricule: (schoolId: string, schoolName: string) => Promise<string>;
}

const FEE_ICONS: Record<string, typeof GraduationCap> = {
  GraduationCap, FileText, PartyPopper, Utensils, Bus, Layers,
};

interface FormState { firstName: string; lastName: string; className: string; parentName: string; parentPhone: string; birthDate: string; birthPlace: string; matricule: string; sexe: 'M' | 'F'; }
const EMPTY_FORM: FormState = { firstName: '', lastName: '', className: '', parentName: '', parentPhone: '', birthDate: '', birthPlace: '', matricule: '', sexe: 'M' };

export function AddStudentModal({ open, onClose, onOpenSettings, onAdd, errorMessage, onClearError, feeTypes, feeConfig, tranches, schoolName, schoolId, classNames, onGenerateMatricule }: AddStudentModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [plans, setPlans] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    onClearError?.();
    setForm(current => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    if (open) {
      const initialPlans: Record<string, boolean> = {};
      feeTypes.forEach(f => { initialPlans[f.feeType] = f.feeType === 'scolarite'; });
      setPlans(initialPlans);
      setForm(EMPTY_FORM);
      setSubmitting(false);
      // Auto-generate matricule
      onGenerateMatricule(schoolId, schoolName).then(m => {
        setForm(f => ({ ...f, matricule: m }));
      }).catch(() => {});
    }
  }, [open, feeTypes, schoolId, schoolName]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => { if (open) setForm(EMPTY_FORM); }, [open]);

  const valid = form.firstName.trim() && form.lastName.trim() && form.className && form.sexe && Object.values(plans).some(Boolean);
  const selectedFeeTypes = feeTypes.filter(f => plans[f.feeType]);

  const totalForClass = (feeType: string) => form.className ? getFeeTotalForClass(feeConfig, feeType, form.className) : 0;
  const grandTotal = selectedFeeTypes.reduce((sum, f) => sum + totalForClass(f.feeType), 0);
  const hasConfiguredFees = !!form.className && feeTypes.some(f => totalForClass(f.feeType) > 0);

  const submit = async () => {
    if (!valid || submitting) return;
    const fees: FeeSubscription[] = selectedFeeTypes.map(f => {
      const totalExpected = totalForClass(f.feeType);
      const payments: Record<string, { paid: number }> = f.paymentMode === 'tranche'
        ? emptyTranchePayments(tranches.length)
        : emptySinglePayment();
      return { feeType: f.feeType, paymentMode: f.paymentMode, payments, totalExpected };
    });
    setSubmitting(true);
    try {
      await onAdd({
        id: `stu-${Date.now()}`,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        className: form.className.trim(),
        parentName: form.parentName.trim(),
        parentPhone: form.parentPhone.trim(),
        birthDate: form.birthDate,
        birthPlace: form.birthPlace.trim(),
        matricule: form.matricule.trim(),
        sexe: form.sexe,
        fees,
      });
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
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><UserPlus className="h-5 w-5 text-gold-300" /></span><div><h2 className="font-display text-base font-700 leading-tight">Ajouter un élève</h2><p className="text-xs text-royal-100">Inscription & calcul automatique des tarifs</p></div></div>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 transition hover:bg-white/20 active:scale-95"><X className="h-4.5 w-4.5" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {errorMessage && <div role="alert" aria-live="polite" className="mb-4 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
            <div><p className="font-extrabold">Inscription impossible</p><p className="mt-1 leading-5">{errorMessage}</p></div>
          </div>}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Prénom" span={2}><input value={form.firstName} onChange={e => updateField('firstName', e.target.value)} placeholder="Awa" className={inputCls} /></Field>
            <Field label="Nom" span={1}><input value={form.lastName} onChange={e => updateField('lastName', e.target.value)} placeholder="Diallo" className={inputCls} /></Field>
          </div>
          <Field label="Classe"><select value={form.className} onChange={e => updateField('className', e.target.value)} className={`${inputCls} cursor-pointer`}><option value="">Sélectionner…</option>{classNames.map(c => <option key={c} value={c}>{c}</option>)}</select></Field>
          {classNames.length === 0 && <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3"><div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" /><div className="min-w-0"><p className="text-sm font-extrabold text-amber-950">Aucune classe n’est encore configurée</p><p className="mt-1 text-xs leading-5 text-amber-900">Avant l’inscription, créez au moins une classe et configurez les frais de scolarité dans les paramètres.</p><button type="button" onClick={() => { onClose(); onOpenSettings(); }} className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-400"><Settings2 className="h-4 w-4" /> Configurer mon école</button></div></div></div>}
          {form.className && !hasConfiguredFees && <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3"><div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" /><div><p className="text-sm font-extrabold text-amber-950">Scolarité non configurée pour cette classe</p><p className="mt-1 text-xs leading-5 text-amber-900">L’inscription reste possible, mais le montant dû sera à zéro tant que les frais ne sont pas renseignés. Configurez les frais par classe dans Paramètres.</p><button type="button" onClick={() => { onClose(); onOpenSettings(); }} className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-400"><Settings2 className="h-4 w-4" /> Configurer la scolarité</button></div></div></div>}
          <Field label="Nom du parent"><input value={form.parentName} onChange={e => updateField('parentName', e.target.value)} placeholder="Mme Fatou Diallo" className={inputCls} /></Field>
          <Field label="WhatsApp du parent"><input value={form.parentPhone} onChange={e => updateField('parentPhone', e.target.value)} placeholder="+221 77 123 45 67" className={inputCls} /></Field>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Date de naissance (facultatif)"><input type="date" value={form.birthDate} onChange={e => updateField('birthDate', e.target.value)} className={inputCls} /></Field>
            <Field label="Lieu de naissance (facultatif)"><input value={form.birthPlace} onChange={e => updateField('birthPlace', e.target.value)} placeholder="Bamako" className={inputCls} /></Field>
          </div>

          <Field label="Matricule"><input value={form.matricule} onChange={e => updateField('matricule', e.target.value)} placeholder="ECOLE-2026-001" className={inputCls} /></Field>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-600 text-slate-500">Sexe</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => updateField('sexe', 'M')} className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 text-sm font-700 transition ${form.sexe === 'M' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}><span className="text-base leading-none">♂</span>Garçon</button>
              <button type="button" onClick={() => updateField('sexe', 'F')} className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 text-sm font-700 transition ${form.sexe === 'F' ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}><span className="text-base leading-none">♀</span>Fille</button>
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
          <button onClick={submit} disabled={!valid || submitting} className="flex h-11 flex-[1.6] items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 text-sm font-700 text-white shadow-gold transition hover:brightness-105 active:scale-95 disabled:opacity-40"><Check className="h-4 w-4" strokeWidth={3} />{submitting ? 'Enregistrement…' : "Inscrire l'élève"}</button>
        </div></div>
      </div>
    </div>
  );
}

function Field({ label, children, span = 3 }: { label: string; children: React.ReactNode; span?: 1 | 2 | 3; }) {
  return <div className="mt-3" style={{ gridColumn: `span ${span}` }}><label className="mb-1 block text-xs font-600 text-slate-500">{label}</label>{children}</div>;
}
