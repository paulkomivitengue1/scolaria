import { useState } from 'react';
import {
  ArrowRight, Check, ShieldCheck, Wallet, GraduationCap, Calculator,
  Package, Smartphone, ChevronDown, Mail, Phone, MapPin, Users, TrendingUp, ReceiptText,
} from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

const FEATURES = [
  {
    icon: Calculator,
    title: 'Paiements et frais scolaires',
    desc: 'Enregistrez les règlements par élève, consultez les montants déjà payés et repérez rapidement les soldes restants.',
    tone: 'blue',
  },
  {
    icon: ReceiptText,
    title: 'Reçus faciles à partager',
    desc: 'Préparez un reçu clair après un paiement et partagez-le avec le parent par WhatsApp.',
    tone: 'gold',
  },
  {
    icon: Package,
    title: 'Stocks de livres et uniformes',
    desc: 'Gardez une vue sur les quantités disponibles, les mouvements et les stocks restants.',
    tone: 'teal',
  },
  {
    icon: Users,
    title: 'Élèves et classes',
    desc: 'Retrouvez les informations des élèves et organisez votre suivi par classe depuis un seul espace.',
    tone: 'violet',
  },
  {
    icon: TrendingUp,
    title: 'Vue d’ensemble financière',
    desc: 'Consultez les encaissements et les dépenses pour mieux comprendre la situation de votre établissement.',
    tone: 'blue',
  },
  {
    icon: Smartphone,
    title: 'Sur téléphone et ordinateur',
    desc: 'Accédez à votre espace depuis un navigateur, sans installer un logiciel sur chaque appareil.',
    tone: 'teal',
  },
];

const FAQ = [
  {
    q: 'Dois-je installer une application ?',
    a: 'Non. Gestilys s’utilise depuis le navigateur de votre téléphone, tablette ou ordinateur.',
  },
  {
    q: 'Puis-je suivre les paiements par élève ?',
    a: 'Oui. Vous pouvez consulter les paiements enregistrés et les soldes associés aux frais configurés pour votre école.',
  },
  {
    q: 'Les parents doivent-ils créer un compte ?',
    a: 'Non. Vous pouvez partager un reçu par WhatsApp avec les parents, sans leur demander d’installer Gestilys.',
  },
  {
    q: 'Puis-je voir Gestilys avant de m’engager ?',
    a: 'Oui. Demandez une démonstration ou explorez l’essai disponible pour découvrir le fonctionnement avant de prendre une décision.',
  },
];

const DEMO_VIEWS = [
  { id: 'overview', label: 'Vue générale' },
  { id: 'payments', label: 'Paiements' },
  { id: 'students', label: 'Élèves' },
] as const;

