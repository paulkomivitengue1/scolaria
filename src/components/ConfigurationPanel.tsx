import { useEffect, useState } from 'react';
import { Settings2, GraduationCap, Utensils, Bus, Save, RotateCcw, Check, Search, AlertCircle, School, CalendarClock, Sparkles, ArrowRight } from 'lucide-react';
import type { PricingConfig, ServiceType, UniformStockItem, BookStockItem } from '../types';
import { CLASS_LIST, SERVICES, formatFCFA, annualTotalFor, monthlyShare, NUM_MONTHS, uniformRemaining, bookRemaining } from '../types';

interface ConfigPanelProps {
  pricing: PricingConfig;
  onSave:(n:PricingConfig)=>void;
  onReset:()=>void;
  schoolName: string;
  onSchoolNameChange:(n:string)=>void;
  uniforms: UniformStockItem[];
  books: BookStockItem[];
  onYearEnd: () => void;
}
const ICONS = { GraduationCap, Utensils, Bus };
const ACC: Record<ServiceType,{ wrap:string; text:string }> = { scolarite:{wrap:'bg-royal-50',text:'text-royal-700'}, cantine:{wrap:'bg-gold-50',text:'text-gold-600'}, transport:{wrap:'bg-emerald-50',text:'text-emerald-600'} };

