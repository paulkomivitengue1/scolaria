import {
  LayoutDashboard, BarChart3, GraduationCap, Users, UserPlus, CreditCard, ClipboardList,
  Wallet, Boxes, Settings2, LogOut, X, Menu, AlertCircle, Receipt, ShieldCheck, Lock,
} from 'lucide-react';
import type { AppView } from '../types';

interface Props {
  current: AppView;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
  open: boolean;
  onToggle: () => void;
  schoolName: string;
  showAdminEntry: boolean;
  lockedViews?: AppView[];
  onOpenAdmin: () => void;
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
      { view: 'statistiques', label: 'Statistiques', icon: BarChart3 },
    ],
  },
  {
    title: 'Scolarité',
    items: [
      { view: 'classes', label: 'Classes', icon: GraduationCap },
      { view: 'cartes', label: 'Cartes scolaires', icon: CreditCard },
      { view: 'bulletins', label: 'Bulletins', icon: ClipboardList },
      { view: 'inscriptions', label: 'Inscriptions / élèves', icon: UserPlus },
    ],
  },
  {
    title: 'Finance',
    items: [
      { view: 'cahier', label: 'Cahier de caisse', icon: Wallet },
      { view: 'paiements', label: 'Paiements', icon: CreditCard },
      { view: 'impayes', label: 'Impayés par tranche', icon: AlertCircle },
      { view: 'enseignants', label: 'Enseignants & Salaires', icon: Users },
      { view: 'depenses', label: 'Dépenses', icon: Receipt },
      { view: 'stocks', label: 'Stocks', icon: Boxes },
    ],
  },
];

export function Sidebar({ current, onNavigate, onLogout, open, onToggle, schoolName, showAdminEntry, onOpenAdmin, lockedViews = [] }: Props) {
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
        className={`gestilys-sidebar fixed left-0 top-0 z-50 flex h-screen w-64 flex-col transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo header */}
        <div className="gestilys-sidebar-header flex h-16 shrink-0 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <span className="gestilys-sidebar-logo grid h-9 w-9 place-items-center rounded-xl text-white shadow-card">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" stroke="#172554" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" stroke="#172554" />
              </svg>
            </span>
            <div className="leading-tight">
              <h1 className="gestilys-sidebar-brand font-display text-base font-800 tracking-tight">Gestilys</h1>
              <p className="gestilys-sidebar-school text-[10px] font-600 truncate max-w-[140px]">{schoolName}</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="gestilys-sidebar-close grid h-8 w-8 place-items-center rounded-lg transition lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="gestilys-sidebar-nav flex-1 overflow-y-auto px-3 py-4">
          {SECTIONS.map((section) => (
            <div key={section.title} className="mb-5">
              <p className="gestilys-sidebar-section-title mb-2 px-3 text-[10px] font-700 uppercase tracking-wider">{section.title}</p>
              <div className="gestilys-sidebar-links space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.view === current;
                  const isLocked = lockedViews.includes(item.view);
                  return (
                    <button
                      key={`${section.title}-${item.label}`}
                      onClick={() => onNavigate(item.view)}
                      className={`gestilys-sidebar-link flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-600 transition ${isActive ? 'is-active' : ''}`}
                    >
                      <Icon className="h-4.5 w-4.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {isLocked && <Lock className="ml-auto h-4 w-4 shrink-0 text-amber-600" aria-label="Inclus dans Premium et Élite" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: administration + settings + logout */}
        <div className="gestilys-sidebar-footer shrink-0 px-3 py-3">
          {showAdminEntry && (
            <button
              onClick={onOpenAdmin}
              className="gestilys-admin-entry mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-extrabold shadow-md transition hover:brightness-105"
            >
              <ShieldCheck className="h-4.5 w-4.5 shrink-0" />
              <span>Mon panneau admin</span>
            </button>
          )}
          <button
            onClick={() => onNavigate('parametres')}
            className={`gestilys-sidebar-link flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-600 transition ${current === 'parametres' ? 'is-active' : ''}`}
          >
            <Settings2 className="h-4.5 w-4.5 shrink-0" />
            <span>Paramètres</span>
          </button>
          <button
            onClick={onLogout}
            className="gestilys-sidebar-link mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-600 transition"
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
          className="gestilys-hamburger fixed left-3 top-3 z-50 grid h-10 w-10 place-items-center rounded-xl shadow-md transition lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
