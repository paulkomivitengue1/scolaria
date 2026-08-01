import {
  Calculator, MessageCircle, LayoutDashboard, ArrowRight, Sparkles,
  Check, ShieldCheck, Wallet, GraduationCap,
} from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

const FEATURES = [
  {
    icon: Calculator,
    title: 'Calcul Automatisé',
    desc: "Saisissez le tarif annuel par classe — Gestilys calcule instantanément les 9 mensualités, le reste à payer et le solde de chaque élève.",
    accent: 'royal',
  },
  {
    icon: MessageCircle,
    title: 'Reçus WhatsApp',
    desc: "Générez et envoyez en un clic un reçu de caisse détaillé directement sur le WhatsApp du parent. Fini les reçus manuels illisibles.",
    accent: 'gold',
  },
  {
    icon: LayoutDashboard,
    title: 'Tableau de Bord Clair',
    desc: "Visualisez en temps réel le total encaissé, le reste à recouvrer et votre taux de recouvrement — tout au même endroit.",
    accent: 'emerald',
  },
];

const STATS = [
  { value: '9', label: 'Mois suivis' },
  { value: '3', label: 'Services (Scolarité, Cantine, Transport)' },
  { value: '1 clic', label: 'Pour un reçu WhatsApp' },
];

export function LandingPage({ onEnter }: LandingPageProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-royal-900 to-royal-800">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl animate-floatY" style={{ background: 'radial-gradient(circle, rgba(245,197,24,.18), transparent 70%)' }} />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full blur-3xl animate-floatY" style={{ background: 'radial-gradient(circle, rgba(90,140,245,.16), transparent 70%)', animationDelay: '2s' }} />
        <div className="absolute top-1/3 right-1/4 h-64 w-64 rounded-full blur-3xl animate-floatY" style={{ background: 'radial-gradient(circle, rgba(45,212,191,.10), transparent 70%)', animationDelay: '4s' }} />
      </div>
      <div className="bg-grid-light pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center px-6 py-12 text-center sm:py-16 lg:py-20">
        <div className="animate-fadeUp inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-700 uppercase tracking-wider text-gold-300 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" /> Le Cahier de Caisse Moderne
        </div>
        <div className="animate-fadeUp delay-100 mt-8 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-gold-400 to-gold-600 shadow-glow-gold-lg">
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
        </div>
        <h1 className="animate-fadeUp delay-200 mt-8 font-display text-5xl font-800 leading-tight tracking-tighter text-white sm:text-6xl lg:text-7xl">Gestilys</h1>
        <p className="animate-fadeUp delay-300 mt-4 max-w-2xl text-lg leading-relaxed text-royal-100 sm:text-xl">
          La solution premium de gestion des frais de scolarité pour les écoles d'<span className="text-gold-300 font-700">Afrique de l'Ouest</span>. Encaissez, calculez et envoyez vos reçus — sans paperasse.
        </p>
        <button onClick={onEnter} className="animate-fadeUp delay-400 group mt-10 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 px-8 py-4 text-base font-800 text-royal-900 shadow-glow-gold-lg transition-all animate-glow hover:scale-[1.03] active:scale-95 sm:text-lg">
          <Wallet className="h-5 w-5" /> Accéder au Cahier de Caisse <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </button>
        <div className="animate-fadeUp delay-500 mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-600 text-royal-100">
          <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-gold-300" strokeWidth={3} /> Aucune installation</span>
          <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-gold-300" strokeWidth={3} /> 100% en FCFA</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-gold-300" /> Données sécurisées</span>
        </div>
        <div className="animate-fadeUp delay-700 mt-12 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
              <div className="font-display text-3xl font-800 text-gold-300">{s.value}</div>
              <div className="mt-1 text-xs font-600 leading-relaxed text-royal-100">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-16 grid w-full max-w-4xl grid-cols-1 gap-5 md:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const wrap: Record<string, string> = { royal:'from-royal-400 to-royal-700', gold:'from-gold-400 to-gold-600', emerald:'from-teal-400 to-emerald-600' };
            return (
              <div key={f.title} className="animate-fadeUp rounded-3xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-sm transition hover:bg-white/8 hover:scale-[1.02]" style={{ animationDelay: `${0.8 + i * 0.12}s` }}>
                <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${wrap[f.accent]} shadow-lg`}><Icon className="h-6 w-6 text-white" /></span>
                <h3 className="mt-4 font-display text-lg font-700 text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-royal-100">{f.desc}</p>
              </div>
            );
          })}
        </div>
        <button onClick={onEnter} className="mt-12 inline-flex items-center gap-2 text-sm font-700 text-gold-300 transition hover:text-gold-400">Commencer maintenant <ArrowRight className="h-4 w-4" /></button>
        <footer className="mt-16 flex flex-col items-center gap-1 border-t border-white/10 pt-8 text-center text-xs text-royal-100">
          <div className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-gold-300" /><span className="font-700 text-white">Gestilys</span></div>
          <p>La référence premium de la gestion scolaire — Afrique de l'Ouest</p>
        </footer>
      </div>
    </div>
  );
}
