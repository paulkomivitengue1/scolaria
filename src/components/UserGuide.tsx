import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen, CheckCircle2, ChevronLeft, ChevronRight, GraduationCap, Settings2,
  Users, Wallet, X, Sparkles, Trophy, RotateCcw, IdCard, ClipboardList,
  Search, LayoutDashboard, BarChart3, CreditCard, Receipt, Boxes, AlertCircle,
  UserRound, ArrowUpRight, CircleHelp,
} from 'lucide-react';
import type { AppView } from '../types';

interface GuideProps {
  open: boolean;
  mode: 'onboarding' | 'module' | 'help';
  view: AppView;
  schoolName: string;
  schoolId: string;
  onClose: () => void;
  onNavigate: (view: AppView) => void;
  onStartStudent: () => void;
}

type GuideArticle = {
  view: AppView;
  title: string;
  short: string;
  intro: string;
  steps: string[];
  keywords: string;
  icon: typeof BookOpen;
  category: 'Démarrage' | 'Scolarité' | 'Finance' | 'Pilotage' | 'Configuration';
};

const ARTICLES: GuideArticle[] = [
  { view: 'dashboard', title: 'Tableau de bord', short: 'Comprendre les indicateurs de votre école', intro: 'Le tableau de bord donne une vue d’ensemble des informations disponibles dans votre établissement.', steps: ['Commencez par vérifier que les informations de l’école sont configurées.', 'Utilisez les indicateurs comme un résumé, puis ouvrez le module correspondant pour consulter les détails.', 'Si les chiffres semblent incomplets, vérifiez que les données concernées ont bien été enregistrées.'], keywords: 'accueil résumé indicateurs accueil chiffres', icon: LayoutDashboard, category: 'Pilotage' },
  { view: 'statistiques', title: 'Statistiques', short: 'Consulter les chiffres de suivi', intro: 'Les statistiques servent à examiner les données disponibles dans Gestilys.', steps: ['Ouvrez Statistiques depuis le menu.', 'Lisez les indicateurs affichés en tenant compte des données déjà saisies.', 'Pour corriger une information, retournez dans le module où elle a été enregistrée.'], keywords: 'rapports analyses chiffres élèves finances', icon: BarChart3, category: 'Pilotage' },
  { view: 'parametres', title: 'Paramètres de l’école', short: 'Préparer l’année, les classes et les frais', intro: 'Configurez l’établissement avant d’effectuer les inscriptions et les encaissements.', steps: ['Vérifiez le nom de l’école et son logo.', 'Vérifiez l’année scolaire et les périodes utilisées.', 'Créez ou vérifiez les classes de votre établissement.', 'Configurez les frais et les tranches correspondant à vos règles réelles.', 'Relisez les réglages avant de saisir des données réelles.'], keywords: 'configuration logo année scolaire frais tranches scolarité réglages', icon: Settings2, category: 'Configuration' },
  { view: 'classes', title: 'Classes', short: 'Organiser les niveaux de l’établissement', intro: 'Les classes doivent être prêtes avant d’inscrire les élèves.', steps: ['Ouvrez Classes.', 'Créez ou vérifiez chaque niveau utilisé par l’école.', 'Contrôlez les noms pour éviter les doublons ou les variantes inutiles.', 'Utilisez ces classes lors des inscriptions.'], keywords: 'niveaux classe maternelle primaire jardin', icon: GraduationCap, category: 'Scolarité' },
  { view: 'inscriptions', title: 'Inscriptions et élèves', short: 'Ajouter, retrouver et gérer les fiches élèves', intro: 'Une fiche élève doit être exacte : elle sert au suivi scolaire et financier.', steps: ['Vérifiez d’abord que la classe et les frais nécessaires sont configurés.', 'Ouvrez Inscriptions / élèves et choisissez l’action d’ajout.', 'Renseignez les informations demandées et vérifiez l’orthographe du nom.', 'Contrôlez la classe et les frais avant d’enregistrer.', 'Recherchez ensuite l’élève pour vérifier sa fiche.'], keywords: 'élève inscrire ajouter fiche parent téléphone matricule', icon: Users, category: 'Scolarité' },
  { view: 'cartes', title: 'Cartes scolaires', short: 'Préparer une carte et contrôler son impression', intro: 'Vérifiez les informations de l’élève et l’identité visuelle de l’école avant d’imprimer.', steps: ['Vérifiez le nom et le logo dans Paramètres.', 'Ouvrez Cartes scolaires et sélectionnez l’élève concerné.', 'Vérifiez les informations affichées sur la carte.', 'Contrôlez l’aperçu complet avant d’imprimer ou d’exporter en PDF.', 'Si une information manque, corrigez la fiche élève puis contrôlez à nouveau l’aperçu.'], keywords: 'carte scolaire photo portrait imprimer pdf matricule', icon: IdCard, category: 'Scolarité' },
  { view: 'bulletins', title: 'Bulletins scolaires', short: 'Vérifier les périodes, notes et aperçu', intro: 'Le bulletin doit être contrôlé avant toute impression ou transmission.', steps: ['Vérifiez les périodes scolaires configurées dans Paramètres.', 'Sélectionnez l’élève et la période concernée.', 'Vérifiez les notes, matières et informations affichées.', 'Contrôlez l’aperçu avant l’impression ou l’export disponible.', 'Ne transmettez pas un bulletin tant que les informations ne sont pas vérifiées.'], keywords: 'notes moyenne trimestre résultats bulletin imprimer pdf', icon: ClipboardList, category: 'Scolarité' },
  { view: 'paiements', title: 'Paiements', short: 'Enregistrer un règlement et vérifier le solde', intro: 'Un paiement doit correspondre à une somme réellement reçue par l’établissement.', steps: ['Recherchez le bon élève.', 'Vérifiez le type de frais et la tranche concernée.', 'Saisissez uniquement le montant effectivement reçu.', 'Vérifiez le montant enregistré et le solde restant.', 'En cas d’erreur, vérifiez les possibilités de correction avant de poursuivre.'], keywords: 'encaissement versement reçu solde frais scolarité tranche', icon: CreditCard, category: 'Finance' },
  { view: 'cahier', title: 'Cahier de caisse', short: 'Consulter le suivi de caisse', intro: 'Utilisez le cahier de caisse pour examiner les mouvements et les montants présentés par l’application.', steps: ['Ouvrez Cahier de caisse.', 'Vérifiez la période et les mouvements affichés.', 'Comparez les montants avec les pièces ou reçus de l’école.', 'Si une donnée est incorrecte, retrouvez l’opération dans le module d’origine.'], keywords: 'caisse recettes mouvements trésorerie encaissement', icon: Wallet, category: 'Finance' },
  { view: 'impayes', title: 'Impayés par tranche', short: 'Repérer les frais qui restent à payer', intro: 'Ce module aide à repérer les soldes restants à partir des paiements enregistrés.', steps: ['Ouvrez Impayés par tranche.', 'Repérez l’élève, le type de frais et la tranche concernés.', 'Vérifiez la fiche de l’élève et les règlements déjà saisis.', 'Contactez la famille selon les procédures de votre école ; ne vous basez pas sur un chiffre non vérifié.'], keywords: 'impayé dette retard reste dû tranche solde famille', icon: AlertCircle, category: 'Finance' },
  { view: 'depenses', title: 'Dépenses', short: 'Enregistrer et consulter les dépenses', intro: 'Enregistrez les dépenses de façon cohérente pour faciliter le suivi financier.', steps: ['Ouvrez Dépenses.', 'Renseignez le libellé, le montant, la catégorie et la date demandés.', 'Vérifiez le montant avant l’enregistrement.', 'Conservez les justificatifs de l’opération selon les règles de l’école.'], keywords: 'sorties argent dépenses salaires fournitures entretien date', icon: Receipt, category: 'Finance' },
  { view: 'enseignants', title: 'Enseignants et salaires', short: 'Gérer les fiches et le suivi des salaires', intro: 'Vérifiez les informations du personnel et les montants avant d’enregistrer un règlement.', steps: ['Ouvrez Enseignants & Salaires.', 'Vérifiez les informations de l’enseignant et son salaire mensuel.', 'Lors d’un règlement, contrôlez la période et le montant.', 'Vérifiez l’historique affiché après l’enregistrement.'], keywords: 'personnel professeur enseignant paie salaire mois', icon: UserRound, category: 'Finance' },
  { view: 'stocks', title: 'Stocks et fournitures', short: 'Suivre les articles, les quantités et les prix', intro: 'Gardez les quantités et les prix à jour pour mieux suivre les articles de l’école.', steps: ['Ouvrez Stocks et choisissez la catégorie d’articles disponible.', 'Vérifiez les quantités existantes avant de saisir un mouvement.', 'Renseignez les prix et quantités avec attention.', 'Après une entrée ou une vente, contrôlez le stock restant affiché.', 'Faites un contrôle physique régulier pour repérer les écarts.'], keywords: 'stock livres uniformes fournitures cahiers stylos prix quantité rupture', icon: Boxes, category: 'Finance' },
];

