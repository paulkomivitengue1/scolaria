import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, UserPlus, Copy, Check, PauseCircle, PlayCircle, Wallet, BadgeCheck, Clock3, School, Loader2, RefreshCw, Banknote, Link2 } from 'lucide-react';
import { formatFCFA } from '../types';
import { adminCreateAffiliate, adminListAffiliates, adminMarkAffiliateCommissionPaid, adminSetAffiliateStatus, type AdminAffiliate, type AdminAffiliateCommission } from '../lib/admin';

type Props = { code: string; onToast: (message: string) => void };
const paymentMethods = ['Orange Money','Wave','Moov Money','Espèces','Virement'];

export function AffiliateAdmin({ code, onToast }: Props) {
  const [items, setItems] = useState<AdminAffiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [search, setSearch] = useState('');
  const [paying, setPaying] = useState<AdminAffiliateCommission | null>(null);
  const [method, setMethod] = useState('Orange Money');
  const [reference, setReference] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems(await adminListAffiliates(code)); }
    catch (e: any) { setError(e?.message || 'Impossible de charger les partenaires.'); }
    finally { setLoading(false); }
  }, [code]);
  useEffect(() => { void refresh(); }, [refresh]);

  const totals = useMemo(() => items.reduce((acc, item) => ({
    due: acc.due + item.due_total,
    paid: acc.paid + item.paid_total,
    referrals: acc.referrals + item.referrals_count,
    active: acc.active + (item.status === 'active' ? 1 : 0),
  }), { due: 0, paid: 0, referrals: 0, active: 0 }), [items]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(x => !q || [x.full_name,x.phone,x.email,x.referral_code].some(v => (v || '').toLowerCase().includes(q)));
  }, [items, search]);

  const addAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2 || !phone.trim()) { setError('Le nom et le téléphone sont obligatoires.'); return; }
    setSaving(true); setError('');
    try {
      await adminCreateAffiliate(code, { full_name: name.trim(), phone: phone.trim(), email: email.trim() });
      setName(''); setPhone(''); setEmail('');
      await refresh();
      onToast('Partenaire ajouté. Son lien personnel est prêt.');
    } catch (e: any) { setError(e?.message || 'Impossible de créer ce partenaire.'); }
    finally { setSaving(false); }
  };

  const referralUrl = (codeValue: string) => window.location.origin + '/?ref=' + encodeURIComponent(codeValue);
  const copyLink = async (codeValue: string) => {
    const url = referralUrl(codeValue);
    try { await navigator.clipboard.writeText(url); onToast('Lien de parrainage copié.'); }
    catch { onToast('Copie impossible sur cet appareil. Copiez ce lien : ' + url); }
  };

  const toggleStatus = async (affiliate: AdminAffiliate) => {
    setBusyId(affiliate.id);
    try {
      await adminSetAffiliateStatus(code, affiliate.id, affiliate.status === 'active' ? 'paused' : 'active');
      await refresh();
      onToast(affiliate.status === 'active' ? 'Lien de parrainage suspendu.' : 'Lien de parrainage réactivé.');
    } catch (e: any) { onToast(e?.message || 'Modification impossible.'); }
    finally { setBusyId(null); }
  };

  const confirmPaid = async () => {
    if (!paying) return;
    setBusyId(paying.id);
    try {
      await adminMarkAffiliateCommissionPaid(code, paying.id, method, reference.trim());
      setPaying(null); setReference('');
      await refresh();
      onToast('Commission marquée comme payée et enregistrée dans l’historique.');
    } catch (e: any) { onToast(e?.message || 'Enregistrement du paiement impossible.'); }
    finally { setBusyId(null); }
  };

  return <section data-admin-module="affiliations" className="mb-8 space-y-5">
    <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-[#172554] via-[#1e3a8a] to-[#1d4ed8] p-5 text-white shadow-xl sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-800 text-[#ffe08a]"><Users className="h-3.5 w-3.5"/> RÉSEAU COMMERCIAL</div>
          <h2 className="font-display text-2xl font-800 tracking-tight sm:text-3xl">Affiliés & commissions</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">Gérez les personnes qui recommandent Gestilys, partagez leurs liens et suivez chaque commission jusqu’à son règlement.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-700 text-white"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/> Actualiser</button>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Partenaires actifs" value={String(totals.active)} icon={<Users className="h-4 w-4"/>}/>
        <Metric label="Écoles apportées" value={String(totals.referrals)} icon={<School className="h-4 w-4"/>}/>
        <Metric label="Commissions à payer" value={formatFCFA(totals.due)} icon={<Clock3 className="h-4 w-4"/>}/>
        <Metric label="Total déjà payé" value={formatFCFA(totals.paid)} icon={<BadgeCheck className="h-4 w-4"/>}/>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.6fr)]">
      <form onSubmit={addAffiliate} className="h-fit rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_10px_30px_rgba(23,37,84,.06)] sm:p-5">
        <div className="mb-4 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff5d6] text-[#8a5a00]"><UserPlus className="h-5 w-5"/></span><div><h3 className="font-display text-lg font-800 text-[#172554]">Ajouter un partenaire</h3><p className="text-xs text-slate-600">Créer son lien personnel de recommandation</p></div></div>
        <Field label="Nom complet"><input required minLength={2} value={name} onChange={e=>setName(e.target.value)} placeholder="Nom du partenaire" className={inputClass}/></Field>
        <Field label="Téléphone / WhatsApp"><input required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+223 70 00 00 00" className={inputClass}/></Field>
        <Field label="E-mail (facultatif)"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="partenaire@email.com" className={inputClass}/></Field>
        {error && <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-600 text-red-800">{error}</p>}
        <button type="submit" disabled={saving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#172554] to-[#1d4ed8] px-4 py-3 text-sm font-800 text-white shadow-md disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <UserPlus className="h-4 w-4"/>} Créer le partenaire</button>
        <p className="mt-3 text-xs leading-5 text-slate-600">Chaque partenaire reçoit un code unique. Le lien attribue automatiquement les nouvelles écoles inscrites avec ce lien.</p>
      </form>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="font-display text-lg font-800 text-[#172554]">Mes partenaires</h3><p className="text-xs text-slate-600">{items.length} partenaire(s) enregistré(s)</p></div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un partenaire…" className={`${inputClass} sm:max-w-64`}/>
        </div>
        {loading ? <div className="rounded-2xl border border-blue-100 bg-white p-10 text-center text-sm font-700 text-[#1e3a8a]"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin"/>Chargement des partenaires…</div> :
          filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-blue-200 bg-white p-8 text-center text-sm text-slate-600">{items.length ? 'Aucun résultat.' : 'Aucun partenaire pour le moment. Ajoutez votre premier ambassadeur Gestilys.'}</div> :
          filtered.map(affiliate => <article key={affiliate.id} className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_8px_24px_rgba(23,37,84,.05)]">
            <div className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eaf1ff] text-[#1e3a8a]"><Users className="h-5 w-5"/></span><div className="min-w-0"><h4 className="truncate font-display text-base font-800 text-[#172554]">{affiliate.full_name}</h4><p className="break-all text-xs font-600 text-slate-600">{affiliate.phone}{affiliate.email ? ' · '+affiliate.email : ''}</p></div></div>
                <span className={`rounded-full px-3 py-1 text-xs font-800 ${affiliate.status==='active'?'bg-emerald-100 text-emerald-800':'bg-slate-200 text-slate-700'}`}>{affiliate.status==='active'?'Actif':'En pause'}</span>
              </div>
              <div className="mt-4 rounded-xl border border-[#f3d98c] bg-[#fffaf0] p-3">
                <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-800 uppercase tracking-wider text-[#795200]">Code de parrainage</span><span className="font-mono text-sm font-800 text-[#172554]">{affiliate.referral_code}</span></div>
                <button type="button" onClick={()=>void copyLink(affiliate.referral_code)} className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#172554] px-3 py-2 text-xs font-800 text-white"><Link2 className="h-4 w-4"/> Copier le lien personnel <Copy className="h-3.5 w-3.5"/></button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <MiniStat label="Écoles" value={String(affiliate.referrals_count)}/>
                <MiniStat label="À payer" value={formatFCFA(affiliate.due_total)}/>
                <MiniStat label="Déjà payé" value={formatFCFA(affiliate.paid_total)}/>
              </div>
              <button type="button" onClick={()=>void toggleStatus(affiliate)} disabled={busyId===affiliate.id} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-800 text-[#1e3a8a] disabled:opacity-50">{busyId===affiliate.id?<Loader2 className="h-4 w-4 animate-spin"/>:affiliate.status==='active'?<PauseCircle className="h-4 w-4"/>:<PlayCircle className="h-4 w-4"/>}{affiliate.status==='active'?'Mettre en pause':'Réactiver le partenaire'}</button>
            </div>
            {affiliate.commissions.length>0 && <div className="border-t border-blue-100 bg-[#f8faff] p-3 sm:p-4">
              <h5 className="mb-2 flex items-center gap-2 text-xs font-800 uppercase tracking-wider text-[#172554]"><Wallet className="h-4 w-4"/> Historique des commissions</h5>
              <div className="space-y-2">{affiliate.commissions.map(c=><div key={c.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-800 text-[#172554]">{c.school_name}</p><p className="text-xs text-slate-600">{c.plan} · {new Date(c.created_at).toLocaleDateString('fr-FR')}</p></div><div className="text-right"><p className="text-sm font-800 tabular-nums text-[#172554]">{formatFCFA(c.commission_amount)}</p><span className={`text-[11px] font-800 ${c.status==='paid'?'text-emerald-700':'text-[#9a6700]'}`}>{c.status==='paid'?'Payée':'À payer'}</span></div></div>
                {c.status==='paid' ? <p className="mt-2 text-[11px] text-slate-600">Réglée le {c.paid_at ? new Date(c.paid_at).toLocaleDateString('fr-FR') : '—'} · {c.payment_method || 'Moyen non précisé'}{c.payment_reference ? ' · Réf. '+c.payment_reference : ''}</p> : <button type="button" onClick={()=>{setPaying(c);setMethod('Orange Money');setReference('');}} className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#fff3cd] px-3 py-2 text-xs font-800 text-[#704b00]"><Banknote className="h-4 w-4"/> Enregistrer le paiement</button>}
              </div>)}</div>
            </div>}
          </article>)
        }
      </div>
    </div>

    {paying && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0b1738]/65 p-4" role="dialog" aria-modal="true" aria-label="Enregistrer un paiement de commission">
      <div className="w-full max-w-md rounded-2xl border border-blue-100 bg-white p-5 shadow-2xl">
        <div className="mb-4"><h3 className="font-display text-lg font-800 text-[#172554]">Confirmer le versement</h3><p className="mt-1 text-sm text-slate-600">{paying.school_name} · {formatFCFA(paying.commission_amount)}</p></div>
        <Field label="Moyen de paiement"><select value={method} onChange={e=>setMethod(e.target.value)} className={inputClass}>{paymentMethods.map(m=><option key={m}>{m}</option>)}</select></Field>
        <Field label="Référence / numéro de transaction (facultatif)"><input value={reference} onChange={e=>setReference(e.target.value)} placeholder="Ex. référence Wave ou Orange Money" className={inputClass}/></Field>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row"><button type="button" onClick={()=>setPaying(null)} className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-700 text-slate-700">Annuler</button><button type="button" onClick={()=>void confirmPaid()} disabled={busyId===paying.id} className="min-h-11 flex-1 rounded-xl bg-gradient-to-r from-[#172554] to-[#1d4ed8] px-4 py-2 text-sm font-800 text-white disabled:opacity-60">{busyId===paying.id?<Loader2 className="inline h-4 w-4 animate-spin"/>:<Check className="inline h-4 w-4"/>} Confirmer le versement</button></div>
      </div>
    </div>}
  </section>;
}

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-600 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
function Field({label,children}:{label:string;children:React.ReactNode}) { return <label className="mb-3 block text-xs font-800 text-[#172554]">{label}<span className="mt-1.5 block">{children}</span></label>; }
function Metric({label,value,icon}:{label:string;value:string;icon:React.ReactNode}) { return <div className="rounded-xl border border-white/20 bg-white/10 p-3"><div className="flex items-center gap-1.5 text-[11px] font-700 text-blue-100">{icon}{label}</div><div className="mt-1 break-words text-lg font-800 tabular-nums text-white sm:text-xl">{value}</div></div>; }
function MiniStat({label,value}:{label:string;value:string}) { return <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-2"><p className="text-[10px] font-700 text-slate-600">{label}</p><p className="mt-1 break-words text-xs font-800 text-[#172554]">{value}</p></div>; }
