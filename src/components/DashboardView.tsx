import {
  Users, TrendingUp, AlertCircle, PieChart,
  GraduationCap, ClipboardList, Boxes, Settings2,
  ArrowRight, Sparkles, Receipt,
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
  onStartStudent: () => void;
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

function getAcademicYearLabel(date = new Date()): string {
  const year = date.getFullYear();
  // In Mali, the school year generally starts around September/October.
  const startYear = date.getMonth() >= 8 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

export function DashboardView({ students, totalCollected, outstanding, recoveryRate, stockSales, totalExpenses, onNavigate, onStartStudent }: Props) {
  const totalExpected = students.reduce((s, st) => s + studentExpected(st), 0);
  const totalCollectedAll = totalCollected;
  const classes = new Set(students.map(s => s.className)).size;
  const academicYear = getAcademicYearLabel();

  const cards: DashCard[] = [
    {
      label: 'Total Élèves',
      value: String(students.length),
      sub: `${classes} classe${classes !== 1 ? 's' : ''} · Année ${academicYear}`,
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
      label: 'Total Dépenses',
      value: formatFCFA(totalExpenses),
      sub: 'Cumul des dépenses enregistrées',
      icon: Receipt,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
      target: 'depenses',
      actionLabel: 'Voir les dépenses',
    },
    {
      label: 'Reste à Recouvrer',
      value: formatFCFA(outstanding),
      sub: 'Solde restant à encaisser',
      icon: AlertCircle,
      iconBg: 'bg-gold-50',
      iconColor: 'text-gold-600',
      target: 'impayes',
      actionLabel: 'Suivre les impayés',
    },
    {
      label: 'Taux de Recouvrement',
      value: `${recoveryRate}%`,
      sub: 'Encaissé / Total attendu',
      icon: PieChart,
      iconBg: 'bg-teal-50',
      iconColor: 'text-teal-600',
      target: 'impayes',
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
      value: 'Ouvrir',
      sub: 'Saisir, consulter et imprimer les bulletins',
      icon: ClipboardList,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-700',
      target: 'bulletins',
      actionLabel: 'Gérer les bulletins',
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

      {students.length === 0 && (
        <section className="mb-6 overflow-hidden rounded-3xl border border-royal-200 bg-gradient-to-br from-royal-50 via-white to-teal-50 shadow-cardLg">
          <div className="bg-gradient-to-r from-royal-900 via-royal-800 to-teal-800 p-5 text-white sm:p-6">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-800 uppercase tracking-wider text-teal-100"><Sparkles className="h-3.5 w-3.5" /> Bienvenue sur Gestilys</div>
            <h2 className="font-display text-xl font-800 sm:text-2xl">Préparons votre école en 3 étapes</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-royal-100">Suivez ces étapes pour commencer. Vous pourrez ensuite gérer les inscriptions, suivre les paiements et imprimer vos documents.</p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
            <div className="rounded-2xl border border-royal-100 bg-white p-4">
              <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-royal-100 text-royal-800"><Settings2 className="h-5 w-5" /></div>
              <p className="text-sm font-800 text-ink">1. Configurez l’école</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">Vérifiez le nom, les classes et les frais de scolarité.</p>
              <button type="button" onClick={() => onNavigate('parametres')} className="mt-4 inline-flex items-center gap-1.5 text-sm font-800 text-royal-700 hover:text-royal-900">Configurer <ArrowRight className="h-4 w-4" /></button>
            </div>
            <div className="rounded-2xl border border-teal-200 bg-white p-4 shadow-sm">
              <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-teal-100 text-teal-800"><Users className="h-5 w-5" /></div>
              <p className="text-sm font-800 text-ink">2. Inscrivez un élève</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">Ajoutez le premier dossier pour activer le suivi de sa scolarité.</p>
              <button type="button" onClick={onStartStudent} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-royal-700 to-royal-900 px-3.5 py-2.5 text-sm font-800 text-white shadow-card">Inscrire un élève <ArrowRight className="h-4 w-4" /></button>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white p-4">
              <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800"><Receipt className="h-5 w-5" /></div>
              <p className="text-sm font-800 text-ink">3. Enregistrez un paiement</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">Après l’inscription, ouvrez le cahier de caisse pour enregistrer un versement et préparer un reçu.</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-700 text-emerald-700"><ArrowRight className="h-4 w-4" /> Disponible après l’inscription</span>
            </div>
          </div>
        </section>
      )}

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