export function ConfigurationPanel({ pricing, onSave, onReset, schoolName, onSchoolNameChange, uniforms, books, onYearEnd }: ConfigPanelProps) {
  const [draft, setDraft] = useState<PricingConfig>(pricing);
  const [filter, setFilter] = useState('');
  const [saved, setSaved] = useState(false);
  const [schoolDraft, setSchoolDraft] = useState(schoolName);
  const [schoolSaved, setSchoolSaved] = useState(false);
  useEffect(() => { setDraft(pricing); }, [pricing]);
  useEffect(() => { setSchoolDraft(schoolName); }, [schoolName]);
  const update = (cls:string, svc:ServiceType, v:number) => { setDraft(d=>({...d,[cls]:{...d[cls],[svc]:Math.max(0,isNaN(v)?0:v)}})); setSaved(false); };
  const dirty = JSON.stringify(draft)!==JSON.stringify(pricing);
  const handleSave = () => { onSave(draft); setSaved(true); setTimeout(()=>setSaved(false),2200); };
  const handleReset = () => { onReset(); setSaved(false); };
  const handleSchoolSave = () => { onSchoolNameChange(schoolDraft.trim()); setSchoolSaved(true); setTimeout(()=>setSchoolSaved(false),2200); };
  const handleSchoolReset = () => { setSchoolDraft(''); onSchoolNameChange(''); setSchoolSaved(false); };
  const schoolDirty = schoolDraft.trim() !== schoolName;
  const classes = CLASS_LIST.filter(c=>c.toLowerCase().includes(filter.trim().toLowerCase()));
  const ann = (cls:string) => annualTotalFor(cls, SERVICES.map(s=>s.type), draft);

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2.5xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full blur-2xl" style={{ background:'var(--royal-50)' }}/>
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-royal-700 to-royal-900 text-white shadow-cardLg"><Settings2 className="h-6 w-6"/></span><div><h2 className="font-display text-xl font-700 text-ink">Paramètres — Tarifs par classe</h2><p className="text-sm text-slate-500">Définissez les tarifs <strong className="font-700 text-ink">annuels</strong> (FCFA) pour chaque classe et service. Le mensuel est calculé automatiquement (÷ {NUM_MONTHS} mois).</p></div></div>
          <div className="flex items-center gap-2">
            <button onClick={handleReset} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-600 text-slate-600 transition hover:bg-slate-50 active:scale-95"><RotateCcw className="h-4 w-4"/>Réinitialiser</button>
            <button onClick={handleSave} disabled={!dirty&&!saved} className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-700 text-white shadow-sm transition active:scale-95 ${saved?'bg-emerald-600':dirty?'bg-gradient-to-br from-gold-500 to-gold-600 shadow-gold hover:brightness-105':'cursor-not-allowed bg-slate-300'}`}>{saved?<Check className="h-4 w-4" strokeWidth={3}/>:<Save className="h-4 w-4"/>}{saved?'Enregistré':'Enregistrer'}</button>
          </div>
        </div>
      </div>
      {/* School name editor */}
      <div className="relative overflow-hidden rounded-2.5xl border border-slate-200 bg-white p-5 shadow-card sm:p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold-50 blur-2xl"/>
        <div className="relative">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-white shadow-gold"><School className="h-6 w-6"/></span>
            <div>
              <h2 className="font-display text-xl font-700 text-ink">Nom de l'école</h2>
              <p className="text-sm text-slate-500">Ce nom apparaît dans les messages WhatsApp envoyés aux parents.</p>
            </div>
          </div>
          <div className="relative">
            <input
              type="text"
              value={schoolDraft}
              onChange={e=>{setSchoolDraft(e.target.value); setSchoolSaved(false);}}
              placeholder="Entrez le nom de votre école…"
              className="h-14 w-full rounded-xl border border-slate-300 bg-white px-4 text-lg font-600 text-ink outline-none transition focus:border-royal-500 focus:ring-2 focus:ring-royal-500/30"
            />
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleSchoolSave}
              disabled={!schoolDirty&&!schoolSaved}
              className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-sm font-700 text-white shadow-sm transition active:scale-95 ${schoolSaved?'bg-emerald-600':schoolDirty?'bg-gradient-to-br from-royal-600 to-royal-800 shadow-cardLg hover:brightness-105':'cursor-not-allowed bg-slate-300'}`}
            >
              {schoolSaved?<Check className="h-4 w-4" strokeWidth={3}/>:<Save className="h-4 w-4"/>}
              {schoolSaved?'Nom enregistré':'Enregistrer le nom'}
            </button>
            <button
              onClick={handleSchoolReset}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-600 text-slate-600 transition hover:bg-slate-50 active:scale-95"
            >
              <RotateCcw className="h-4 w-4"/>
              Réinitialiser
            </button>
          </div>
        </div>
      </div>
      {/* Clôture d'exercice / Nouvelle année */}
      <YearEndSection uniforms={uniforms} books={books} onYearEnd={onYearEnd} />
      <div className="relative max-w-xs"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input type="text" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filtrer une classe…" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-royal-400 focus:ring-4"/></div>
      <div className="hidden overflow-hidden rounded-2.5xl border border-slate-200 bg-white shadow-card md:block">
        <div className="overflow-x-auto scrollbar-thin"><table className="w-full text-sm"><thead><tr className="border-b border-slate-200 bg-slate-50">
          <th className="px-5 py-3 text-left text-xs font-700 uppercase tracking-wider text-slate-500">Classe</th>
          {SERVICES.map(svc=>{const Icon=ICONS[svc.icon];return(<th key={svc.type} className="border-l border-slate-200 px-4 py-3 text-left text-xs font-700 uppercase tracking-wider text-slate-500"><span className="inline-flex items-center gap-1.5"><Icon className={`h-4 w-4 ${ACC[svc.type].text}`}/>{svc.label}</span></th>);})}
          <th className="border-l border-slate-200 px-4 py-3 text-right text-xs font-700 uppercase tracking-wider text-slate-500">Mensuel (÷{NUM_MONTHS})</th>
        </tr></thead><tbody>
          {classes.map((cls,idx)=>(<tr key={cls} className="border-b border-slate-100 transition hover:bg-royal-50" style={{ background:idx%2?'var(--slate-50)':'#fff' }}>
            <td className="px-5 py-3"><span className="font-600 text-ink">{cls}</span></td>
            {SERVICES.map(svc=>(<td key={svc.type} className="border-l border-slate-100 px-4 py-3"><PriceInput value={draft[cls]?.[svc.type]??0} onChange={v=>update(cls,svc.type,v)} accent={ACC[svc.type]}/></td>))}
            <td className="border-l border-slate-100 px-4 py-3 text-right"><span className="font-display text-sm font-700 text-royal-700">{formatFCFA(Math.round(monthlyShare(ann(cls))))}</span></td>
          </tr>))}
        </tbody></table></div>
      </div>
      <div className="space-y-3 md:hidden">
        {classes.map(cls=>(
          <div key={cls} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <span className="font-display text-base font-800 text-ink">{cls}</span>
              <span className="font-display text-sm font-700 text-royal-700">{formatFCFA(Math.round(monthlyShare(ann(cls))))}</span>
            </div>
            <div className="mt-1 text-[10px] font-600 uppercase tracking-wider text-slate-400">Mensuel ÷{NUM_MONTHS}</div>
            <div className="mt-3 space-y-2.5">
              {SERVICES.map(svc=>{const Icon=ICONS[svc.icon];return(
                <div key={svc.type} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`grid h-8 w-8 place-items-center rounded-lg ${ACC[svc.type].wrap}`}><Icon className={`h-4 w-4 ${ACC[svc.type].text}`}/></span>
                    <span className="text-sm font-600 text-slate-600">{svc.shortLabel}</span>
                  </div>
                  <PriceInput value={draft[cls]?.[svc.type]??0} onChange={v=>update(cls,svc.type,v)} accent={ACC[svc.type]}/>
                </div>
              );})}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-start gap-2 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-xs text-gold-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0"/><p>Les nouveaux élèves inscrits via « Ajouter un élève » utilisent automatiquement ces tarifs annuels selon leur classe et les services cochés (mensualité = annuel ÷ {NUM_MONTHS}). Modifier un tarif n'affecte pas les élèves déjà inscrits.</p></div>
    </div>
  );
}
function PriceInput({ value, onChange, accent }:{ value:number; onChange:(v:number)=>void; accent:{wrap:string;text:string}; }) {
  return (<div className="inline-flex items-stretch overflow-hidden rounded-lg border border-slate-200 bg-white transition focus-within:border-royal-400">
    <input type="number" min={0} step={1000} value={value||''} onChange={e=>onChange(parseInt(e.target.value,10))} placeholder="0" className={`h-9 w-16 min-w-0 bg-white px-2 text-right text-sm font-700 text-ink outline-none sm:h-10 sm:w-24 sm:px-3 md:w-20 ${value>0?accent.wrap:''}`}/>
    <span className="flex items-center bg-slate-100 px-2 text-[10px] font-700 text-slate-500 sm:px-2.5 sm:text-[11px]">FCFA</span>
  </div>);
}

