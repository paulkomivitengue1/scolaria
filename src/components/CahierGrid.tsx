import { MessageCircle, ChevronRight, GraduationCap, Utensils, Bus, Inbox } from 'lucide-react';
import type { Student, MonthKey, ServiceType, ServiceDef } from '../types';
import { TRANCHES, MONTH_SHORT, MONTH_LABELS, formatFCFA, SERVICES, SERVICE_MAP, studentOutstanding, cellStatus, monthlyShare } from '../types';
import { StatusBadge } from './StatusBadge';

interface GridProps { students:Student[]; activeService:ServiceType; onServiceChange:(s:ServiceType)=>void; onCellClick:(id:string,m:MonthKey,s:ServiceType)=>void; onWhatsApp:(s:Student,svc:ServiceType)=>void; onAddClick:()=>void; }
const ICONS: Record<ServiceDef['icon'], typeof GraduationCap> = { GraduationCap, Utensils, Bus };
const ACTIVE: Record<string,string> = { royal:'bg-royal-700 text-white shadow-cardLg', gold:'bg-gold-500 text-white shadow-gold', emerald:'bg-emerald-600 text-white shadow-card' };
const IDLE: Record<string,string> = { royal:'text-royal-700 hover:bg-royal-50', gold:'text-gold-600 hover:bg-gold-50', emerald:'text-emerald-600 hover:bg-emerald-50' };
const DOT: Record<string,string> = { royal:'bg-royal-700', gold:'bg-gold-500', emerald:'bg-emerald-600' };
const ROW: MonthKey[] = ['oct','nov','dec','jan','fev','mar','avr','mai','jun'];

