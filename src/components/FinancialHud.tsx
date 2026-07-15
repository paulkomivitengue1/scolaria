import { TrendingUp, AlertCircle, PieChart } from 'lucide-react';
import { formatFCFA } from '../types';
interface HudProps { totalCollected: number; outstanding: number; recoveryRate: number; }
export function FinancialHud({ totalCollected, outstanding, recoveryRate }: HudProps) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))' }}>
      <Card title="Total Encaissé" value={formatFCFA(totalCollected)} icon={<TrendingUp className="h-5 w-5 text-teal-600"/>} accent="teal" sub="Cumul des paiements reçus"/>
      <Card title="Reste à Recouvrer" value={formatFCFA(outstanding)} icon={<AlertCircle className="h-5 w-5 text-gold-600"/>} accent="gold" sub="Solde restant à encaisser"/>
      <Card title="Taux de Recouvrement" value={`${recoveryRate}%`} icon={<PieChart className="h-5 w-5 text-royal-700"/>} accent="royal" sub="Encaissé / Total attendu" progress={recoveryRate}/>
    </div>
  );
}
function Card({ title, value, icon, accent, sub, progress }:{ title:string; value:string; icon:React.ReactNode; accent:string; sub:string; progress?:number; }) {
  const bg:Record<string,string>={teal:'bg-emerald-50',gold:'bg-gold-50',royal:'bg-royal-50'};
  const bar:Record<string,string>={teal:'var(--teal-600)',gold:'var(--gold-500)',royal:'var(--royal-700)'};
  return (
    <div className="relative overflow-hidden rounded-2.5xl border border-slate-200 bg-white p-5 shadow-card transition">
      <div className="flex items-start justify-between">
        <div><p className="text-xs font-700 uppercase tracking-wider text-slate-500">{title}</p><p className="mt-1.5 font-display text-2xl font-800 tracking-tight text-ink">{value}</p><p className="mt-1 text-[11px] font-500 text-slate-400">{sub}</p></div>
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${bg[accent]}`}>{icon}</span>
      </div>
      {typeof progress==='number' && <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all duration-500" style={{ width:`${progress}%`, background:bar[accent] }}/></div>}
    </div>
  );
}