function YearEndSection({ uniforms, books, onYearEnd }: { uniforms: UniformStockItem[]; books: BookStockItem[]; onYearEnd: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);

  const totalUniforms = uniforms.reduce((s, i) => s + uniformRemaining(i), 0);
  const totalBooks = books.reduce((s, i) => s + bookRemaining(i), 0);

  const handleConfirm = () => {
    onYearEnd();
    setConfirm(false);
    setDone(true);
    setTimeout(() => setDone(false), 4000);
  };

  return (
    <div className="rounded-2.5xl border border-royal-200 bg-gradient-to-br from-royal-50 via-white to-gold-50 p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-royal-700 to-royal-900 text-white shadow-cardLg">
          <CalendarClock className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h3 className="font-display text-lg font-800 text-ink">Clôture d'exercice / Nouvelle Année</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            Prépare la rentrée scolaire en un clic : les compteurs « Vendus » et « Distribués » repassent à zéro, et le stock restant de cette année devient automatiquement l'« Ancien Stock » de la prochaine.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-[11px] font-700 uppercase tracking-wider text-slate-400">Tenues reportées</div>
          <div className="font-display text-xl font-800 text-royal-700">{totalUniforms}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-[11px] font-700 uppercase tracking-wider text-slate-400">Livres reportés</div>
          <div className="font-display text-xl font-800 text-royal-700">{totalBooks}</div>
        </div>
      </div>

      {done ? (
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-700 text-emerald-700">
          <Check className="h-4 w-4" /> Nouvelle année scolaire préparée avec succès !
        </div>
      ) : confirm ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-600 text-slate-600">Confirmer la clôture ?</span>
          <button onClick={handleConfirm} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-royal-700 to-royal-900 px-4 py-2 text-sm font-700 text-white shadow-cardLg transition hover:brightness-105 active:scale-95">
            <Check className="h-4 w-4" /> Oui, préparer la rentrée
          </button>
          <button onClick={() => setConfirm(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-600 text-slate-500 transition hover:bg-slate-50">Annuler</button>
        </div>
      ) : (
        <button onClick={() => setConfirm(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 px-5 py-2.5 text-sm font-700 text-white shadow-gold transition hover:brightness-105 active:scale-95">
          <Sparkles className="h-4 w-4" /> Préparer la nouvelle rentrée scolaire <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