export function CahierGrid({ students, activeService, onServiceChange, onCellClick, onWhatsApp, onAddClick }: GridProps) {
  return (<>
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {SERVICES.map(s=>{const Icon=ICONS[s.icon];const a=s.type===activeService;return(<button key={s.type} onClick={()=>onServiceChange(s.type)} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-700 transition ${a?ACTIVE[s.accent]:`border border-slate-200 bg-white text-slate-600 ${IDLE[s.accent]}`}`}><Icon className="h-4 w-4"/>{s.label}{a&&<span className="h-1.5 w-1.5 rounded-full bg-white/80"/>}</button>);})}
    </div>
    {students.length===0 ? (
      <div className="flex flex-col items-center justify-center rounded-2.5xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-card">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-royal-50 text-royal-400"><Inbox className="h-8 w-8"/></span>
        <h3 className="mt-4 font-display text-lg font-700 text-ink">Aucun élève inscrit</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500">Le cahier est vide. Ajoutez votre premier élève pour commencer le suivi des paiements.</p>
        <button onClick={onAddClick} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 px-4 py-2.5 text-sm font-700 text-white shadow-gold transition hover:brightness-105 active:scale-95"><GraduationCap className="h-4.5 w-4.5"/>Ajouter un élève</button>
      </div>
    ) : (<>
      <div className="hidden overflow-hidden rounded-2.5xl border border-slate-200 bg-white shadow-card lg:block">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th rowSpan={2} className="sticky left-0 z-10 bg-slate-50 px-5 py-3 text-left align-bottom text-xs font-700 uppercase tracking-wider text-slate-500">Élève</th>
                <th rowSpan={2} className="px-3 py-3 text-left align-bottom text-xs font-700 uppercase tracking-wider text-slate-500">Classe</th>
                {TRANCHES.map(t=>(<th key={t.id} colSpan={t.months.length} className="border-l border-slate-200 px-3 py-2 text-center text-xs font-700 uppercase tracking-wider text-royal-700"><span className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${DOT[SERVICE_MAP[activeService].accent]}`}/>{t.label}</span></th>))}
                <th rowSpan={2} className="px-4 py-3 text-right align-bottom text-xs font-700 uppercase tracking-wider text-slate-500">Solde dû</th>
                <th rowSpan={2} className="px-3 py-3 align-bottom text-xs font-700 uppercase tracking-wider text-slate-500">Reçu</th>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50">{TRANCHES.map(t=>t.months.map(m=>(<th key={m} className="border-l border-slate-200 px-2 py-2 text-center text-[11px] font-600 text-slate-500">{MONTH_SHORT[m]}</th>)))}</tr>
            </thead>
            <tbody>
              {students.map((s,idx)=>{const svc=s.services.find(x=>x.type===activeService);const out=studentOutstanding(s);const ini=`${s.firstName[0]??''}${s.lastName[0]??''}`;const mon=svc?monthlyShare(svc.annualFee):0;return(
                <tr key={s.id} className="border-b border-slate-100 transition hover:bg-royal-50" style={{ background:idx%2?'var(--slate-50)':'#fff' }}>
                  <td className="sticky left-0 z-10 px-5 py-3" style={{ background:'inherit' }}>
                    <div className="flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-royal-100 to-royal-200 text-xs font-700 text-royal-700">{ini}</div><div className="leading-tight"><div className="font-600 text-ink">{s.firstName} {s.lastName}</div><div className="text-[11px] text-slate-400">{s.parentName}</div></div></div>
                  </td>
                  <td className="px-3 py-3"><span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-600 text-slate-600">{s.className}</span></td>
                  {svc?cells(svc,activeService,mon,s.id,onCellClick):empties()}
                  <td className="px-4 py-3 text-right"><span className={`font-display text-sm font-700 ${out>0?'text-gold-600':'text-emerald-600'}`}>{out>0?formatFCFA(out):'Soldé'}</span></td>
                  <td className="px-3 py-3 text-center"><button onClick={()=>onWhatsApp(s,activeService)} className="inline-grid h-9 w-9 place-items-center rounded-xl text-white shadow-sm transition hover:scale-105 active:scale-95" style={{background:'#25D366'}} aria-label="Reçu WhatsApp"><MessageCircle className="h-4.5 w-4.5"/></button></td>
                </tr>);})}
            </tbody>
          </table>
        </div>
      </div>
      <div className="space-y-3 lg:hidden">
        {students.map(s=>{const svc=s.services.find(x=>x.type===activeService);const out=studentOutstanding(s);const ini=`${s.firstName[0]??''}${s.lastName[0]??''}`;const mon=svc?monthlyShare(svc.annualFee):0;return(
          <div key={s.id} className="animate-floatUp rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-royal-100 to-royal-200 text-sm font-700 text-royal-700">{ini}</div><div className="leading-tight"><div className="font-600 text-ink">{s.firstName} {s.lastName}</div><div className="text-[11px] text-slate-400">{s.className} · {s.parentName}</div></div></div><button onClick={()=>onWhatsApp(s,activeService)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-sm transition active:scale-95" style={{background:'#25D366'}}><MessageCircle className="h-4.5 w-4.5"/></button></div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="text-[11px] font-600 uppercase tracking-wide text-slate-500">Solde dû (total)</span><span className={`font-display text-sm font-700 ${out>0?'text-gold-600':'text-emerald-600'}`}>{out>0?formatFCFA(out):'Soldé'}</span></div>
            {svc?(<div className="mt-3 space-y-2.5">{TRANCHES.map(t=>(<div key={t.id}><div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-700 uppercase tracking-wider"><span className={`h-1.5 w-1.5 rounded-full ${DOT[SERVICE_MAP[activeService].accent]}`}/><span className="text-royal-700">{t.label}</span><ChevronRight className="h-3 w-3 text-slate-400"/></div><div className="flex flex-wrap gap-2">{t.months.map(m=>{const p=svc.payments[m];return(<button key={m} onClick={()=>onCellClick(s.id,m,activeService)} className="flex flex-col items-center gap-1 rounded-lg border border-slate-100 bg-white px-2.5 py-2 transition active:scale-95 hover:bg-royal-50"><span className="text-[10px] font-600 text-slate-500">{MONTH_SHORT[m]}</span><StatusBadge status={cellStatus(p.paid,mon)} paid={p.paid} monthlyFee={mon} size="sm"/></button>);})}</div></div>))}</div>):(<div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-center text-xs text-slate-400">Non inscrit à {SERVICE_MAP[activeService].label}</div>)}
          </div>);})}
      </div>
    </>)}
  </>);
}
function cells(svc:Student['services'][number], service:ServiceType, mon:number, id:string, click:(id:string,m:MonthKey,s:ServiceType)=>void) {
  return ROW.map((m,i)=>{const p=svc.payments[m];const st=cellStatus(p.paid,mon);return(<td key={m} className="border-l border-slate-100 px-2 py-3 text-center" style={i%3===0?{borderLeftColor:'var(--slate-200)'}:undefined}><button onClick={()=>click(id,m,service)} className="grid place-items-center rounded-lg p-1 transition hover:scale-110 active:scale-95" title={`${MONTH_LABELS[m]} — payé ${formatFCFA(p.paid)} / dû ${formatFCFA(mon)}`}><StatusBadge status={st} paid={p.paid} monthlyFee={mon}/></button></td>);});
}
function empties() { return ROW.map(m=>(<td key={m} className="border-l border-slate-100 px-2 py-3 text-center"><span className="text-[11px] text-slate-300">—</span></td>)); }