const QUESTS = [
  { title: 'Vérifier l’identité de l’école', detail: 'Contrôlez le nom, le logo et l’année scolaire.', view: 'parametres' as AppView, icon: Settings2 },
  { title: 'Préparer les classes', detail: 'Vérifiez les niveaux réellement utilisés.', view: 'classes' as AppView, icon: GraduationCap },
  { title: 'Configurer les frais', detail: 'Contrôlez les frais et les tranches avant les inscriptions.', view: 'parametres' as AppView, icon: Wallet },
  { title: 'Créer une fiche élève de test', detail: 'Essayez le parcours avec des données fictives avant de saisir des données réelles.', view: 'inscriptions' as AppView, icon: Users },
  { title: 'Vérifier une carte scolaire', detail: 'Contrôlez les informations et l’aperçu avant impression.', view: 'cartes' as AppView, icon: IdCard },
  { title: 'Découvrir les paiements et les bulletins', detail: 'Repérez où vérifier les règlements et les résultats scolaires.', view: 'paiements' as AppView, icon: ClipboardList },
];

const STORAGE_KEY = 'gestilys-guide-progress:';

export function UserGuide({ open, mode, view, schoolName, schoolId, onClose, onNavigate, onStartStudent }: GuideProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [loadedSchoolId, setLoadedSchoolId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedArticleView, setSelectedArticleView] = useState<AppView | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY + schoolId);
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      setCompleted(Array.isArray(parsed) ? parsed.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < QUESTS.length) : []);
    } catch {
      setCompleted([]);
    }
    setLoadedSchoolId(schoolId);
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId || loadedSchoolId !== schoolId) return;
    try { localStorage.setItem(STORAGE_KEY + schoolId, JSON.stringify(completed)); } catch { /* Help remains available if storage is blocked. */ }
  }, [completed, schoolId, loadedSchoolId]);

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedArticleView(null);
      if (mode === 'onboarding') setStepIndex(0);
    }
  }, [open, mode]);

  const filteredArticles = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('fr');
    if (!q) return ARTICLES;
    return ARTICLES.filter(article =>
      (article.title + ' ' + article.short + ' ' + article.intro + ' ' + article.keywords)
        .toLocaleLowerCase('fr').includes(q)
    );
  }, [search]);

  if (!open) return null;

  const selectedArticle = ARTICLES.find(article => article.view === selectedArticleView) || null;
  const activeQuest = QUESTS[Math.min(stepIndex, QUESTS.length - 1)];
  const ActiveIcon = activeQuest.icon;
  const progress = Math.round(completed.length / QUESTS.length * 100);
  const isQuest = mode === 'onboarding';
  const title = isQuest ? 'Bien démarrer avec Gestilys' : mode === 'module' ? (ARTICLES.find(a => a.view === view)?.title || 'Mode d’emploi') : 'Centre d’aide Gestilys';
  const intro = isQuest
    ? 'Un parcours pratique pour préparer votre espace. Vous pouvez le quitter et revenir plus tard : votre progression est conservée pour cet établissement.'
    : mode === 'module'
      ? (ARTICLES.find(a => a.view === view)?.intro || 'Repères pratiques pour utiliser ce module.')
      : 'Recherchez une fonction, choisissez un module ou consultez les réponses aux questions fréquentes.';
  const actionClass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300';
  const navigateTo = (target: AppView) => { onClose(); onNavigate(target); };
  const openQuest = () => {
    const target = activeQuest.view;
    onClose();
    onNavigate(target);
    if (target === 'inscriptions') onStartStudent();
  };
  const markDone = () => {
    setCompleted(old => old.includes(stepIndex) ? old : [...old, stepIndex]);
    if (stepIndex < QUESTS.length - 1) setStepIndex(stepIndex + 1);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#101a37]/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="relative max-h-[95dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-blue-100 bg-[#f5f8ff] shadow-2xl sm:rounded-3xl">
        <header className="relative overflow-hidden bg-gradient-to-br from-[#172554] via-[#1d4ed8] to-[#2563eb] px-5 pb-6 pt-5 text-white sm:px-8 sm:pt-7">
          <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border-[28px] border-[#f4bd35]/25" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#f4bd35]/50 bg-[#f4bd35] text-[#172554] shadow-lg"><BookOpen className="h-6 w-6" /></span>
              <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ffe08a]">GESTILYS · AIDE INTÉGRÉE</p><h2 className="mt-1 text-xl font-black sm:text-2xl">{title}</h2><p className="mt-1 truncate text-xs font-semibold text-blue-100">{schoolName || 'Votre établissement'}</p></div>
            </div>
            <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-white/40 bg-[#172554] text-white hover:bg-[#243b7a]" aria-label="Fermer le centre d’aide"><X className="h-5 w-5" /></button>
          </div>
          <p className="relative mt-4 max-w-2xl text-sm font-medium leading-6 text-blue-50">{intro}</p>
          {isQuest && <div className="relative mt-5"><div className="flex items-center justify-between gap-3 text-xs font-extrabold"><span>VOTRE PROGRESSION</span><span>{completed.length}/{QUESTS.length} étapes · {progress}%</span></div><div className="mt-2 h-3 overflow-hidden rounded-full border border-white/30 bg-[#10204c]"><div className="h-full rounded-full bg-gradient-to-r from-[#f4bd35] to-[#ffe7a0] transition-all" style={{ width: progress + '%' }} /></div></div>}
        </header>

        <main className="space-y-4 p-4 sm:p-7">
          {isQuest ? <>
            <div className="grid grid-cols-6 gap-2">{QUESTS.map((quest, i) => <button key={quest.title} type="button" onClick={() => setStepIndex(i)} aria-label={'Étape ' + (i + 1) + ': ' + quest.title} className={'flex min-h-12 items-center justify-center rounded-xl border-2 px-1 text-sm font-black transition ' + (i === stepIndex ? 'border-[#172554] bg-[#172554] text-white shadow-md' : completed.includes(i) ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-blue-200 bg-white text-[#243b7a] hover:border-blue-500')}><span>{completed.includes(i) ? '✓' : String(i + 1).padStart(2, '0')}</span></button>)}</div>
            <section className="rounded-2xl border-2 border-blue-200 bg-white p-5 shadow-[0_8px_24px_rgba(23,37,84,.08)] sm:p-6">
              <div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-blue-200 bg-blue-50 text-[#1d4ed8]"><ActiveIcon className="h-6 w-6" /></span><div className="flex-1"><p className="text-xs font-black uppercase tracking-wider text-[#1d4ed8]">ÉTAPE {stepIndex + 1} SUR {QUESTS.length}</p><h3 className="mt-1 text-lg font-black text-[#172554]">{activeQuest.title}</h3><p className="mt-2 text-sm font-medium leading-6 text-slate-700">{activeQuest.detail}</p></div></div>
              <div className="mt-5 rounded-xl border-l-4 border-[#f4bd35] bg-[#fff8df] p-4"><p className="text-sm font-extrabold text-[#713f12]">À faire</p><p className="mt-1 text-sm leading-5 text-[#57360a]">Ouvrez l’étape, effectuez l’action dans Gestilys, puis revenez valider. Pour vos premiers essais, utilisez des données fictives et n’enregistrez aucun faux paiement dans les dossiers réels.</p></div>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={openQuest} className={actionClass + ' flex-1 bg-gradient-to-r from-[#f9d56e] to-[#f4bd35] text-[#172554] shadow-md shadow-amber-500/20 hover:brightness-105'}>Ouvrir cette étape <ArrowUpRight className="h-4 w-4" /></button><button type="button" onClick={markDone} className={actionClass + ' border-2 border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700'}>Étape terminée <CheckCircle2 className="h-4 w-4" /></button></div>
              <div className="mt-4 flex gap-2"><button type="button" disabled={stepIndex === 0} onClick={() => setStepIndex(i => Math.max(0, i - 1))} className={actionClass + ' flex-1 border-2 border-blue-200 bg-white text-[#172554] disabled:opacity-40'}><ChevronLeft className="h-4 w-4" /> Précédent</button><button type="button" disabled={stepIndex === QUESTS.length - 1} onClick={() => setStepIndex(i => Math.min(QUESTS.length - 1, i + 1))} className={actionClass + ' flex-1 border-2 border-blue-200 bg-white text-[#172554] disabled:opacity-40'}>Suivant <ChevronRight className="h-4 w-4" /></button></div>
            </section>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs font-semibold text-slate-600">Vous pouvez quitter ce parcours à tout moment et le reprendre depuis le centre d’aide.</p><button type="button" onClick={() => { setStepIndex(0); setCompleted([]); }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border-2 border-blue-200 bg-white px-3 py-2 text-xs font-extrabold text-[#172554] hover:bg-blue-50"><RotateCcw className="h-4 w-4" /> Réinitialiser la progression</button></div>
            {completed.length === QUESTS.length && <div className="rounded-2xl border-2 border-emerald-600 bg-emerald-50 p-5 text-emerald-950"><div className="flex items-center gap-2 font-black"><Trophy className="h-6 w-6 text-amber-600" /> Parcours terminé</div><p className="mt-1 text-sm">Les étapes du démarrage ont été validées. Vous pouvez retrouver les guides détaillés dans le centre d’aide.</p></div>}
            <button type="button" onClick={() => { onClose(); }} className={actionClass + ' w-full border-2 border-blue-200 bg-white text-[#172554]'}><CircleHelp className="h-4 w-4" /> Ouvrir le centre d’aide plus tard</button>
          </> : mode === 'module' ? <>
            {(() => { const article = ARTICLES.find(a => a.view === view); return article ? <><div className="rounded-2xl border-2 border-blue-200 bg-white p-5"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><article.icon className="h-5 w-5" /></span><div><h3 className="text-base font-black text-[#172554]">{article.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{article.intro}</p></div></div></div><div className="space-y-3">{article.steps.map((step, i) => <div key={step} className="flex gap-3 rounded-2xl border-2 border-blue-100 bg-white p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#172554] text-sm font-black text-white">{i + 1}</span><p className="pt-1 text-sm font-semibold leading-6 text-slate-700">{step}</p></div>)}</div></> : <p className="rounded-2xl bg-white p-5 text-sm text-slate-700">Ouvrez le centre d’aide pour choisir un module.</p>; })()}
            <div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={onClose} className={actionClass + ' flex-1 border-2 border-blue-200 bg-white text-[#172554]'}>Fermer le guide</button><button type="button" onClick={() => navigateTo(view)} className={actionClass + ' flex-1 bg-[#172554] text-white hover:bg-[#243b7a]'}>Ouvrir le module <ChevronRight className="h-4 w-4" /></button></div>
          </> : selectedArticle ? <>
            <button type="button" onClick={() => setSelectedArticleView(null)} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-extrabold text-blue-800 hover:bg-blue-50"><ChevronLeft className="h-4 w-4" /> Retour aux rubriques</button>
            <section className="rounded-2xl border-2 border-blue-200 bg-white p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700"><selectedArticle.icon className="h-6 w-6" /></span><div><p className="text-xs font-black uppercase tracking-wider text-blue-700">{selectedArticle.category}</p><h3 className="mt-1 text-lg font-black text-[#172554]">{selectedArticle.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{selectedArticle.intro}</p></div></div><div className="mt-5 space-y-3">{selectedArticle.steps.map((step, i) => <div key={step} className="flex gap-3 rounded-xl border border-blue-100 bg-[#f8faff] p-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#172554] text-sm font-black text-white">{i + 1}</span><p className="pt-1 text-sm leading-6 text-slate-700">{step}</p></div>)}</div><button type="button" onClick={() => navigateTo(selectedArticle.view)} className={actionClass + ' mt-5 w-full bg-gradient-to-r from-[#f9d56e] to-[#f4bd35] text-[#172554]'}>Ouvrir {selectedArticle.title} <ChevronRight className="h-4 w-4" /></button></section>
          </> : <>
            <label className="block"><span className="mb-2 block text-sm font-extrabold text-[#172554]">Que souhaitez-vous faire ?</span><span className="flex min-h-12 items-center gap-3 rounded-xl border-2 border-blue-200 bg-white px-3 focus-within:border-blue-600"><Search className="h-5 w-5 shrink-0 text-blue-700" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ex. inscrire un élève, imprimer une carte…" className="min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400" /></span></label>
            <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-[#172554]">Vous débutez sur Gestilys ?</p><p className="mt-1 text-sm text-slate-600">Suivez les étapes de préparation, sans devoir tout apprendre d’un coup.</p></div><button type="button" onClick={() => { setStepIndex(0); setSelectedArticleView(null); onClose(); }} className={actionClass + ' shrink-0 bg-gradient-to-r from-[#f9d56e] to-[#f4bd35] text-[#172554]'}><Sparkles className="h-4 w-4" /> Parcours guidé</button></div>
            <div className="flex items-center justify-between gap-3"><h3 className="text-base font-black text-[#172554]">Guides par module</h3><span className="text-xs font-bold text-slate-500">{filteredArticles.length} rubrique(s)</span></div>
            {filteredArticles.length ? <div className="grid gap-3 sm:grid-cols-2">{filteredArticles.map(article => { const Icon = article.icon; return <button key={article.view} type="button" onClick={() => setSelectedArticleView(article.view)} className="flex min-h-[108px] items-start gap-3 rounded-2xl border-2 border-blue-100 bg-white p-4 text-left shadow-sm transition hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><strong className="block text-sm font-black text-[#172554]">{article.title}</strong><span className="mt-1 block text-xs leading-5 text-slate-600">{article.short}</span><span className="mt-2 block text-[10px] font-extrabold uppercase tracking-wide text-blue-700">{article.category}</span></span><ChevronRight className="mt-1 h-4 w-4 shrink-0 text-blue-700" /></button>; })}</div> : <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-white p-6 text-center"><Search className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-2 font-bold text-[#172554]">Aucune rubrique trouvée</p><p className="mt-1 text-sm text-slate-600">Essayez un autre mot, par exemple « élève », « frais », « stock » ou « carte ».</p></div>}
            <section className="rounded-2xl border border-amber-200 bg-[#fff8df] p-4"><p className="font-black text-[#713f12]">Conseil de sécurité</p><p className="mt-1 text-sm leading-6 text-[#57360a]">Avant d’enregistrer une opération financière ou de modifier des dossiers, vérifiez l’élève, le montant et les informations. Pour découvrir Gestilys, privilégiez des données fictives.</p></section>
          </>}
          <footer className="flex flex-col-reverse gap-2 border-t-2 border-blue-100 pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs font-semibold text-slate-500">Gestilys · Un guide pratique, accessible à tout moment</p><button type="button" onClick={onClose} className={actionClass + ' border-2 border-slate-300 bg-white text-slate-800 hover:bg-slate-100'}><X className="h-4 w-4" /> Fermer</button></footer>
        </main>
      </div>
    </div>
  );
}
