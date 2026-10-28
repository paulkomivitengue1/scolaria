import {
  Users, TrendingUp, AlertCircle, PieChart,
  GraduationCap, ClipboardList, Boxes, Settings2,
  ArrowRight, Sparkles, Receipt, ShieldCheck,
} from 'lucide-react';
import type { AppView, Student } from '../types';
import { formatFCFA, studentExpected } from '../types';

interface Props {
  directorName: string;
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

export function DashboardView({ directorName, students, totalCollected, outstanding, recoveryRate, stockSales, totalExpenses, onNavigate, onStartStudent }: Props) {
  const directorFirstName = directorName.trim().split(/\s+/)[0] || '';
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
        <p className="mb-3 text-lg font-semibold text-blue-950 sm:text-xl">Bonjour{directorFirstName ? ', ' + directorFirstName : ''} 👋</p>
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-royal-700">
          <Sparkles className="h-3 w-3" /> Tableau de bord
        </div>
        <h1 className="font-display text-2xl font-700 tracking-tight text-ink sm:text-3xl">Vue d'ensemble</h1>
        <p className="mt-1 text-sm text-slate-500">Cliquez sur une carte pour accéder à la section détaillée.</p>
      </div>

      <style>{`
        .gestilys-start-panel { position:relative; overflow:hidden; margin-bottom:24px; border:1px solid #bfdbfe; border-radius:26px; background:linear-gradient(135deg,#eff6ff 0%,#fff 48%,#ecfdf5 100%); box-shadow:0 18px 46px rgba(23,37,84,.10); }
        .gestilys-start-panel:after { content:""; position:absolute; width:220px; height:220px; right:-86px; top:-110px; border:28px solid rgba(244,189,53,.18); border-radius:50%; pointer-events:none; }
        .gestilys-start-header { position:relative; overflow:hidden; padding:22px; color:#fff; background:linear-gradient(112deg,#172554 0%,#1d4ed8 62%,#0f766e 120%); }
        .gestilys-start-header:after { content:""; position:absolute; right:-25px; bottom:-92px; width:190px; height:190px; border:22px solid rgba(255,255,255,.10); border-radius:50%; pointer-events:none; }
        .gestilys-start-eyebrow { display:inline-flex; align-items:center; gap:7px; border:1px solid rgba(255,255,255,.28); border-radius:999px; padding:6px 10px; color:#fff0b3; background:rgba(255,255,255,.10); font-size:10px; font-weight:900; letter-spacing:.12em; }
        .gestilys-start-title { margin-top:10px; color:#fff!important; font-size:clamp(21px,3.5vw,28px); font-weight:950; letter-spacing:-.04em; line-height:1.15; }
        .gestilys-start-copy { margin-top:8px; max-width:680px; color:#eaf2ff!important; font-size:13px; line-height:1.65; }
        .gestilys-start-steps { position:relative; display:grid; grid-template-columns:1fr; gap:12px; padding:16px; }
        .gestilys-start-step { min-width:0; border:1px solid #dbeafe; border-radius:19px; padding:16px; background:#fff; box-shadow:0 7px 18px rgba(23,37,84,.045); }
        .gestilys-start-step:nth-child(2) { border-color:#99f6e4; box-shadow:0 9px 22px rgba(13,148,136,.09); }
        .gestilys-start-step:nth-child(3) { border-color:#a7f3d0; }
        .gestilys-start-icon { display:grid; place-items:center; width:42px; height:42px; border-radius:14px; margin-bottom:12px; }
        .gestilys-start-step h3 { color:#172554!important; font-size:14px; font-weight:900; line-height:1.4; }
        .gestilys-start-step p { color:#475569!important; font-size:12px; line-height:1.65; }
        .gestilys-start-action { display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:42px; margin-top:14px; border-radius:12px; padding:10px 13px; color:#fff!important; background:linear-gradient(115deg,#1d4ed8,#172554); font-size:12px; font-weight:900; box-shadow:0 7px 16px rgba(29,78,216,.17); }
        .gestilys-start-action-secondary { color:#1e40af!important; background:#eff6ff; border:1px solid #bfdbfe; box-shadow:none; }
        .gestilys-start-note { margin:0 16px 16px; display:flex; align-items:flex-start; gap:10px; border:1px solid #fde68a; border-radius:15px; padding:12px 14px; background:#fffbeb; color:#713f12; font-size:12px; line-height:1.6; }
        @media(min-width:640px) { .gestilys-start-header { padding:26px 28px; } .gestilys-start-steps { grid-template-columns:repeat(3,minmax(0,1fr)); padding:18px; } .gestilys-start-step { padding:17px; } .gestilys-start-note { margin:0 18px 18px; } }
      `}</style>
      {students.length === 0 && (
        <section className="gestilys-start-panel">
          <header className="gestilys-start-header">
            <span className="gestilys-start-eyebrow"><Sparkles className="h-3.5 w-3.5" /> VOTRE DÉMARRAGE · 3 ÉTAPES</span>
            <h2 className="gestilys-start-title">Bienvenue sur Gestilys ! Préparons votre école.</h2>
            <p className="gestilys-start-copy">Suivez ce petit parcours pour configurer votre espace, créer une première fiche élève et découvrir le suivi des règlements. Vous gardez le contrôle à chaque étape.</p>
          </header>
          <div className="gestilys-start-steps">
            <article className="gestilys-start-step">
              <div className="gestilys-start-icon" style={{background:"#dbeafe",color:"#1d4ed8"}}><Settings2 className="h-5 w-5" /></div>
              <h3>01 · Configurez l’école</h3>
              <p className="mt-2">Vérifiez le nom, les classes, l’année scolaire et les frais avant de commencer les inscriptions.</p>
              <button type="button" onClick={() => onNavigate('parametres')} className="gestilys-start-action gestilys-start-action-secondary">Ouvrir les paramètres <ArrowRight className="h-4 w-4" /></button>
            </article>
            <article className="gestilys-start-step">
              <div className="gestilys-start-icon" style={{background:"#ccfbf1",color:"#0f766e"}}><Users className="h-5 w-5" /></div>
              <h3>02 · Inscrivez un élève</h3>
              <p className="mt-2">Essayez d’abord avec une fiche fictive pour découvrir le parcours sans toucher aux données réelles.</p>
              <button type="button" onClick={onStartStudent} className="gestilys-start-action">Créer une fiche élève <ArrowRight className="h-4 w-4" /></button>
            </article>
            <article className="gestilys-start-step">
              <div className="gestilys-start-icon" style={{background:"#d1fae5",color:"#047857"}}><Receipt className="h-5 w-5" /></div>
              <h3>03 · Découvrez les paiements</h3>
              <p className="mt-2">Après l’inscription, ouvrez les paiements pour voir comment enregistrer un versement réel et préparer un reçu.</p>
              <button type="button" onClick={() => onNavigate('paiements')} className="gestilys-start-action gestilys-start-action-secondary">Voir les paiements <ArrowRight className="h-4 w-4" /></button>
            </article>
          </div>
          <div className="gestilys-start-note"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><span><strong>Conseil :</strong> pour la démonstration, utilisez des données fictives. N’enregistrez jamais de faux paiements dans les dossiers d’une école réelle.</span></div>
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
