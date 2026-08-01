import { Search, LogOut } from 'lucide-react';
interface HeaderProps { query: string; onQuery: (q:string)=>void; resultCount: number; onLogout: ()=>void; }
export function Header({ query, onQuery, resultCount, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200" style={{ background:'rgba(255,255,255,.85)', backdropFilter:'blur(4px)' }}>
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-royal-700 to-royal-900 text-white shadow-cardLg">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" stroke="#f5c518"/><path d="M6 12v5c3 3 9 3 12 0v-5" stroke="#f5c518"/></svg>
          </span>
          <div className="leading-tight"><h1 className="font-display text-lg font-800 tracking-tight text-ink">Gestilys</h1><p className="text-[11px] font-600 text-slate-400">Gestion Scolaire Premium</p></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden w-full max-w-xs sm:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" value={query} onChange={e=>onQuery(e.target.value)} placeholder="Rechercher un élève, classe, parent…" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-royal-400 focus:ring-4" />
            {query && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-600 text-slate-400">{resultCount}</span>}
          </div>
          <button onClick={onLogout} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 active:scale-95" title="Déconnexion" aria-label="Déconnexion"><LogOut className="h-4.5 w-4.5"/></button>
        </div>
      </div>
    </header>
  );
}
