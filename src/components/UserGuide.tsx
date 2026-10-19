import { BookOpen, CheckCircle2, ChevronRight, GraduationCap, HelpCircle, Settings2, Users, Wallet, X } from 'lucide-react';
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

const MODULE_GUIDES: Partial<Record<AppView, { title: string; intro: string; steps: string[] }>> = {
  parametres: { title: 'Bien configurer votre école', intro: 'Ces réglages évitent les blocages pendant les inscriptions.', steps: ['Ajoutez le logo et vérifiez le nom de l’établissement.', 'Dans les classes, créez les niveaux et classes réellement utilisés.', 'Dans les frais scolaires, configurez la scolarité, le mode de paiement et les montants par classe.', 'Vérifiez les tranches et l’année scolaire avant d’inscrire les élèves.'] },
  classes: { title: 'Guide du module Classes', intro: 'Organisez les classes avant de commencer les inscriptions.', steps: ['Créez chaque classe avec son nom exact.', 'Vérifiez que les classes sont actives.', 'Retournez dans Paramètres pour associer les montants de scolarité à chaque classe.'] },
  inscriptions: { title: 'Guide des inscriptions', intro: 'Ajoutez un élève et préparez le suivi de ses frais.', steps: ['Choisissez une classe déjà créée dans Paramètres > Classes.', 'Renseignez le prénom, le nom et les informations utiles.', 'Vérifiez les frais cochés et le total calculé.', 'Enregistrez l’inscription, puis consultez la fiche de l’élève.'] },
  paiements: { title: 'Guide des paiements', intro: 'Enregistrez les règlements et gardez une trace fiable.', steps: ['Recherchez l’élève concerné.', 'Choisissez le frais et la tranche appropriés.', 'Saisissez uniquement le montant réellement reçu.', 'Vérifiez le solde restant et préparez le reçu si nécessaire.'] },
  impayes: { title: 'Guide des impayés', intro: 'Repérez les soldes à suivre sans confondre dû et encaissé.', steps: ['Filtrez les classes ou les tranches.', 'Vérifiez le montant restant par élève.', 'Utilisez les relances WhatsApp avec tact et confirmez les paiements dans le module Paiements.'] },
  stocks: { title: 'Guide des stocks', intro: 'Suivez les articles et évitez les ruptures.', steps: ['Ajoutez les articles avec leur prix et leur quantité initiale.', 'Enregistrez les achats et les sorties au moment où ils ont lieu.', 'Contrôlez régulièrement les quantités restantes et les alertes de stock bas.'] },
  cartes: { title: 'Guide des cartes scolaires', intro: 'Préparez des cartes cohérentes avec l’identité de votre établissement.', steps: ['Vérifiez le nom et le logo dans Paramètres.', 'Choisissez les élèves et vérifiez leurs informations.', 'Contrôlez l’aperçu avant impression ou export PDF.'] },
  bulletins: { title: 'Guide des bulletins', intro: 'Configurez les périodes et vérifiez chaque bulletin avant impression.', steps: ['Vérifiez les périodes de notation dans Paramètres.', 'Saisissez ou vérifiez les notes et appréciations disponibles.', 'Contrôlez le nom de l’élève, la classe et l’aperçu imprimable.'] },
  enseignants: { title: 'Guide des enseignants et salaires', intro: 'Centralisez les informations et les paiements du personnel.', steps: ['Ajoutez les enseignants avec leurs informations exactes.', 'Vérifiez les montants convenus.', 'Enregistrez chaque paiement et contrôlez l’historique.'] },
  depenses: { title: 'Guide des dépenses', intro: 'Enregistrez les sorties d’argent pour obtenir des chiffres fiables.', steps: ['Ajoutez une dépense avec son motif et son montant.', 'Vérifiez la date et la catégorie.', 'Comparez les dépenses aux recettes dans le tableau de bord.'] },
  cahier: { title: 'Guide du cahier de caisse', intro: 'Consultez les mouvements financiers enregistrés dans Gestilys.', steps: ['Enregistrez d’abord les paiements dans le module Paiements.', 'Ajoutez les dépenses dans le module Dépenses.', 'Utilisez le cahier de caisse pour contrôler les montants.'] },
  statistiques: { title: 'Guide des statistiques', intro: 'Utilisez les indicateurs pour piloter votre établissement.', steps: ['Vérifiez que les inscriptions et les paiements sont à jour.', 'Comparez les recettes encaissées, les impayés et les dépenses.', 'Les chiffres dépendent des données réellement saisies.'] },
};

