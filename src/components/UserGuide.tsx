import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronRight, GraduationCap, Settings2, Users, Wallet, X, Sparkles, Trophy, RotateCcw, IdCard, ClipboardList } from 'lucide-react';
import type { AppView } from '../types';

interface GuideProps {
  open: boolean;
  mode: 'onboarding' | 'module' | 'help';
  view: AppView;
  schoolName: string;
  onClose: () => void;
  onNavigate: (view: AppView) => void;
  onStartStudent: () => void;
}

const QUESTS = [
  { title: 'Personnaliser mon école', detail: 'Vérifiez le nom, ajoutez le logo et choisissez l’année scolaire.', view: 'parametres' as AppView, icon: Settings2, color: 'blue' },
  { title: 'Préparer les classes', detail: 'Créez les classes utilisées par votre établissement.', view: 'classes' as AppView, icon: GraduationCap, color: 'violet' },
  { title: 'Configurer les frais', detail: 'Vérifiez les frais, les tranches et les montants par classe.', view: 'parametres' as AppView, icon: Wallet, color: 'gold' },
  { title: 'Inscrire le premier élève', detail: 'Ajoutez un élève de démonstration et vérifiez sa classe.', view: 'inscriptions' as AppView, icon: Users, color: 'teal' },
  { title: 'Préparer une carte scolaire', detail: 'Ouvrez les cartes, vérifiez les informations et contrôlez l’aperçu avant impression.', view: 'cartes' as AppView, icon: IdCard, color: 'blue' },
  { title: 'Découvrir les bulletins', detail: 'Ouvrez le module, vérifiez les périodes et contrôlez l’aperçu disponible.', view: 'bulletins' as AppView, icon: ClipboardList, color: 'gold' },
];

const MODULE_GUIDES: Partial<Record<AppView, { title: string; intro: string; steps: string[] }>> = {
  parametres: { title: 'Bien configurer votre école', intro: 'Ces réglages évitent les blocages pendant les inscriptions.', steps: ['Vérifiez le nom et le logo de l’établissement.', 'Créez les classes réellement utilisées.', 'Configurez les frais et les montants par classe.', 'Vérifiez les tranches et l’année scolaire.'] },
  classes: { title: 'Guide des classes', intro: 'Organisez les classes avant les inscriptions.', steps: ['Créez chaque classe avec son nom exact.', 'Vérifiez que les classes sont actives.', 'Associez les montants de scolarité aux classes.'] },
  inscriptions: { title: 'Guide des inscriptions', intro: 'Ajoutez un élève et préparez le suivi de ses frais.', steps: ['Choisissez une classe créée dans Paramètres.', 'Renseignez l’identité de l’élève.', 'Vérifiez les frais avant d’enregistrer.', 'Consultez sa fiche après l’inscription.'] },
  paiements: { title: 'Guide des paiements', intro: 'Enregistrez uniquement les règlements réellement reçus.', steps: ['Recherchez l’élève concerné.', 'Choisissez le frais et la tranche.', 'Saisissez le montant reçu.', 'Vérifiez le solde et le reçu.'] },
  cartes: { title: 'Guide des cartes scolaires', intro: 'Préparez une carte claire et fidèle à votre établissement.', steps: ['Vérifiez le nom et le logo dans Paramètres.', 'Choisissez un élève et vérifiez ses informations.', 'Contrôlez l’aperçu avant impression ou export PDF.'] },
  bulletins: { title: 'Guide des bulletins', intro: 'Vérifiez les informations scolaires avant toute impression.', steps: ['Vérifiez les périodes dans Paramètres.', 'Saisissez ou vérifiez les notes disponibles.', 'Contrôlez le nom, la classe et l’aperçu imprimable.'] },
  stocks: { title: 'Guide des stocks', intro: 'Suivez les articles et évitez les ruptures.', steps: ['Ajoutez les articles avec prix et quantité.', 'Enregistrez les mouvements.', 'Contrôlez les quantités restantes.'] },
};

