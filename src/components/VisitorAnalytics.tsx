import { useCallback, useEffect, useState } from 'react';
import { Activity, CalendarDays, Clock3, Globe2, Laptop, Loader2, RefreshCw, Smartphone, Tablet, Users, ExternalLink } from 'lucide-react';
import { adminGetVisitorAnalytics, type AdminVisit } from '../lib/admin';

interface Props { code: string; }

function dateTime(value: string): string {
  try { return new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return value; }
}

function duration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return 'En cours / inconnu';
  if (seconds < 60) return `${seconds} s`;
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}

function DeviceIcon({ device }: { device: string }) {
  if (device === 'Téléphone') return <Smartphone className="h-4 w-4" />;
  if (device === 'Tablette') return <Tablet className="h-4 w-4" />;
  return <Laptop className="h-4 w-4" />;
}

export function VisitorAnalytics({ code }: Props) {
  const [visits, setVisits] = useState<AdminVisit[]>([]);
  const [summary, setSummary] = useState({ total: 0, unique_visitors: 0, today: 0, last_7_days: 0, last_30_days: 0, returning_visitors: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'7' | '30' | 'all'>('30');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await adminGetVisitorAnalytics(code, period);
      setVisits(result.visits);
      setSummary(result.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les visites.');
    } finally { setLoading(false); }
  }, [code, period]);

  useEffect(() => { void load(); }, [load]);

  const exportCsv = () => {
    const columns = ['Date', 'Visiteur pseudonyme', 'Session', 'Page', 'Appareil', 'Système', 'Navigateur', 'Écran', 'Langue', 'Fuseau horaire', 'Source', 'Support', 'Campagne', 'Référent', 'Durée (secondes)'];
    const rows = visits.map(v => [v.created_at, v.visitor_id, v.session_id, v.page_path, v.device_type, v.operating_system, v.browser, v.screen_size, v.language, v.timezone, v.utm_source, v.utm_medium, v.utm_campaign, v.referrer_origin, v.duration_seconds]);
    const csv = [columns, ...rows].map(row => row.map(value => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = 'gestilys-visites.csv'; link.click(); URL.revokeObjectURL(url);
  };

  return <section className="space-y-5">
    <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-cardLg">
      <div className="flex flex-col gap-4 bg-gradient-to-r from-royal-950 via-royal-900 to-royal-800 p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-700 uppercase tracking-[0.18em] text-royal-200"><Activity className="h-4 w-4" /> Audience publique</div>
          <h2 className="mt-1 font-display text-xl font-800 sm:text-2xl">Visites de Gestilys</h2>
          <p className="mt-1 max-w-2xl text-sm text-blue-100">Suivi des personnes qui consultent la page publique, même sans créer de compte ni démarrer un essai.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-gold-400 bg-gold-400 px-3 py-2 text-sm font-800 text-royal-950 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser</button>
          <button onClick={exportCsv} disabled={!visits.length} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-800 text-white disabled:opacity-50">Exporter CSV</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px bg-blue-100 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: 'Visites enregistrées', value: summary.total, icon: Activity },
          { label: 'Visiteurs distincts', value: summary.unique_visitors, icon: Users },
          { label: 'Aujourd’hui', value: summary.today, icon: CalendarDays },
          { label: '7 derniers jours', value: summary.last_7_days, icon: Clock3 },
          { label: '30 derniers jours', value: summary.last_30_days, icon: Globe2 },
        ].map(card => <div key={card.label} className="bg-white p-4 sm:p-5"><div className="flex items-center gap-2 text-xs font-700 text-slate-600"><card.icon className="h-4 w-4 text-royal-700" />{card.label}</div><div className="mt-2 text-2xl font-900 tracking-tight text-royal-950">{card.value.toLocaleString('fr-FR')}</div></div>)}
      </div>
    </div>

    <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-card sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="font-display text-lg font-800 text-royal-950">Journal des visites</h3><p className="mt-1 text-sm text-slate-600">Identifiant pseudonyme, appareil, navigateur, système, provenance et temps passé.</p></div>
        <label className="flex items-center gap-2 text-sm font-700 text-royal-950">Période
          <select value={period} onChange={e => setPeriod(e.target.value as typeof period)} className="h-10 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-700 text-royal-950">
            <option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="all">Tout l’historique</option>
          </select>
        </label>
      </div>
      {error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-600 text-red-800">{error}</div>}
      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-royal-700" /><span className="ml-2 text-sm text-slate-600">Chargement des visites…</span></div>
      : visits.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-blue-200 bg-blue-50/60 p-8 text-center"><Globe2 className="mx-auto h-8 w-8 text-royal-600" /><p className="mt-3 font-800 text-royal-950">Aucune visite enregistrée sur cette période</p><p className="mt-1 text-sm text-slate-600">Les nouvelles visites apparaîtront ici après activation du suivi.</p></div>
      : <div className="mt-4 space-y-3">
        {visits.map(v => <article key={v.id} className="rounded-xl border border-blue-100 bg-gradient-to-r from-white to-blue-50/60 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-2.5 py-1 text-xs font-800 text-royal-800"><DeviceIcon device={v.device_type} />{v.device_type}</span><span className="rounded-full border border-gold-200 bg-gold-50 px-2.5 py-1 text-xs font-800 text-amber-900">{v.browser}</span><span className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-700 text-blue-800">{v.operating_system}</span></div>
              <p className="mt-2 break-all text-sm font-800 text-royal-950">Visiteur {v.visitor_id.slice(0, 8)} · Session {v.session_id.slice(0, 8)}</p>
              <p className="mt-1 text-xs text-slate-600">{dateTime(v.created_at)} · Durée : {duration(v.duration_seconds)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-64">
              <div className="rounded-lg border border-blue-100 bg-white p-2"><span className="block text-slate-500">Page</span><span className="mt-1 block break-all font-800 text-royal-900">{v.page_path}</span></div>
              <div className="rounded-lg border border-blue-100 bg-white p-2"><span className="block text-slate-500">Écran / langue</span><span className="mt-1 block font-800 text-royal-900">{v.screen_size || '—'} · {v.language || '—'}</span></div>
              <div className="rounded-lg border border-blue-100 bg-white p-2"><span className="block text-slate-500">Provenance</span><span className="mt-1 block break-all font-800 text-royal-900">{v.utm_source || v.referrer_origin || 'Lien direct / inconnu'}</span></div>
              <div className="rounded-lg border border-blue-100 bg-white p-2"><span className="block text-slate-500">Campagne</span><span className="mt-1 block break-all font-800 text-royal-900">{v.utm_campaign || v.utm_medium || '—'}</span></div>
              {v.timezone && <div className="col-span-2 rounded-lg border border-blue-100 bg-white p-2"><span className="block text-slate-500">Fuseau horaire déclaré par l’appareil</span><span className="mt-1 block font-800 text-royal-900">{v.timezone}</span></div>}
              {v.referrer_origin && <a href={v.referrer_origin} target="_blank" rel="noreferrer" className="col-span-2 inline-flex items-center gap-1 text-xs font-800 text-blue-700 underline"><ExternalLink className="h-3 w-3" /> Ouvrir le site référent</a>}
            </div>
          </div>
        </article>)}
      </div>}
      <p className="mt-4 text-xs leading-5 text-slate-500">Confidentialité : aucun numéro de téléphone, nom, adresse IP brute ni identifiant publicitaire n’est collecté. L’identifiant visiteur est pseudonyme et peut être réinitialisé par le navigateur. Les données concernent les nouvelles visites après activation, pas les visites passées.</p>
    </div>
  </section>;
}
