import {
  Users, TrendingUp, AlertCircle, PieChart,
  GraduationCap, ClipboardList, Boxes, Settings2,
  ArrowRight, Sparkles,
} from 'lucide-react';
import type { AppView, Student } from '../types';
import { formatFCFA, studentExpected } from '../types';

interface Props {
  students: Student[];
  totalCollected: number;
  outstanding: number;
  recoveryRate: number;
  stockSales: number;
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
}

export function DashboardView({ students, totalCollected, outstanding, recoveryRate, stockSales, onNavigate }: Props) {
  const totalExpected = students.reduce((s, st) => s + studentExpected(st), 0);
  const totalCollectedAll = totalCollected;
  const classes = new Set(students.map(s => s.className)).size;

  const cards: DashCard[] = [
    {
      label: 'Total Élèves',
      value: String(students.length),
      sub: `${classes} classe${classes !== 1 ? 's' : ''} · Année 2025-2026`,
      icon: Users,
      iconBg: 'bg-royal-50',
      iconColor: 'text-royal-700',
      target: 'classes',
      actionLabel: 'Voir par classe',
    },
    {
      label: 'Total Encaissé',
      value: formatFCFA(totalCollectedAll),
      sub: 'Cumul des paiements reçus',
      icon: TrendingUp,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      target: 'cahier',
      actionLabel: 'Voir les paiements',
    },
    {
      label: 'Reste à Recouvrer',
      value: formatFCFA(outstanding),
      sub: 'Solde restant à encaisser',
      icon: AlertCircle,
      iconBg: 'bg-gold-50',
      iconColor: 'text-gold-600',
      target: 'cahier',
      actionLabel: 'Suivre les impayés',
    },
    {
      label: 'Taux de Recouvrement',
      value: `${recoveryRate}%`,
      sub: 'Encaissé / Total attendu',
      icon: PieChart,
      iconBg: 'bg-teal-50',
      iconColor: 'text-teal-600',
      target: 'cahier',
      actionLabel: 'Voir les statistiques',
    },
    {
      label: 'Frais Scolarité',
      value: formatFCFA(totalExpected),
      sub: 'Total attendu de l\'année',
      icon: GraduationCap,
      iconBg: 'bg-royal-50',
      iconColor: 'text-royal-700',
      target: 'cahier',
      actionLabel: 'Gérer les frais',
    },
    {
      label: 'Ventes Stocks',
      value: formatFCFA(stockSales),
      sub: 'Tenues et livres vendus',
      icon: Boxes,
      iconBg: 'bg-pink-50',
      iconColor: 'text-pink-600',
      target: 'stocks',
      actionLabel: 'Gérer les stocks',
    },
    {
      label: 'Bulletins',
      value: String(students.length),
      sub: 'Élèves éligibles aux bulletins',
      icon: ClipboardList,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-700',
      target: 'bulletins',
      actionLabel: 'Saisir les bulletins',
    },
    {
      label: 'Paramètres',
      value: 'Configurer',
      sub: 'Tranches, frais, périodes, école',
      icon: Settings2,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      target: 'parametres',
      actionLabel: 'Ouvrir les paramètres',
    },
  ];

  return (
    <div>
      <div className="mb-5">
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-royal-700">
          <Sparkles className="h-3 w-3" /> Tableau de bord
        </div>
        <h1 className="font-display text-2xl font-700 tracking-tight text-ink sm:text-3xl">Vue d'ensemble</h1>
        <p className="mt-1 text-sm text-slate-500">Cliquez sur une carte pour accéder à la section détaillée.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => onNavigate(card.target)}
              className="group relative overflow-hidden rounded-2.5xl border border-slate-200 bg-white p-5 text-left shadow-card transition hover:shadow-cardLg active:scale-95"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-700 uppercase tracking-wider text-slate-500">{card.label}</p>
                  <p className="mt-1.5 font-display text-2xl font-800 tracking-tight text-ink">{card.value}</p>
                  <p className="mt-1 text-[11px] font-500 text-slate-400">{card.sub}</p>
                </div>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${card.iconBg}`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </span>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-700 text-royal-700 transition group-hover:gap-2.5">
                {card.actionLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