export function UserGuide({ open, mode, view, schoolName, onClose, onNavigate, onStartStudent }: GuideProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  useEffect(() => { if (open) { setStepIndex(0); setCompleted([]); } }, [open, mode]);
  if (!open) return null;

  const moduleGuide = MODULE_GUIDES[view];
  const isQuest = mode === 'onboarding';
  const title = isQuest ? 'Votre parcours de démarrage' : mode === 'help' ? 'Centre d’aide Gestilys' : (moduleGuide?.title || 'Bien utiliser ce module');
  const intro = isQuest
    ? 'Avancez étape par étape, comme une mission. Ouvrez chaque rubrique, effectuez l’action dans Gestilys, puis validez votre progression.'
    : mode === 'help' ? 'Choisissez une rubrique ou reprenez le parcours de démarrage.' : (moduleGuide?.intro || 'Voici quelques conseils pour commencer.');
  const go = (target: AppView) => { onClose(); onNavigate(target); };
  const markDone = () => { setCompleted(old => old.includes(stepIndex) ? old : [...old, stepIndex]); if (stepIndex < QUESTS.length - 1) setStepIndex(stepIndex + 1); };
  const activeQuest = QUESTS[stepIndex];
  const ActiveIcon = activeQuest.icon;
  const percent = Math.round(completed.length / QUESTS.length * 100);

  const actionClass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300';
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#101a37]/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="relative max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-blue-100 bg-[#f5f8ff] shadow-2xl sm:rounded-3xl">
        <header className="relative overflow-hidden bg-gradient-to-br from-[#172554] via-[#1d4ed8] to-[#2563eb] px-5 pb-6 pt-6 text-white sm:px-8 sm:pt-8">
          <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border-[28px] border-[#f4bd35]/25" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#f4bd35]/50 bg-[#f4bd35] text-[#172554] shadow-lg"><BookOpen className="h-6 w-6" /></span>
              <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ffe08a]">GESTILYS · GUIDE INTERACTIF</p><h2 className="mt-1 text-xl font-black sm:text-2xl">{title}</h2><p className="mt-1 text-xs font-semibold text-blue-100">{schoolName || 'Votre établissement'}</p></div>
            </div>
            <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-white/40 bg-[#172554] text-white hover:bg-[#243b7a]" aria-label="Quitter le tutoriel"><X className="h-5 w-5" /></button>
          </div>
          <p className="relative mt-5 max-w-xl text-sm font-medium leading-6 text-blue-50">{intro}</p>
          {isQuest && <div className="relative mt-5"><div className="flex items-center justify-between text-xs font-extrabold"><span>PROGRESSION</span><span>{completed.length}/{QUESTS.length} missions · {percent}%</span></div><div className="mt-2 h-3 overflow-hidden rounded-full border border-white/30 bg-[#10204c]"><div className="h-full rounded-full bg-gradient-to-r from-[#f4bd35] to-[#ffe7a0] transition-all" style={{ width: percent + '%' }} /></div></div>}
        </header>
        <main className="space-y-4 p-4 sm:p-7">
          {isQuest ? <>
            <div className="grid grid-cols-6 gap-2">{QUESTS.map((q, i) => <button key={q.title} type="button" onClick={() => setStepIndex(i)} aria-label={'Mission ' + (i + 1) + ': ' + q.title} className={'flex min-h-12 items-center justify-center gap-1 rounded-xl border-2 px-1 text-sm font-black transition ' + (i === stepIndex ? 'border-[#172554] bg-[#172554] text-white shadow-md' : completed.includes(i) ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-blue-200 bg-white text-[#243b7a] hover:border-blue-500')}><span>{completed.includes(i) ? '✓' : String(i + 1).padStart(2, '0')}</span></button>)}</div>
            <section className="rounded-2xl border-2 border-blue-200 bg-white p-5 shadow-[0_8px_24px_rgba(23,37,84,.08)] sm:p-6">
              <div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-blue-200 bg-blue-50 text-[#1d4ed8]"><ActiveIcon className="h-6 w-6" /></span><div className="flex-1"><p className="text-xs font-black uppercase tracking-wider text-[#1d4ed8]">MISSION {stepIndex + 1} SUR {QUESTS.length}</p><h3 className="mt-1 text-lg font-black text-[#172554]">{activeQuest.title}</h3><p className="mt-2 text-sm font-medium leading-6 text-slate-700">{activeQuest.detail}</p></div></div>
              <div className="mt-5 rounded-xl border-l-4 border-[#f4bd35] bg-[#fff8df] p-4"><p className="text-sm font-extrabold text-[#713f12]">Votre objectif</p><p className="mt-1 text-sm leading-5 text-[#57360a]">Appuyez sur « Ouvrir cette étape », réalisez l’action dans Gestilys, puis revenez ici pour valider. Ne saisissez que des données de test si vous découvrez le logiciel.</p></div>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => { onClose(); onNavigate(activeQuest.view); if (activeQuest.view === 'inscriptions') onStartStudent(); }} className={actionClass + ' flex-1 bg-gradient-to-r from-[#f9d56e] to-[#f4bd35] text-[#172554] shadow-md shadow-amber-500/20 hover:brightness-105'}>Ouvrir cette étape <ChevronRight className="h-4 w-4" /></button><button type="button" onClick={markDone} className={actionClass + ' border-2 border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700'}>J’ai terminé <CheckCircle2 className="h-4 w-4" /></button></div>
            </section>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs font-semibold text-slate-600">La progression est temporaire dans cette session. Vous pouvez reprendre une mission à tout moment.</p><button type="button" onClick={() => { setStepIndex(0); setCompleted([]); }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border-2 border-blue-200 bg-white px-3 py-2 text-xs font-extrabold text-[#172554] hover:bg-blue-50"><RotateCcw className="h-4 w-4" /> Recommencer</button></div>
            {completed.length === QUESTS.length && <div className="rounded-2xl border-2 border-emerald-600 bg-emerald-50 p-5 text-emerald-950"><div className="flex items-center gap-2 font-black"><Trophy className="h-6 w-6 text-amber-600" /> Parcours terminé !</div><p className="mt-1 text-sm">Vous avez parcouru les étapes essentielles de prise en main de Gestilys.</p></div>}
          </> : mode === 'help' ? <>
            <p className="text-sm font-semibold text-slate-700">Choisissez une rubrique. Les boutons bleus foncés et dorés indiquent clairement les actions disponibles.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { title: 'Paramètres et scolarités', detail: 'Logo, classes, frais et tranches', icon: Settings2, target: 'parametres' as AppView },
                { title: 'Gérer les classes', detail: 'Créer les niveaux utilisés', icon: GraduationCap, target: 'classes' as AppView },
                { title: 'Ajouter un élève', detail: 'Ouvrir le formulaire d’inscription', icon: Users, target: 'inscriptions' as AppView },
                { title: 'Suivre les paiements', detail: 'Règlements, reçus et soldes', icon: Wallet, target: 'paiements' as AppView },
                { title: 'Cartes scolaires', detail: 'Vérifier les cartes et l’impression', icon: IdCard, target: 'cartes' as AppView },
                { title: 'Bulletins scolaires', detail: 'Vérifier les périodes et l’aperçu', icon: ClipboardList, target: 'bulletins' as AppView },
              ].map(item => { const Icon = item.icon; return <button key={item.title} type="button" onClick={() => go(item.target)} className="flex min-h-[76px] items-center gap-3 rounded-2xl border-2 border-blue-200 bg-white p-4 text-left shadow-sm hover:border-blue-500 hover:bg-blue-50"><Icon className="h-6 w-6 shrink-0 text-[#1d4ed8]" /><span className="flex-1"><strong className="block text-sm font-black text-[#172554]">{item.title}</strong><span className="mt-1 block text-xs font-semibold text-slate-700">{item.detail}</span></span><ChevronRight className="h-5 w-5 shrink-0 text-[#1d4ed8]" /></button>; })}
            </div>
            <button type="button" onClick={() => { setStepIndex(0); setCompleted([]); }} className={actionClass + ' w-full bg-gradient-to-r from-[#f9d56e] to-[#f4bd35] text-[#172554]'}><Sparkles className="h-4 w-4" /> Reprendre le parcours guidé</button>
          </> : <>
            <div className="rounded-2xl border-2 border-blue-200 bg-white p-5"><p className="text-base font-black text-[#172554]">{moduleGuide?.title || 'Conseils pour ce module'}</p><p className="mt-2 text-sm leading-6 text-slate-700">{moduleGuide?.intro || 'Utilisez le centre d’aide pour ouvrir le module souhaité.'}</p></div>
            <div className="space-y-3">{(moduleGuide?.steps || ['Ouvrez le centre d’aide et choisissez un module.']).map((detail, i) => <div key={detail} className="flex gap-3 rounded-2xl border-2 border-blue-100 bg-white p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#172554] text-sm font-black text-white">{i + 1}</span><p className="pt-1 text-sm font-semibold leading-6 text-slate-700">{detail}</p></div>)}</div>
          </>}
          <footer className="flex flex-col-reverse gap-2 border-t-2 border-blue-100 pt-4 sm:flex-row sm:items-center sm:justify-between"><button type="button" onClick={onClose} className={actionClass + ' border-2 border-slate-400 bg-white text-slate-800 hover:bg-slate-100'}><X className="h-4 w-4" /> Quitter le tutoriel</button>{!isQuest && <button type="button" onClick={() => go('parametres')} className={actionClass + ' bg-[#172554] text-white hover:bg-[#243b7a]'}>{mode === 'module' ? 'Compris, continuer' : 'Ouvrir les paramètres'} <ChevronRight className="h-4 w-4" /></button>}</footer>
        </main>
      </div>
    </div>
  );
}
