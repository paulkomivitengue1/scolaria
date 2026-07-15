import { useEffect, useState } from 'react';
import { X, UserPlus, GraduationCap, Utensils, Bus, Check } from 'lucide-react';
import type { ServiceType, Student, PricingConfig } from '../types';
import { SERVICES, CLASS_LIST, emptyPayments, formatFCFA, monthlyTotalFor, annualTotalFor, NUM_MONTHS, monthlyShare } from '../types';

interface AddStudentModalProps { open: boolean; onClose: ()=>void; onAdd:(s:Student)=>void; pricing: PricingConfig; }
const SERVICE_ICONS = { GraduationCap, Utensils, Bus };
interface FormState { firstName: string; lastName: string; className: string; parentName: string; parentPhone: string; }
const EMPTY_FORM: FormState = { firstName:'', lastName:'', className:'', parentName:'', parentPhone:'' };

export function AddStudentModal({ open, onClose, onAdd, pricing }: AddStudentModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [plans, setPlans] = useState<Record<ServiceType,boolean>>({ scolarite:true, cantine:false, transport:false });
  useEffect(() => { if (!open) return; const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [open, onClose]);
  useEffect(() => { if (open) { setForm(EMPTY_FORM); setPlans({ scolarite:true, cantine:false, transport:false }); } }, [open]);
  const valid = form.firstName.trim() && form.lastName.trim() && form.className && form.parentName.trim() && form.parentPhone.trim() && Object.values(plans).some(Boolean);
  const selected = SERVICES.filter(s=>plans[s.type]).map(s=>s.type);
  const totalMonthly = form.className ? monthlyTotalFor(form.className, selected, pricing) : 0;
  const totalAnnual = form.className ? annualTotalFor(form.className, selected, pricing) : 0;
  const submit = () => { if (!valid) return; const cp = pricing[form.className]; onAdd({ id:`stu-${Date.now()}`, firstName:form.firstName.trim(), lastName:form.lastName.trim(), className:form.className.trim(), parentName:form.parentName.trim(), parentPhone:form.parentPhone.trim(), services: SERVICES.filter(s=>plans[s.type]).map(s=>({ type:s.type, annualFee:cp?.[s.type]??0, payments:emptyPayments() })) }); };
  const inputCls = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-ink outline-none transition focus:border-royal-400 focus:ring-4';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" style={{ opacity: open?1:0, pointerEvents: open?'auto':'none', transition:'opacity .22s ease' }}>
      <div className="modal-backdrop is-open" onClick={onClose} style={{ opacity: open?1:0, pointerEvents: open?'auto':'none', transition:'opacity .22s ease' }} aria-hidden="true"/>
      <div className={`modal-panel relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2.5xl bg-white shadow-2xl transition sm:rounded-2.5xl ${open?'animate-slideUp':'opacity-0'}`}>
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-royal-700 to-royal-900 px-5 py-4 text-white">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage:'radial-gradient(circle at 1px 1px,rgba(255,255,255,.18) 1px,transparent 0)', backgroundSize:'18px 18px' }}/>
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><UserPlus className="h-5 w-5 text-gold-300"/></span><div><h2 className="font-display text-base font-700 leading-tight">Ajouter un élève</h2><p className="text-xs text-royal-100">Inscription & calcul automatique des tarifs</p></div></div>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 transition hover:bg-white/20 active:scale-95"><X className="h-4.5 w-4.5"/></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Prénom" span={2}><input value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} placeholder="Awa" className={inputCls}/></Field>
            <Field label="Nom" span={1}><input value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} placeholder="Diallo" className={inputCls}/></Field>
          </div>
          <Field label="Classe"><select value={form.className} onChange={e=>setForm({...form,className:e.target.value})} className={`${inputCls} cursor-pointer`}><option value="">Sélectionner…</option>{CLASS_LIST.map(c=><option key={c} value={c}>{c}</option>)}</select></Field>
          <Field label="Nom du parent"><input value={form.parentName} onChange={e=>setForm({...form,parentName:e.target.value})} placeholder="Mme Fatou Diallo" className={inputCls}/></Field>
          <Field label="WhatsApp du parent"><input value={form.parentPhone} onChange={e=>setForm({...form,parentPhone:e.target.value})} placeholder="+221 77 123 45 67" className={inputCls}/></Field>
          <h3 className="mb-2 mt-5 text-xs font-700 uppercase tracking-wider text-slate-500">Services souscrits</h3>
          <div className="space-y-2">{SERVICES.map(svc=>{const Icon=SERVICE_ICONS[svc.icon];const checked=plans[svc.type];const price=form.className?pricing[form.className]?.[svc.type]??0:0;return(
            <button key={svc.type} type="button" onClick={()=>setPlans(p=>({...p,[svc.type]:!p[svc.type]}))} className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${checked?'border-royal-400 bg-royal-50':'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition ${checked?'border-royal-700 bg-royal-700':'border-slate-200 bg-white'}`}>{checked&&<Check className="h-3.5 w-3.5 text-white" strokeWidth={3}/>}</span>
              <Icon className={`h-4.5 w-4.5 ${checked?'text-royal-700':'text-slate-400'}`}/>
              <span className="flex-1"><span className="block text-sm font-700 text-ink">{svc.label}</span><span className="block text-xs text-slate-500">{form.className?`${formatFCFA(Math.round(monthlyShare(price)))} / mois · ${NUM_MONTHS} mensualités`:'Sélectionnez une classe pour le tarif'}</span></span>
            </button>);})}</div>
          <div className={`mt-4 rounded-xl px-4 py-3 transition ${form.className?'bg-royal-50':'bg-slate-50'}`}>
            <div className="flex items-center justify-between"><span className="text-xs font-600 text-slate-500">Mensualité</span><span className="font-display text-base font-700 text-royal-700">{formatFCFA(totalMonthly)}</span></div>
            <div className="mt-1 flex items-center justify-between border-t pt-1" style={{ borderColor:'rgba(188,211,255,.4)' }}><span className="text-xs font-600 text-slate-500">Total annuel dû ({NUM_MONTHS} mois)</span><span className="font-display text-lg font-700 text-gold-600">{formatFCFA(totalAnnual)}</span></div>
          </div>
        </div>
        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3"><div className="flex gap-2">
          <button onClick={onClose} className="flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-600 text-slate-600 transition hover:bg-slate-50 active:scale-95">Annuler</button>
          <button onClick={submit} disabled={!valid} className="flex h-11 flex-[1.6] items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 text-sm font-700 text-white shadow-gold transition hover:brightness-105 active:scale-95 disabled:opacity-40"><Check className="h-4 w-4" strokeWidth={3}/>Inscrire l'élève</button>
        </div></div>
      </div>
    </div>
  );
}
function Field({ label, children, span = 3 }:{ label:string; children:React.ReactNode; span?:1|2|3; }) {
  return <div className="mt-3" style={{ gridColumn:`span ${span}` }}><label className="mb-1 block text-xs font-600 text-slate-500">{label}</label>{children}</div>;
}
