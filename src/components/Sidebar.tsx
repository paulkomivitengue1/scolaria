import {
  LayoutDashboard, BarChart3, GraduationCap, Users, UserPlus,
  Wallet, Boxes, Settings2, LogOut, X, Menu, AlertCircle,
} from 'lucide-react';
import type { AppView } from '../types';

interface Props {
  current: AppView;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
  open: boolean;
  onToggle: () => void;
  schoolName: string;
}

interface NavItem {
  view: AppView;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: 'Pilotage',
    items: [
      { view: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
      { view: 'cahier', label: 'Statistiques', icon: BarChart3 },
    ],
  },
  {
    title: 'Scolarité',
    items: [
      { view: 'classes', label: 'Classes', icon: GraduationCap },
      { view: 'cahier', label: 'Élèves', icon: Users },
      { view: 'cahier', label: 'Inscriptions', icon: UserPlus },
    ],
  },
  {
    title: 'Finance',
    items: [
      { view: 'cahier', label: 'Paiements', icon: Wallet },
      { view: 'impayes', label: 'Impayés par tranche', icon: AlertCircle },
      { view: 'stocks', label: 'Stocks', icon: Boxes },
    ],
  },
];

export function Sidebar({ current, onNavigate, onLogout, open, onToggle, schoolName }: Props) {
  return (
    <>
      {/* Mobile overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 transition-opacity lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-royal-700 to-royal-900 text-white shadow-card">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" stroke="#f5c518" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" stroke="#f5c518" />
              </svg>
            </span>
            <div className="leading-tight">
              <h1 className="font-display text-base font-800 tracking-tight text-ink">Gestilys</h1>
              <p className="text-[10px] font-600 text-slate-400 truncate max-w-[140px]">{schoolName}</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {SECTIONS.map((section) => (
            <div key={section.title} className="mb-5">
              <p className="mb-2 px-3 text-[10px] font-700 uppercase tracking-wider text-slate-400">{section.title}</p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.view === current;
                  return (
                    <button
                      key={`${section.title}-${item.label}`}
                      onClick={() => onNavigate(item.view)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-600 transition ${
                        isActive
                          ? 'bg-royal-50 text-royal-700'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: settings + logout */}
        <div className="shrink-0 border-t border-slate-200 px-3 py-3">
          <button
            onClick={() => onNavigate('parametres')}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-600 transition ${
              current === 'parametres' ? 'bg-royal-50 text-royal-700' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Settings2 className="h-4.5 w-4.5 shrink-0" />
            <span>Paramètres</span>
          </button>
          <button
            onClick={onLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-600 text-slate-600 transition hover:bg-slate-50"
          >
            <LogOut className="h-4.5 w-4.5 shrink-0" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Mobile hamburger button (floating, above header) */}
      {!open && (
        <button
          onClick={onToggle}
          className="fixed left-3 top-3 z-50 grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