export function UserGuide({ open, mode, view, schoolName, onClose, onNavigate, onStartStudent }: GuideProps) {
  if (!open) return null;
  const moduleGuide = MODULE_GUIDES[view];
  const title = mode === 'onboarding' ? 'Bienvenue sur Gestilys' : mode === 'help' ? 'Centre d’aide Gestilys' : (moduleGuide?.title || 'Bien utiliser ce module');
  const intro = mode === 'onboarding'
    ? 'En quelques étapes, préparez votre espace pour pouvoir inscrire votre premier élève sans rester bloqué.'
    : mode === 'help'
      ? 'Retrouvez les étapes essentielles ou ouvrez directement le module dont vous avez besoin.'
      : (moduleGuide?.intro || 'Voici quelques conseils pour commencer.');

  const go = (target: AppView) => { onClose(); onNavigate(target); };
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="relative max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/70 bg-white shadow-2xl sm:rounded-3xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 px-5 pb-6 pt-6 text-white sm:px-8 sm:pt-8">
          <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border-[28px] border-amber-300/15" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 text-amber-300"><BookOpen className="h-6 w-6" /></span>
              <div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-amber-300">GESTILYS · CENTRE D’AIDE</p><h2 className="mt-1 text-xl font-extrabold sm:text-2xl">{title}</h2><p className="mt-1 text-xs text-blue-100">{schoolName || 'Votre établissement'}</p></div>
            </div>
            <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20" aria-label="Fermer le mode d’emploi"><X className="h-5 w-5" /></button>
          </div>
          <p className="relative mt-5 max-w-xl text-sm leading-6 text-blue-50">{intro}</p>
        </div>
        <div className="space-y-4 p-5 sm:p-8">
          {mode === 'help' ? (
            <>
              <p className="text-sm text-slate-600">Choisissez une aide rapide. Vous pouvez revenir ici à tout moment avec le bouton « Aide ».</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => go('parametres')} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50"><Settings2 className="h-5 w-5 text-blue-700" /><span className="flex-1"><strong className="block text-sm text-slate-900">Paramètres et scolarités</strong><span className="text-xs text-slate-500">Logo, classes, frais et tranches</span></span><ChevronRight className="h-4 w-4 text-slate-400" /></button>
                <button type="button" onClick={() => go('classes')} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50"><GraduationCap className="h-5 w-5 text-blue-700" /><span className="flex-1"><strong className="block text-sm text-slate-900">Gérer les classes</strong><span className="text-xs text-slate-500">Créer les niveaux utilisés</span></span><ChevronRight className="h-4 w-4 text-slate-400" /></button>
                <button type="button" onClick={() => { onClose(); onStartStudent(); }} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50"><Users className="h-5 w-5 text-blue-700" /><span className="flex-1"><strong className="block text-sm text-slate-900">Ajouter un élève</strong><span className="text-xs text-slate-500">Ouvrir le formulaire d’inscription</span></span><ChevronRight className="h-4 w-4 text-slate-400" /></button>
                <button type="button" onClick={() => go('paiements')} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50"><Wallet className="h-5 w-5 text-blue-700" /><span className="flex-1"><strong className="block text-sm text-slate-900">Suivre les paiements</strong><span className="text-xs text-slate-500">Règlements, reçus et soldes</span></span><ChevronRight className="h-4 w-4 text-slate-400" /></button>
              </div>
            </>
          ) : (
            <>
              {mode === 'onboarding' && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-extrabold uppercase tracking-wider text-amber-900">Avant votre première inscription</p><p className="mt-1 text-sm leading-5 text-amber-900">Créez d’abord les classes et configurez la scolarité. Sinon, le formulaire peut afficher une classe vide ou des frais à zéro.</p></div>}
              <div className="space-y-3">
                {(mode === 'onboarding'
                  ? [
                      { title: 'Personnaliser l’établissement', detail: 'Dans Paramètres, vérifiez le nom, ajoutez le logo et choisissez l’année scolaire.', icon: Settings2 },
                      { title: 'Créer les classes', detail: 'Ajoutez les classes réellement utilisées par votre école.', icon: GraduationCap },
                      { title: 'Configurer les frais scolaires', detail: 'Vérifiez que « Scolarité » existe, choisissez paiement par tranches ou unique et renseignez les montants pour chaque classe.', icon: Wallet },
                      { title: 'Inscrire le premier élève', detail: 'Renseignez son identité, sélectionnez sa classe et vérifiez les frais avant de valider.', icon: Users },
                    ]
                  : (moduleGuide ? moduleGuide.steps.map((detail, i) => ({ title: 'Étape ' + (i + 1), detail, icon: CheckCircle2 })) : [{ title: 'Commencer', detail: 'Utilisez les boutons d’aide pour ouvrir le bon module.', icon: HelpCircle }])
                ).map((step, index) => {
                  const Icon = step.icon;
                  return <div key={step.title + index} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-800"><Icon className="h-5 w-5" /></span><div><p className="text-sm font-extrabold text-slate-900">{step.title}</p><p className="mt-1 text-sm leading-5 text-slate-600">{step.detail}</p></div></div>;
                })}
              </div>
            </>
          )}
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={onClose} className="min-h-11 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">{mode === 'onboarding' ? 'Passer pour le moment' : 'Fermer'}</button>
            {mode === 'onboarding' ? (
              <button type="button" onClick={() => go('parametres')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-3 text-sm font-extrabold text-blue-950 shadow-lg shadow-amber-500/20 hover:brightness-105">Commencer la configuration <ChevronRight className="h-4 w-4" /></button>
            ) : mode === 'module' ? (
              <button type="button" onClick={onClose} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-800 to-blue-950 px-5 py-3 text-sm font-extrabold text-white shadow-lg hover:brightness-110">Compris, continuer <CheckCircle2 className="h-4 w-4" /></button>
            ) : (
              <button type="button" onClick={() => go('parametres')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-3 text-sm font-extrabold text-blue-950 shadow-lg">Ouvrir les paramètres <ChevronRight className="h-4 w-4" /></button>
            )}
          </div>
          {mode === 'onboarding' && <p className="text-center text-[11px] leading-5 text-slate-400">Ce guide s’affiche une seule fois pour un nouveau compte. Retrouvez-le ensuite dans le bouton Aide.</p>}
        </div>
      </div>
    </div>
  );
}
