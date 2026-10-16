import {
  Users, TrendingUp, AlertCircle, PieChart,
  GraduationCap, ClipboardList, Boxes, Settings2,
  ArrowRight, Sparkles, Receipt, CalendarDays,
} from 'lucide-react';
import type { AppView, Student } from '../types';
import { formatFCFA, studentExpected } from '../types';

interface Props {
  students: Student[];
  totalCollected: number;
  outstanding: number;
  recoveryRate: number;
  stockSales: number;
  totalExpenses: number;
  onNavigate: (view: AppView) => void;
}

interface DashCard {
  label: string;
  value: string;
  sub: string;
  icon: typeof Users;
  iconBg: string;
  iconColor: string;
  target: AppView;
  actionLabel: string;
  accent: string;
}

function getAcademicYearLabel(date = new Date()): string {
  const year = date.getFullYear();
  const startYear = date.getMonth() >= 8 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

export function DashboardView({ students, totalCollected, outstanding, recoveryRate, stockSales, totalExpenses, onNavigate }: Props) {
  const totalExpected = students.reduce((s, st) => s + studentExpected(st), 0);
  const classes = new Set(students.map(s => s.className)).size;
  const academicYear = getAcademicYearLabel();

  const cards: DashCard[] = [
    { label: 'Total élèves', value: String(students.length), sub: `${classes} classe${classes !== 1 ? 's' : ''} · Année ${academicYear}`, icon: Users, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-700', target: 'classes', actionLabel: 'Voir les classes', accent: 'bg-indigo-500' },
    { label: 'Total encaissé', value: formatFCFA(totalCollected), sub: 'Paiements et ventes enregistrés', icon: TrendingUp, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-700', target: 'cahier', actionLabel: 'Consulter les paiements', accent: 'bg-emerald-500' },
    { label: 'Dépenses', value: formatFCFA(totalExpenses), sub: 'Dépenses enregistrées', icon: Receipt, iconBg: 'bg-rose-50', iconColor: 'text-rose-700', target: 'depenses', actionLabel: 'Voir les dépenses', accent: 'bg-rose-500' },
    { label: 'Reste à recouvrer', value: formatFCFA(outstanding), sub: 'Montant restant à encaisser', icon: AlertCircle, iconBg: 'bg-amber-50', iconColor: 'text-amber-700', target: 'impayes', actionLabel: 'Suivre les impayés', accent: 'bg-amber-500' },
    { label: 'Taux de recouvrement', value: `${recoveryRate}%`, sub: 'Part des frais déjà encaissés', icon: PieChart, iconBg: 'bg-cyan-50', iconColor: 'text-cyan-700', target: 'cahier', actionLabel: 'Voir les statistiques', accent: 'bg-cyan-500' },
    { label: 'Frais de scolarité', value: formatFCFA(totalExpected), sub: 'Total attendu pour l’année', icon: GraduationCap, iconBg: 'bg-violet-50', iconColor: 'text-violet-700', target: 'cahier', actionLabel: 'Gérer les frais', accent: 'bg-violet-500' },
    { label: 'Ventes de stocks', value: formatFCFA(stockSales), sub: 'Tenues et livres vendus', icon: Boxes, iconBg: 'bg-pink-50', iconColor: 'text-pink-700', target: 'stocks', actionLabel: 'Gérer les stocks', accent: 'bg-pink-500' },
    { label: 'Bulletins scolaires', value: 'Accéder', sub: 'Saisir, consulter et imprimer', icon: ClipboardList, iconBg: 'bg-sky-50', iconColor: 'text-sky-700', target: 'bulletins', actionLabel: 'Gérer les bulletins', accent: 'bg-sky-500' },
    { label: 'Configuration', value: 'Paramètres', sub: 'Frais, tranches et périodes', icon: Settings2, iconBg: 'bg-slate-100', iconColor: 'text-slate-700', target: 'parametres', actionLabel: 'Configurer Gestilys', accent: 'bg-slate-500' },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-royal-900 via-royal-800 to-indigo-900 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full border-[28px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-52 w-52 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">
              <Sparkles className="h-3.5 w-3.5" /> Votre espace de gestion
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Bonjour, bienvenue sur Gestilys</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100/85 sm:text-base">
              Retrouvez en un coup d’œil la situation de votre établissement et accédez rapidement aux outils essentiels.
            </p>
          </div>
          <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <CalendarDays className="h-5 w-5 text-amber-300" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-100/75">Année scolaire</p>
              <p className="text-sm font-bold">{academicYear}</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">Vue d’ensemble</h2>
            <p className="mt-1 text-sm text-slate-500">Sélectionnez un indicateur pour ouvrir la section correspondante.</p>
          </div>
          <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 sm:inline-flex">9 raccourcis</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.label}
                onClick={() => onNavigate(card.target)}
                className="group relative flex min-h-[174px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-500 focus-visible:ring-offset-2 active:translate-y-0"
              >
                <span className={`absolute inset-x-0 top-0 h-1 ${card.accent}`} />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{card.label}</p>
                    <p className="mt-2 break-words font-display text-2xl font-extrabold tracking-tight text-ink sm:text-[1.7rem]">{card.value}</p>
                  </div>
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition-transform duration-200 group-hover:scale-105 ${card.iconBg}`}>
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">{card.sub}</p>
                <div className="mt-auto flex items-center gap-1.5 pt-4 text-xs font-bold text-royal-700">
                  {card.actionLabel}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