export function LandingPage({ onEnter }: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [billingPeriod, setBillingPeriod] = useState<'mensuel'|'annuel'>('mensuel');
  const [demoView, setDemoView] = useState<(typeof DEMO_VIEWS)[number]['id']>('overview');
  return (
    <div className="gestilys-landing min-h-screen bg-white text-ink">
      <style>{`
        .gestilys-landing { --g-blue:#172554; --g-blue-2:#1d4ed8; --g-gold:#f4bd35; --g-muted:#64748b; scroll-behavior:smooth; }
        .gestilys-landing * { box-sizing:border-box; }
        .gl-container { width:min(1120px, calc(100% - 40px)); margin-inline:auto; }
        .gl-nav { position:sticky; top:0; z-index:50; background:rgba(255,255,255,.92); backdrop-filter:blur(16px); border-bottom:1px solid #e8edf5; }
        .gl-link { color:#475569; text-decoration:none; font-size:13px; font-weight:700; transition:color .2s; }
        .gl-link:hover { color:#1d4ed8; }
        .gl-btn { display:inline-flex; align-items:center; justify-content:center; gap:9px; border-radius:14px; padding:13px 19px; font-size:14px; font-weight:800; cursor:pointer; border:0; transition:transform .18s, box-shadow .18s, background .18s; }
        .gl-btn:hover { transform:translateY(-2px); }
        .gl-btn-primary { color:#172554; background:linear-gradient(135deg,#f9d56e,#f4bd35); box-shadow:0 8px 24px rgba(244,189,53,.25); }
        .gl-btn-primary:hover { box-shadow:0 12px 30px rgba(244,189,53,.35); }
        .gl-btn-secondary { color:#fff; background:#172554; box-shadow:0 8px 22px rgba(23,37,84,.18); }
        .gl-hero { position:relative; isolation:isolate; overflow:hidden; background:radial-gradient(ellipse at 10% 10%,rgba(59,130,246,.20),transparent 36%),radial-gradient(ellipse at 90% 0%,rgba(244,189,53,.25),transparent 30%),linear-gradient(180deg,#f5f8ff 0%,#fff 100%); }
        .gl-hero:before { content:""; position:absolute; inset:0; z-index:-1; pointer-events:none; background-image:linear-gradient(rgba(29,78,216,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(29,78,216,.045) 1px,transparent 1px); background-size:34px 34px; mask-image:linear-gradient(to bottom,black,transparent 92%); }
        .gl-hero:after { content:""; position:absolute; z-index:-1; width:390px; height:390px; right:-140px; top:90px; border-radius:50%; border:1px solid rgba(29,78,216,.12); box-shadow:0 0 0 35px rgba(29,78,216,.025),0 0 0 75px rgba(29,78,216,.02); pointer-events:none; }
        .gl-hero-grid { display:grid; grid-template-columns:1fr 1.03fr; align-items:center; gap:48px; padding-top:72px; padding-bottom:76px; position:relative; }
        @keyframes gl-rise { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes gl-float { 0%,100% { transform:translateY(0) rotate(.5deg); } 50% { transform:translateY(-9px) rotate(.5deg); } }
        @keyframes gl-orbit { 0%,100% { transform:translate(0,0); } 50% { transform:translate(-9px,8px); } }
        @keyframes gl-bar-grow { from { transform:scaleY(.65); } to { transform:scaleY(1); } }
        .gl-hero-copy { animation:gl-rise .7s ease-out both; }
        .gl-hero-copy .gl-eyebrow { box-shadow:0 6px 22px rgba(29,78,216,.08); }
        .gl-mock { animation:gl-rise .8s .12s ease-out both,gl-float 6s 1s ease-in-out infinite; transform-origin:center; transition:box-shadow .25s,border-color .25s; }
        .gl-mock:hover { box-shadow:0 36px 90px rgba(23,37,84,.2); border-color:#bfd3f6; }
        .gl-float { animation:gl-orbit 4.5s ease-in-out infinite; }
        .gl-bars i { transform-origin:bottom; animation:gl-bar-grow .8s ease-out both; }
        .gl-bars i:nth-child(3n) { animation-delay:.12s; }
        .gl-bars i:nth-child(3n + 1) { animation-delay:.22s; }
        .gl-feature { position:relative; overflow:hidden; }
        .gl-feature:after { content:""; position:absolute; width:90px; height:90px; border-radius:50%; right:-48px; top:-48px; background:rgba(219,234,254,.45); transition:transform .25s; }
        .gl-feature:hover:after { transform:scale(1.8); }
        .gl-step { transition:transform .2s,box-shadow .2s,border-color .2s; }
        .gl-step:hover { transform:translateY(-4px); box-shadow:0 16px 34px rgba(23,37,84,.07); border-color:#cbdcfb; }
        .gl-demo-card { transition:transform .25s,box-shadow .25s; }
        .gl-demo-card:hover { transform:translateY(-3px); box-shadow:0 24px 55px rgba(23,37,84,.12); }
        .gl-tab:focus-visible,.gl-btn:focus-visible,.gl-faq button:focus-visible { outline:3px solid #93c5fd; outline-offset:3px; }
        @media (prefers-reduced-motion:reduce) { .gl-hero-copy,.gl-mock,.gl-float,.gl-bars i { animation:none !important; } .gl-feature,.gl-step,.gl-demo-card,.gl-btn { transition:none !important; } }
        .gl-eyebrow { display:inline-flex; align-items:center; gap:8px; border:1px solid #dbeafe; background:#eff6ff; color:#1d4ed8; border-radius:999px; padding:7px 12px; font-size:11px; letter-spacing:.08em; font-weight:800; text-transform:uppercase; }
        .gl-title { font-size:clamp(38px,5vw,62px); line-height:1.05; letter-spacing:-.055em; color:#172554; font-weight:850; margin:20px 0 0; }
        .gl-title span { color:#1d4ed8; }
        .gl-lead { color:#52627a; font-size:16px; line-height:1.8; max-width:510px; margin-top:20px; }
        .gl-trust { display:flex; flex-wrap:wrap; gap:14px 20px; margin-top:22px; color:#52627a; font-size:12px; font-weight:700; }
        .gl-trust span { display:flex; align-items:center; gap:6px; }
        .gl-mock { border:1px solid #dce5f2; background:#fff; border-radius:24px; box-shadow:0 30px 80px rgba(23,37,84,.14); padding:15px; transform:rotate(.5deg); }
        .gl-mock-top { display:flex; align-items:center; justify-content:space-between; padding:7px 5px 15px; border-bottom:1px solid #edf1f7; }
        .gl-dots { display:flex; gap:5px; }
        .gl-dots i { display:block; width:7px; height:7px; border-radius:50%; background:#cbd5e1; }
        .gl-mock-body { display:grid; grid-template-columns:95px 1fr; gap:12px; padding-top:13px; }
        .gl-mock-side { border-radius:12px; background:#172554; padding:12px 8px; min-height:260px; color:#cbd5e1; }
        .gl-side-line { height:7px; background:rgba(255,255,255,.14); border-radius:6px; margin:15px 4px; }
        .gl-side-line.active { background:#f4bd35; }
        .gl-stat-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
        .gl-stat { padding:12px 10px; border:1px solid #edf1f7; border-radius:12px; min-width:0; }
        .gl-stat-label { color:#64748b; font-size:9px; font-weight:700; }
        .gl-stat-value { color:#172554; font-size:clamp(13px,1.8vw,20px); font-weight:850; margin-top:6px; white-space:nowrap; }
        .gl-chart { margin-top:10px; border:1px solid #edf1f7; border-radius:12px; padding:13px; }
        .gl-bars { height:86px; display:flex; align-items:end; gap:7px; padding:8px 4px 0; }
        .gl-bars i { flex:1; border-radius:5px 5px 2px 2px; background:linear-gradient(180deg,#60a5fa,#1d4ed8); min-width:4px; }
        .gl-table-row { display:grid; grid-template-columns:1.1fr 1fr .8fr; gap:5px; padding:10px 4px; border-bottom:1px solid #f1f5f9; font-size:9px; color:#475569; }
        .gl-pill { border-radius:999px; background:#dcfce7; color:#15803d; padding:3px 6px; font-weight:800; text-align:center; }
        .gl-float { position:absolute; right:-18px; bottom:28px; background:white; border:1px solid #e7edf5; box-shadow:0 12px 34px rgba(15,23,42,.12); border-radius:15px; padding:12px 15px; display:flex; align-items:center; gap:10px; }
        .gl-section { padding:76px 0; }
        .gl-section-soft { background:#f7f9fd; }
        .gl-kicker { color:#1d4ed8; text-transform:uppercase; font-size:11px; letter-spacing:.12em; font-weight:850; }
        .gl-h2 { color:#172554; font-size:clamp(28px,3.6vw,42px); line-height:1.13; letter-spacing:-.04em; font-weight:850; margin-top:12px; }
        .gl-sub { color:#64748b; line-height:1.8; font-size:14px; margin-top:12px; max-width:650px; }
        .gl-feature-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; margin-top:34px; }
        .gl-feature { padding:23px; border:1px solid #e6ebf3; border-radius:20px; background:white; transition:transform .2s,box-shadow .2s,border-color .2s; }
        .gl-feature:hover { transform:translateY(-4px); border-color:#cbdcfb; box-shadow:0 18px 36px rgba(23,37,84,.07); }
        .gl-feature-icon { width:45px; height:45px; display:grid; place-items:center; border-radius:14px; background:#eff6ff; color:#1d4ed8; }
        .gl-feature h3 { font-size:16px; color:#172554; font-weight:850; margin-top:17px; }
        .gl-feature p { color:#64748b; font-size:13px; line-height:1.8; margin-top:8px; }
        .gl-demo-wrap { display:grid; grid-template-columns:.8fr 1.2fr; gap:35px; align-items:center; margin-top:32px; }
        .gl-demo-card { border:1px solid #dfe7f2; border-radius:22px; background:white; padding:20px; box-shadow:0 18px 48px rgba(23,37,84,.07); }
        .gl-tabs { display:flex; gap:6px; padding:5px; border-radius:12px; background:#f1f5f9; }
        .gl-tab { flex:1; border:0; border-radius:9px; padding:10px 7px; font-size:12px; font-weight:800; cursor:pointer; color:#64748b; background:transparent; }
        .gl-tab.active { background:white; color:#1d4ed8; box-shadow:0 2px 8px rgba(15,23,42,.08); }
        .gl-demo-list { display:grid; gap:10px; margin-top:17px; }
        .gl-demo-item { display:flex; align-items:center; gap:11px; padding:12px; border:1px solid #edf1f7; border-radius:12px; }
        .gl-demo-item p { font-size:12px; color:#172554; font-weight:800; }
        .gl-demo-item small { display:block; color:#64748b; font-size:10px; margin-top:3px; }
        .gl-step-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; margin-top:34px; }
        .gl-step { padding:24px; border:1px solid #e6ebf3; background:white; border-radius:20px; }
        .gl-step-num { display:grid; place-items:center; width:38px; height:38px; border-radius:12px; color:#172554; background:#f9d56e; font-weight:900; }
        .gl-step h3 { margin-top:16px; color:#172554; font-weight:850; font-size:16px; }
        .gl-step p { margin-top:8px; color:#64748b; font-size:13px; line-height:1.8; }
        .gl-price { display:grid; grid-template-columns:1fr auto; gap:24px; align-items:center; border-radius:24px; background:linear-gradient(130deg,#172554,#1e40af); color:white; padding:32px; margin-top:32px; }
        .gl-price h3 { font-size:24px; font-weight:850; }
        .gl-price p { color:#dbeafe; font-size:13px; line-height:1.8; margin-top:8px; }
        .gl-faq { border:1px solid #e5eaf2; border-radius:14px; overflow:hidden; background:white; }
        .gl-faq + .gl-faq { margin-top:10px; }
        .gl-faq button { width:100%; padding:17px 18px; border:0; background:white; display:flex; align-items:center; justify-content:space-between; gap:15px; text-align:left; color:#172554; font-size:13px; font-weight:800; cursor:pointer; }
        .gl-faq p { padding:0 18px 17px; color:#64748b; font-size:13px; line-height:1.8; }
        .gl-footer { background:#111d42; color:#dbeafe; padding:35px 0; }
        @media (max-width:850px) {
          .gl-hero-grid { grid-template-columns:1fr; gap:38px; padding-top:54px; padding-bottom:55px; }
          .gl-hero-copy { text-align:center; }
          .gl-lead { margin-inline:auto; }
          .gl-trust { justify-content:center; }
          .gl-hero-actions { justify-content:center; }
          .gl-mock { max-width:620px; width:100%; margin-inline:auto; }
          .gl-feature-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .gl-demo-wrap { grid-template-columns:1fr; }
        }
        @media (max-width:600px) {
          .gl-container { width:min(100% - 28px, 1120px); }
          .gl-nav-links { display:none !important; }
          .gl-hero-grid { padding-top:40px; }
          .gl-title { font-size:clamp(36px,10vw,48px); }
          .gl-lead { font-size:14px; }
          .gl-mock { padding:9px; border-radius:18px; transform:none; }
          .gl-mock-body { grid-template-columns:55px 1fr; gap:7px; }
          .gl-mock-side { min-height:230px; padding:8px 4px; }
          .gl-side-line { margin:14px 2px; }
          .gl-stat-grid { gap:5px; }
          .gl-stat { padding:8px 5px; }
          .gl-stat-label { font-size:8px; }
          .gl-chart { padding:8px; }
          .gl-bars { height:65px; gap:4px; }
          .gl-float { right:4px; bottom:-12px; padding:9px 11px; }
          .gl-section { padding:54px 0; }
          .gl-feature-grid,.gl-step-grid { grid-template-columns:1fr; }
          .gl-price { grid-template-columns:1fr; padding:24px; }
          .gl-price-action { width:100%; }
          .gl-stat-value { font-size:12px; }
        }
      `}</style>

      <header className="gl-nav">
        <div className="gl-container" style={{ minHeight:72, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
          <a href="#accueil" aria-label="Gestilys, accueil" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
            <span style={{ width:39, height:39, borderRadius:13, display:'grid', placeItems:'center', background:'#172554', color:'#f9d56e' }}><GraduationCap size={23} /></span>
            <span style={{ color:'#172554', fontWeight:900, fontSize:21, letterSpacing:'-.05em' }}>Gestilys<span style={{ color:'#1d4ed8' }}>.</span><small style={{ display:'block', color:'#64748b', fontSize:9, fontWeight:800, letterSpacing:'.12em', textTransform:'uppercase', marginTop:-3 }}>Gestion scolaire</small></span>
          </a>
          <nav className="gl-nav-links" style={{ display:'flex', alignItems:'center', gap:25 }}>
            <a className="gl-link" href="#fonctionnalites">Fonctionnalités</a>
            <a className="gl-link" href="#demonstration">Aperçu</a>
            <a className="gl-link" href="#tarifs">Tarif</a>
            <a className="gl-link" href="#questions">Questions</a>
          </nav>
          <button className="gl-btn gl-btn-primary" style={{ padding:'11px 15px', fontSize:12 }} onClick={onEnter}>Découvrir Gestilys <ArrowRight size={15} /></button>
        </div>
      </header>

      <main>
        <section id="accueil" className="gl-hero">
          <div className="gl-container gl-hero-grid">
            <div className="gl-hero-copy">
              <div className="gl-eyebrow"><span style={{ width:7, height:7, borderRadius:'50%', background:'#1d4ed8' }} /> Pensé pour la gestion scolaire</div>
              <h1 className="gl-title">Moins de paperasse.<br /><span>Plus de maîtrise.</span></h1>
              <p className="gl-lead">Pilotez les frais scolaires, les élèves, les reçus et les stocks depuis un seul espace simple à utiliser. Gestilys vous aide à garder une vision claire de votre établissement, même depuis votre téléphone.</p>
              <div className="gl-hero-actions" style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:12, marginTop:25 }}>
                <button className="gl-btn gl-btn-primary" onClick={onEnter}>Découvrir la plateforme <ArrowRight size={17} /></button>
                <a href="#demonstration" className="gl-btn" style={{ border:'1px solid #dbe3ef', color:'#172554', textDecoration:'none', background:'white' }}>Voir l’aperçu</a>
              </div>
              <div className="gl-trust">
                <span><Check size={15} color="#15803d" /> Sans installation</span>
                <span><Check size={15} color="#15803d" /> Pensé pour le mobile</span>
                <span><ShieldCheck size={15} color="#15803d" /> Accès protégé</span>
              </div>
            </div>

            <div style={{ position:'relative', paddingBottom:20 }}>
              <div className="gl-mock" aria-label="Aperçu illustratif du tableau de bord Gestilys">
                <div className="gl-mock-top">
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ width:27, height:27, display:'grid', placeItems:'center', background:'#172554', color:'#f9d56e', borderRadius:8 }}><GraduationCap size={16} /></span>
                    <div><div style={{ fontSize:11, fontWeight:900, color:'#172554' }}>Gestilys</div><div style={{ fontSize:9, color:'#64748b' }}>Tableau de bord</div></div>
                  </div>
                  <div className="gl-dots"><i /><i /><i /></div>
                </div>
                <div className="gl-mock-body">
                  <aside className="gl-mock-side">
                    <div style={{ color:'white', fontSize:9, fontWeight:800, padding:'4px 4px 12px' }}>MENU</div>
                    <div className="gl-side-line active" />
                    <div className="gl-side-line" />
                    <div className="gl-side-line" />
                    <div className="gl-side-line" />
                    <div className="gl-side-line" />
                  </aside>
                  <div style={{ minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:5, alignItems:'center', marginBottom:10 }}>
                      <div style={{ color:'#172554', fontSize:12, fontWeight:900 }}>Vue générale</div>
                      <span style={{ fontSize:8, color:'#64748b', background:'#f1f5f9', borderRadius:6, padding:'5px 6px' }}>Exemple visuel</span>
                    </div>
                    <div className="gl-stat-grid">
                      <div className="gl-stat"><div className="gl-stat-label">Élèves</div><div className="gl-stat-value">248</div></div>
                      <div className="gl-stat"><div className="gl-stat-label">Encaissé</div><div className="gl-stat-value">3,2 M</div></div>
                      <div className="gl-stat"><div className="gl-stat-label">À suivre</div><div className="gl-stat-value">840 k</div></div>
                    </div>
                    <div className="gl-chart">
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:6 }}><span style={{ color:'#172554', fontSize:10, fontWeight:850 }}>Activité des encaissements</span><span style={{ color:'#64748b', fontSize:8 }}>Exemple</span></div>
                      <div className="gl-bars">{[35,52,43,70,58,86,64,96,73,82,60,91].map((h,i)=><i key={i} style={{ height:`${h}%`, opacity:.55+h/220 }} />)}</div>
                      <div style={{ display:'flex', justifyContent:'space-between', color:'#94a3b8', fontSize:8, marginTop:7 }}><span>Début période</span><span>Fin période</span></div>
                    </div>
                    <div className="gl-chart" style={{ paddingTop:8, paddingBottom:4 }}>
                      <div style={{ color:'#172554', fontSize:10, fontWeight:850, marginBottom:3 }}>Derniers mouvements</div>
                      <div className="gl-table-row" style={{ fontWeight:800, color:'#94a3b8' }}><span>Élève</span><span>Opération</span><span>Statut</span></div>
                      <div className="gl-table-row"><span>Élève exemple</span><span>Paiement</span><span className="gl-pill">Enregistré</span></div>
                      <div className="gl-table-row" style={{ borderBottom:0 }}><span>Élève exemple</span><span>Reçu</span><span className="gl-pill">Prêt</span></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="gl-float"><span style={{ width:35, height:35, display:'grid', placeItems:'center', borderRadius:11, background:'#dcfce7', color:'#15803d' }}><Check size={18} /></span><div><div style={{ fontSize:11, color:'#172554', fontWeight:900 }}>Un suivi plus clair</div><div style={{ fontSize:10, color:'#64748b' }}>Les informations au même endroit</div></div></div>
            </div>
          </div>
        </section>

        <section id="fonctionnalites" className="gl-section">
          <div className="gl-container">
            <div className="gl-kicker">Un seul espace de travail</div>
            <h2 className="gl-h2">Les tâches essentielles, réunies au même endroit.</h2>
            <p className="gl-sub">Concentrez-vous sur votre établissement au lieu de disperser les informations entre plusieurs cahiers et fichiers.</p>
            <div className="gl-feature-grid">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                const iconStyle = f.tone === 'gold' ? { background:'#fff7df', color:'#a16207' } : f.tone === 'teal' ? { background:'#e6fffb', color:'#0f766e' } : f.tone === 'violet' ? { background:'#f1edff', color:'#6d28d9' } : { background:'#eff6ff', color:'#1d4ed8' };
                return <article className="gl-feature" key={f.title}><span className="gl-feature-icon" style={iconStyle}><Icon size={22} /></span><h3>{f.title}</h3><p>{f.desc}</p></article>;
              })}
            </div>
          </div>
        </section>

        <section id="demonstration" className="gl-section gl-section-soft">
          <div className="gl-container">
            <div className="gl-kicker">Aperçu interactif</div>
            <h2 className="gl-h2">Voyez comment les informations s’organisent.</h2>
            <p className="gl-sub">Explorez ces exemples visuels pour comprendre les grandes parties de l’interface. Les chiffres et noms affichés sont fictifs.</p>
            <div className="gl-demo-wrap">
              <div>
                <div className="gl-tabs" role="tablist" aria-label="Choisir un aperçu">
                  {DEMO_VIEWS.map(v => <button key={v.id} role="tab" aria-selected={demoView===v.id} className={`gl-tab ${demoView===v.id?'active':''}`} onClick={()=>setDemoView(v.id)}>{v.label}</button>)}
                </div>
                <h3 style={{ color:'#172554', fontSize:22, fontWeight:850, lineHeight:1.2, marginTop:23 }}>{demoView === 'overview' ? 'Une vision rapide de l’activité' : demoView === 'payments' ? 'Un suivi des règlements plus lisible' : 'Les informations élèves à portée de main'}</h3>
                <p style={{ color:'#64748b', fontSize:14, lineHeight:1.8, marginTop:12 }}>{demoView === 'overview' ? 'Retrouvez les indicateurs importants sans devoir ouvrir plusieurs documents.' : demoView === 'payments' ? 'Consultez les mouvements de paiement et partagez les reçus avec les parents.' : 'Organisez les élèves par classe et retrouvez plus facilement les informations utiles.'}</p>
                <div style={{ display:'flex', alignItems:'center', gap:9, color:'#166534', fontSize:12, fontWeight:800, marginTop:18 }}><Check size={16} /> Une interface pensée pour aller à l’essentiel</div>
              </div>
              <div className="gl-demo-card">
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:17 }}>
                  <div><div style={{ color:'#172554', fontSize:15, fontWeight:900 }}>{demoView === 'overview' ? 'Résumé de l’école' : demoView === 'payments' ? 'Suivi des paiements' : 'Liste des élèves'}</div><div style={{ color:'#94a3b8', fontSize:10, marginTop:4 }}>Données de démonstration</div></div>
                  <span style={{ borderRadius:9, background:'#eff6ff', color:'#1d4ed8', fontSize:10, fontWeight:800, padding:'7px 9px' }}>Exemple</span>
                </div>
                {demoView === 'overview' ? <div className="gl-demo-list">
                  <div className="gl-demo-item"><span style={{ background:'#eff6ff', color:'#1d4ed8', padding:9, borderRadius:10 }}><Users size={19}/></span><div style={{ flex:1 }}><p>Effectif enregistré</p><small>Élèves répartis par classe</small></div><strong style={{ color:'#172554', fontSize:17 }}>248</strong></div>
                  <div className="gl-demo-item"><span style={{ background:'#fff7df', color:'#a16207', padding:9, borderRadius:10 }}><Wallet size={19}/></span><div style={{ flex:1 }}><p>Encaissements</p><small>Montant illustratif</small></div><strong style={{ color:'#172554', fontSize:16 }}>3,2 M</strong></div>
                  <div className="gl-demo-item"><span style={{ background:'#dcfce7', color:'#15803d', padding:9, borderRadius:10 }}><TrendingUp size={19}/></span><div style={{ flex:1 }}><p>Suivi financier</p><small>Vue synthétique</small></div><strong style={{ color:'#15803d', fontSize:12 }}>Disponible</strong></div>
                </div> : demoView === 'payments' ? <div className="gl-demo-list">
                  {[['Awa Traoré','Scolarité','Enregistré'],['Moussa Diallo','Inscription','Enregistré'],['Fatou Koné','Tranche 2','À vérifier']].map((r,i)=><div key={r[0]} className="gl-demo-item"><span style={{ width:35,height:35,display:'grid',placeItems:'center',background:'#eff6ff',borderRadius:10,color:'#1d4ed8',fontWeight:900 }}>{r[0].split(' ').map(n=>n[0]).join('')}</span><div style={{ flex:1 }}><p>{r[0]}</p><small>{r[1]}</small></div><span style={{ fontSize:10,fontWeight:800,color:i===2?'#a16207':'#15803d' }}>{r[2]}</span></div>)}
                </div> : <div className="gl-demo-list">
                  {[['Awa Traoré','6e A'],['Moussa Diallo','5e B'],['Fatou Koné','4e A']].map((r)=><div key={r[0]} className="gl-demo-item"><span style={{ width:35,height:35,display:'grid',placeItems:'center',background:'#f1edff',borderRadius:10,color:'#6d28d9',fontWeight:900 }}>{r[0].split(' ').map(n=>n[0]).join('')}</span><div style={{ flex:1 }}><p>{r[0]}</p><small>Classe : {r[1]}</small></div><span style={{ color:'#64748b', fontSize:10 }}>Élève</span></div>)}
                </div>}
              </div>
            </div>
          </div>
        </section>

        <section className="gl-section">
          <div className="gl-container">
            <div className="gl-kicker">Simple pour commencer</div>
            <h2 className="gl-h2">De la prise en main à votre suivi quotidien.</h2>
            <div className="gl-step-grid">
              <article className="gl-step"><div className="gl-step-num">01</div><h3>Découvrez l’espace</h3><p>Ouvrez Gestilys et explorez les rubriques disponibles pour votre établissement.</p></article>
              <article className="gl-step"><div className="gl-step-num">02</div><h3>Configurez votre école</h3><p>Renseignez les informations utiles, les classes, les élèves et les frais à suivre.</p></article>
              <article className="gl-step"><div className="gl-step-num">03</div><h3>Suivez les opérations</h3><p>Enregistrez les paiements et consultez les informations de gestion depuis votre espace.</p></article>
            </div>
          </div>
        </section>

        <section id="tarifs" className="gl-section gl-section-soft">
          <div className="gl-container">
            <div className="gl-kicker">Des tarifs transparents</div>
            <h2 className="gl-h2">Un forfait adapté à la taille de votre école.</h2>
            <p className="gl-sub">Choisissez une formule. Les forfaits annuels reviennent à deux mois offerts par rapport au paiement mensuel.</p>
            <div style={{display:'flex',justifyContent:'center',gap:5,margin:'24px auto 30px',padding:5,borderRadius:14,background:'#e2e8f0',width:'fit-content'}}>
              <button onClick={()=>setBillingPeriod('mensuel')} style={{padding:'10px 18px',borderRadius:10,background:billingPeriod==='mensuel'?'white':'transparent',color:'#172554',fontSize:13,fontWeight:800,boxShadow:billingPeriod==='mensuel'?'0 1px 4px #cbd5e1':'none'}}>Mensuel</button>
              <button onClick={()=>setBillingPeriod('annuel')} style={{padding:'10px 18px',borderRadius:10,background:billingPeriod==='annuel'?'white':'transparent',color:'#172554',fontSize:13,fontWeight:800,boxShadow:billingPeriod==='annuel'?'0 1px 4px #cbd5e1':'none'}}>Annuel · 2 mois offerts</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,250px),1fr))',gap:18,alignItems:'stretch'}}>
              {[
                {name:'Petite école',desc:'Pour démarrer et gérer les opérations essentielles.',monthly:10000,students:'Jusqu’à 150 élèves',tone:'#eff6ff',accent:'#1d4ed8',popular:false},
                {name:'École moyenne',desc:'Pour un établissement avec un suivi quotidien plus complet.',monthly:20000,students:'De 151 à 500 élèves',tone:'#eef2ff',accent:'#4338ca',popular:true},
                {name:'Grande école',desc:'Pour les établissements avec un effectif important.',monthly:30000,students:'Plus de 500 élèves',tone:'#fff7df',accent:'#a16207',popular:false},
              ].map(plan=><article key={plan.name} style={{position:'relative',display:'flex',flexDirection:'column',border:plan.popular?'2px solid #1d4ed8':'1px solid #dbe3ef',borderRadius:22,background:'white',padding:24,boxShadow:plan.popular?'0 16px 38px rgba(29,78,216,.12)':'0 8px 22px rgba(15,23,42,.04)'}}>
                {plan.popular&&<span style={{position:'absolute',right:16,top:16,borderRadius:999,background:'#dbeafe',color:'#1d4ed8',fontSize:10,fontWeight:900,padding:'6px 9px'}}>RECOMMANDÉ</span>}
                <span style={{alignSelf:'flex-start',borderRadius:10,background:plan.tone,color:plan.accent,padding:'7px 10px',fontSize:11,fontWeight:900}}>{plan.students}</span>
                <h3 style={{fontSize:21,fontWeight:900,color:'#172554',marginTop:18}}>{plan.name}</h3>
                <p style={{fontSize:13,lineHeight:1.7,color:'#64748b',minHeight:44,marginTop:7}}>{plan.desc}</p>
                <div style={{marginTop:20,color:'#172554'}}><strong style={{fontSize:32,letterSpacing:'-.04em'}}>{(billingPeriod==='mensuel'?plan.monthly:plan.monthly*10).toLocaleString('fr-FR')}</strong><span style={{fontSize:12,color:'#64748b'}}> FCFA / {billingPeriod==='mensuel'?'mois':'an'}</span></div>
                {billingPeriod==='annuel'&&<p style={{marginTop:4,color:'#15803d',fontSize:12,fontWeight:800}}>Économie : {(plan.monthly*2).toLocaleString('fr-FR')} FCFA / an</p>}
                <ul style={{display:'grid',gap:10,margin:'22px 0 24px',fontSize:13,color:'#334155',flex:1}}><li style={{display:'flex',gap:8,alignItems:'flex-start'}}><Check size={16} color="#15803d"/> Gestion des élèves et des classes</li><li style={{display:'flex',gap:8,alignItems:'flex-start'}}><Check size={16} color="#15803d"/> Suivi des paiements et reçus</li><li style={{display:'flex',gap:8,alignItems:'flex-start'}}><Check size={16} color="#15803d"/> Accès sur téléphone et ordinateur</li><li style={{display:'flex',gap:8,alignItems:'flex-start'}}><Check size={16} color="#15803d"/> Assistance au démarrage</li></ul>
                <button className="gl-btn gl-btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={onEnter}>Demander une démonstration <ArrowRight size={16}/></button>
              </article>)}
            </div>
            <p style={{textAlign:'center',fontSize:12,color:'#64748b',marginTop:20}}>Le forfait exact et les conditions d’accompagnement sont confirmés avant toute souscription.</p>
          </div>
        </section>

        <section id="questions" className="gl-section">
          <div className="gl-container" style={{ maxWidth:790 }}>
            <div className="gl-kicker">Questions fréquentes</div>
            <h2 className="gl-h2" style={{ marginBottom:26 }}>Vous voulez en savoir plus ?</h2>
            {FAQ.map((item,i)=> {
              const isOpen = openFaq === i;
              return <div className="gl-faq" key={item.q}><button aria-expanded={isOpen} onClick={()=>setOpenFaq(isOpen?null:i)}>{item.q}<ChevronDown size={18} style={{ flexShrink:0, transform:isOpen?'rotate(180deg)':'rotate(0)', transition:'transform .2s', color:'#1d4ed8' }}/></button>{isOpen && <p>{item.a}</p>}</div>;
            })}
          </div>
        </section>

        <section style={{ padding:'0 0 76px' }}>
          <div className="gl-container" style={{ borderRadius:25, background:'linear-gradient(125deg,#172554,#1d4ed8)', padding:'clamp(28px,5vw,54px)', textAlign:'center', color:'white', overflow:'hidden', position:'relative' }}>
            <div style={{ display:'inline-grid', placeItems:'center', width:54, height:54, borderRadius:17, background:'#f9d56e', color:'#172554' }}><GraduationCap size={28}/></div>
            <h2 style={{ fontSize:'clamp(28px,4vw,42px)', letterSpacing:'-.04em', fontWeight:900, marginTop:18 }}>Prêt à découvrir une autre façon de gérer votre école ?</h2>
            <p style={{ color:'#dbeafe', fontSize:14, lineHeight:1.8, maxWidth:560, margin:'12px auto 0' }}>Découvrez Gestilys et voyez comment il peut s’intégrer au quotidien de votre établissement.</p>
            <button className="gl-btn gl-btn-primary" style={{ marginTop:23 }} onClick={onEnter}>Découvrir Gestilys <ArrowRight size={17}/></button>
          </div>
        </section>
      </main>

      <footer className="gl-footer">
        <div className="gl-container" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:22 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}><span style={{ width:38,height:38,borderRadius:12,display:'grid',placeItems:'center',background:'rgba(255,255,255,.12)',color:'#f9d56e' }}><GraduationCap size={22}/></span><div><div style={{ fontSize:18,fontWeight:900,color:'white' }}>Gestilys</div><div style={{ fontSize:10,color:'#bfdbfe' }}>La gestion scolaire, plus simplement.</div></div></div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:16, alignItems:'center', fontSize:12 }}>
            <a href="mailto:paulkomivitengue@gmail.com" style={{ color:'#dbeafe',textDecoration:'none',display:'flex',alignItems:'center',gap:6 }}><Mail size={14}/> Nous contacter</a>
            <a href="tel:+22373369410" style={{ color:'#dbeafe',textDecoration:'none',display:'flex',alignItems:'center',gap:6 }}><Phone size={14}/> +223 73 36 94 10</a>
            <span style={{ color:'#dbeafe',display:'flex',alignItems:'center',gap:6 }}><MapPin size={14}/> Bamako, Mali</span>
          </div>
          <div style={{ width:'100%', borderTop:'1px solid rgba(255,255,255,.12)', paddingTop:18, color:'#94a3b8', fontSize:11 }}>© {new Date().getFullYear()} Gestilys. Tous droits réservés.</div>
        </div>
      </footer>
    </div>
  );
}
