import { useState } from 'react';
import {
  ArrowRight, Sparkles, Check, ShieldCheck, Wallet, GraduationCap,
  Calculator, MessageCircle, LayoutDashboard, Package, FileText,
  Smartphone, ChevronDown, Mail, Phone, MapPin, PlayCircle,
  UserPlus, Settings, Send,
} from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

const FEATURES = [
  {
    icon: Calculator,
    title: 'Suivi des paiements',
    desc: "Enregistrez chaque paiement par élève et par classe. Gestilys calcule automatiquement les soldes, les restes à payer et le taux de recouvrement.",
    accent: 'royal',
  },
  {
    icon: MessageCircle,
    title: 'Reçus WhatsApp instantanés',
    desc: "Générez et envoyez en un clic un reçu détaillé directement sur le WhatsApp du parent. Fini les reçus manuels illisibles.",
    accent: 'gold',
  },
  {
    icon: Package,
    title: 'Gestion des stocks',
    desc: "Suivez vos tenues scolaires et vos livres : quantités en stock, ventes, et valeur du stock restant — tout au même endroit.",
    accent: 'emerald',
  },
  {
    icon: FileText,
    title: 'Bulletins scolaires',
    desc: "Créez des bulletins par période avec calcul automatique des moyennes pondérées et génération d'appréciations.",
    accent: 'royal',
  },
  {
    icon: LayoutDashboard,
    title: 'Tableau de bord par classe',
    desc: "Visualisez en temps réel le total encaissé, le reste à recouvrer et les statistiques par classe — garçons, filles, élèves à jour.",
    accent: 'gold',
  },
  {
    icon: Smartphone,
    title: 'Accessible partout',
    desc: "Fonctionne sur téléphone et ordinateur, sans aucune installation. Vos données sont synchronisées et sécurisées en continu.",
    accent: 'emerald',
  },
];

const STEPS = [
  {
    icon: UserPlus,
    title: 'Inscrivez votre école',
    desc: 'Créez votre compte en 2 minutes. Aucune installation, aucun logiciel à télécharger.',
  },
  {
    icon: Settings,
    title: 'Ajoutez vos élèves',
    desc: 'Saisissez vos élèves et configurez vos tarifs par classe et par type de frais.',
  },
  {
    icon: Send,
    title: 'Suivez et envoyez',
    desc: 'Enregistrez les paiements et envoyez les reçus aux parents par WhatsApp automatiquement.',
  },
];

const PRICING = [
  {
    range: 'Moins de 100 élèves',
    price: '5 000 FCFA',
    period: '/ mois',
    features: ['Toutes les fonctionnalités', 'Reçus WhatsApp illimités', 'Support par WhatsApp'],
    featured: false,
  },
  {
    range: '100 – 250 élèves',
    price: '5 000 – 15 000 FCFA',
    period: '/ mois',
    features: ['Toutes les fonctionnalités', 'Reçus WhatsApp illimités', 'Support prioritaire', 'Gestion des stocks complète'],
    featured: true,
  },
  {
    range: '250 – 500 élèves',
    price: '15 000 – 25 000 FCFA',
    period: '/ mois',
    features: ['Toutes les fonctionnalités', 'Reçus WhatsApp illimités', 'Support prioritaire', 'Bulletins scolaires', 'Multi-classes illimitées'],
    featured: false,
  },
  {
    range: '500 – 1000 élèves',
    price: '20 000 – 50 000 FCFA',
    period: '/ mois',
    features: ['Toutes les fonctionnalités', 'Reçus WhatsApp illimités', 'Support dédié', 'Bulletins scolaires', 'Multi-classes illimitées', 'Formation incluse'],
    featured: false,
  },
];

const FAQ = [
  {
    q: 'Est-ce que mes données sont en sécurité ?',
    a: 'Vos données sont hébergées sur une infrastructure sécurisée avec un accès protégé par mot de passe. Chaque école ne voit que ses propres données — personne d\'autre n\'y a accès.',
  },
  {
    q: 'Puis-je utiliser Gestilys sur téléphone ?',
    a: 'Oui. Gestilys fonctionne sur téléphone, tablette et ordinateur. Aucune application à installer — tout se passe dans votre navigateur, et vos données sont synchronisées automatiquement.',
  },
  {
    q: 'Que se passe-t-il à la fin de l\'essai gratuit ?',
    a: 'Vous choisissez ensuite le forfait adapté à l\'effectif de votre école. Sans engagement, vous pouvez changer de forfait ou résilier à tout moment.',
  },
  {
    q: 'Les parents doivent-ils installer une application ?',
    a: 'Non. Les reçus sont envoyés directement via WhatsApp, que les parents utilisent déjà au quotidien. Aucune installation n\'est requise de leur côté.',
  },
  {
    q: 'Puis-je changer de forfait plus tard ?',
    a: 'Oui, vous pouvez passer à un forfait supérieur ou inférieur à tout moment, selon l\'évolution de votre effectif. Le changement prend effet immédiatement.',
  },
  {
    q: 'Comment sont envoyés les reçus aux parents ?',
    a: 'Après chaque paiement, un reçu détaillé est généré automatiquement avec le montant, la tranche concernée et le solde restant. Vous l\'envoyez en un clic via WhatsApp au numéro du parent.',
  },
];

const ACCENT_WRAP: Record<string, string> = {
  royal: 'from-royal-400 to-royal-700',
  gold: 'from-gold-400 to-gold-600',
  emerald: 'from-teal-400 to-emerald-600',
};

export function LandingPage({ onEnter }: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-royal-900 to-royal-800">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl animate-floatY" style={{ background: 'radial-gradient(circle, rgba(245,197,24,.18), transparent 70%)' }} />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full blur-3xl animate-floatY" style={{ background: 'radial-gradient(circle, rgba(90,140,245,.16), transparent 70%)', animationDelay: '2s' }} />
        <div className="absolute top-1/3 right-1/4 h-64 w-64 rounded-full blur-3xl animate-floatY" style={{ background: 'radial-gradient(circle, rgba(45,212,191,.10), transparent 70%)', animationDelay: '4s' }} />
      </div>
      <div className="bg-grid-light pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative z-10">
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pt-12 pb-8 text-center sm:pt-16 lg:pt-20">
          <div className="animate-fadeUp inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-700 uppercase tracking-wider text-gold-300 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" /> Le Cahier de Caisse Moderne
          </div>
          <div className="animate-fadeUp delay-100 mt-8 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-gold-400 to-gold-600 shadow-glow-gold-lg">
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
          </div>
          <h1 className="animate-fadeUp delay-200 mt-8 font-display text-4xl font-800 leading-tight tracking-tighter text-white sm:text-5xl lg:text-6xl">
            Fini les reçus à la main.<br />Gérez votre école en toute sérénité.
          </h1>
          <p className="animate-fadeUp delay-300 mt-5 max-w-2xl text-lg leading-relaxed text-royal-100 sm:text-xl">
            Suivre les paiements, rédiger des reçus et gérer les stocks sur des cahiers, c'est du temps perdu et des erreurs garanties. <span className="text-gold-300 font-700">Gestilys</span> automatise tout : encaissements, reçus WhatsApp, stocks et bulletins — depuis votre téléphone.
          </p>
          <button onClick={onEnter} className="animate-fadeUp delay-400 group mt-9 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 px-8 py-4 text-base font-800 text-royal-900 shadow-glow-gold-lg transition-all animate-glow hover:scale-[1.03] active:scale-95 sm:text-lg">
            <Wallet className="h-5 w-5" /> Essayer gratuitement <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
          <div className="animate-fadeUp delay-500 mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-600 text-royal-100">
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-gold-300" strokeWidth={3} /> Aucune installation</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-gold-300" strokeWidth={3} /> 100% en FCFA</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-gold-300" /> Données sécurisées</span>
          </div>
        </section>

        {/* ── Demo video placeholder ───────────────────────── */}
        <section className="mx-auto max-w-4xl px-6 pb-16">
          <div id="demo-video" className="animate-fadeUp delay-700 flex aspect-video items-center justify-center rounded-2.5xl border-2 border-dashed border-white/15 bg-white/5 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-center">
              <PlayCircle className="h-12 w-12 text-white/20" />
              <p className="text-sm font-600 text-white/30">Vidéo de démonstration — bientôt disponible</p>
            </div>
          </div>
        </section>

        {/* ── Comment ça marche ────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="text-center font-display text-3xl font-800 tracking-tight text-white sm:text-4xl">Comment ça marche</h2>
          <p className="mt-3 text-center text-sm text-royal-100">Trois étapes simples pour digitaliser la gestion de votre école.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="animate-fadeUp relative rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm transition hover:bg-white/8" style={{ animationDelay: `${0.1 * i}s` }}>
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 px-3 py-1 text-xs font-800 text-royal-900 shadow-glow-gold">
                    {i + 1}
                  </div>
                  <span className="mx-auto mt-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-royal-400 to-royal-700 shadow-lg">
                    <Icon className="h-7 w-7 text-white" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-700 text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-royal-100">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Fonctionnalités ──────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="text-center font-display text-3xl font-800 tracking-tight text-white sm:text-4xl">Tout ce dont votre école a besoin</h2>
          <p className="mt-3 text-center text-sm text-royal-100">Une seule plateforme pour gérer paiements, stocks, bulletins et communication avec les parents.</p>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="animate-fadeUp rounded-3xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-sm transition hover:bg-white/8 hover:scale-[1.02]" style={{ animationDelay: `${0.1 * i}s` }}>
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${ACCENT_WRAP[f.accent]} shadow-lg`}><Icon className="h-6 w-6 text-white" /></span>
                  <h3 className="mt-4 font-display text-lg font-700 text-white">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-royal-100">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Ils nous testent déjà ────────────────────────── */}
        <section className="mx-auto max-w-4xl px-6 py-12">
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 px-8 py-8 text-center backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-600"><GraduationCap className="h-5 w-5 text-royal-900" /></span>
              <span className="font-display text-xl font-700 text-white">Ils nous testent déjà</span>
            </div>
            <p className="max-w-lg text-sm leading-relaxed text-royal-100">
              Déjà utilisé par plusieurs écoles à <span className="text-gold-300 font-700">Bamako</span>. Rejoignez-les et digitalisez la gestion de votre établissement.
            </p>
          </div>
        </section>

        {/* ── Tarifs ───────────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-6 py-12">
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-center font-display text-3xl font-800 tracking-tight text-white sm:text-4xl">Des tarifs adaptés à votre école</h2>
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-4 py-2 text-xs font-800 text-royal-900 shadow-glow-gold">
              <Sparkles className="h-3.5 w-3.5" /> -20% pour les 10 premiers clients
            </div>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PRICING.map((p, i) => (
              <div
                key={p.range}
                className={`animate-fadeUp relative flex flex-col rounded-3xl border p-6 backdrop-blur-sm transition hover:scale-[1.03] ${p.featured ? 'border-gold-400/50 bg-gold-400/10 shadow-glow-gold' : 'border-white/10 bg-white/5'}`}
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                {p.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 px-3 py-1 text-[10px] font-800 uppercase tracking-wider text-royal-900 shadow-glow-gold">
                    Recommandé
                  </div>
                )}
                <p className="text-xs font-700 uppercase tracking-wider text-royal-100">{p.range}</p>
                <p className="mt-3 font-display text-xl font-800 text-white">{p.price}</p>
                <p className="text-xs font-600 text-royal-100">{p.period}</p>
                <ul className="mt-4 flex-1 space-y-2">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-royal-100">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-300" strokeWidth={3} /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onEnter}
                  className={`mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-700 transition active:scale-95 ${p.featured ? 'bg-gradient-to-br from-gold-400 to-gold-600 text-royal-900 shadow-glow-gold hover:brightness-110' : 'border border-white/15 bg-white/5 text-white hover:bg-white/10'}`}
                >
                  Démarrer l'essai gratuit
                </button>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-royal-100">Tarifs indicatifs selon l'effectif. Essai gratuit sans engagement.</p>
        </section>

        {/* ── FAQ ──────────────────────────────────────────── */}
        <section className="mx-auto max-w-3xl px-6 py-12">
          <h2 className="text-center font-display text-3xl font-800 tracking-tight text-white sm:text-4xl">Questions fréquentes</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-sm font-700 text-white">{item.q}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-gold-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className="grid transition-all" style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}>
                    <div className="overflow-hidden">
                      <p className="px-5 pb-4 text-sm leading-relaxed text-royal-100">{item.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── CTA final ────────────────────────────────────── */}
        <section className="mx-auto max-w-3xl px-6 py-12">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-royal-700 to-royal-900 p-8 text-center shadow-cardLg sm:p-12">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,rgba(255,255,255,.15) 1px,transparent 0)', backgroundSize: '20px 20px' }} />
            <div className="relative">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-gold-400 to-gold-600 shadow-glow-gold-lg">
                <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
              </div>
              <h2 className="mt-6 font-display text-3xl font-800 tracking-tight text-white sm:text-4xl">Prêt à digitaliser votre école ?</h2>
              <p className="mt-4 text-sm leading-relaxed text-royal-100 sm:text-base">
                Commencez gratuitement aujourd'hui. Aucune installation, aucune carte bancaire requise.
              </p>
              <button onClick={onEnter} className="group mt-8 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 px-8 py-4 text-base font-800 text-royal-900 shadow-glow-gold-lg transition-all hover:scale-[1.03] active:scale-95 sm:text-lg">
                <Wallet className="h-5 w-5" /> Démarrer l'essai gratuit <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────── */}
        <footer className="border-t border-white/10 px-6 py-10">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-gold-300" />
              <span className="font-display text-lg font-800 text-white">Gestilys</span>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-royal-100">
              La solution de gestion des frais de scolarité, stocks et bulletins pour les écoles d'Afrique de l'Ouest.
            </p>
            <div className="flex flex-col items-center gap-3 text-sm text-royal-100 sm:flex-row sm:gap-6">
              <a href="mailto:paulkomivitengue@gmail.com" className="inline-flex items-center gap-2 transition hover:text-gold-300">
                <Mail className="h-4 w-4 text-gold-300" /> paulkomivitengue@gmail.com
              </a>
              <a href="tel:+22373369410" className="inline-flex items-center gap-2 transition hover:text-gold-300">
                <Phone className="h-4 w-4 text-gold-300" /> +223 73 36 94 10
              </a>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gold-300" /> Bamako, Mali
              </span>
            </div>
            <p className="mt-4 text-xs text-white/30">© {new Date().getFullYear()} Gestilys. Tous droits réservés.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
