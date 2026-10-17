import { useEffect, useMemo, useState } from 'react';
import {
  Shirt, BookOpen, Boxes, Plus, Minus, Zap, AlertTriangle, Package,
  TrendingDown, Layers, BookMarked, CheckCircle2, XCircle,
} from 'lucide-react';
import type {
  UniformStockItem, BookStockItem, SupplyStockItem, UniformCycle, UniformSize, BookClass, BookSubject,
} from '../types';
import {
  UNIFORM_CYCLES, UNIFORM_SIZES, BOOK_CLASSES, BOOK_SUBJECTS,
  uniformRemaining, bookRemaining, formatFCFA,
} from '../types';
import { newUniformItem, newBookItem } from '../data';

type SubTab = 'tenues' | 'livres' | 'fournitures';

interface Props {
  uniforms: UniformStockItem[];
  books: BookStockItem[];
  onUniformsChange: (u: UniformStockItem[]) => void;
  onBooksChange: (b: BookStockItem[]) => void;
  supplies: SupplyStockItem[];
  onSuppliesChange: (items: SupplyStockItem[]) => void;
}

export function StocksView({ uniforms, books, onUniformsChange, onBooksChange, supplies, onSuppliesChange }: Props) {
  const [sub, setSub] = useState<SubTab>('tenues');

  return (
    <div className="animate-fadeIn">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-royal-700">
            <Boxes className="h-3 w-3" /> Inventaire
          </div>
          <h1 className="font-display text-2xl font-700 tracking-tight text-ink sm:text-3xl">Gestion des Stocks</h1>
          <p className="mt-1 text-sm text-slate-500">Suivez les tenues, livres et fournitures de votre établissement.</p>
        </div>
      </div>

      <div className="mb-6 flex w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:inline-flex sm:w-auto">
        <button
          onClick={() => setSub('tenues')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-700 transition ${
            sub === 'tenues' ? 'bg-royal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Shirt className="h-4 w-4" /> Stocks des Tenues
        </button>
        <button
          onClick={() => setSub('livres')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-700 transition ${
            sub === 'livres' ? 'bg-royal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="h-4 w-4" /> Stocks des Livres
        </button>
        <button onClick={() => setSub('fournitures')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-700 transition ${sub === 'fournitures' ? 'bg-royal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
          <Package className="h-4 w-4" /> Fournitures
        </button>
      </div>

      {sub === 'tenues' ? (
        <TenuesPanel uniforms={uniforms} onChange={onUniformsChange} />
      ) : sub === 'livres' ? (
        <LivresPanel books={books} onChange={onBooksChange} />
      ) : (
        <SuppliesPanel supplies={supplies} onChange={onSuppliesChange} />
      )}
    </div>
  );
}

/* ---------- Quantity input (mobile-friendly) ---------- */

function QtyInput({ value, onChange, max }: { value: number; onChange: (v: number) => void; max?: number }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  const clamp = (v: number) => Math.max(1, max !== undefined ? Math.min(Math.floor(v), max) : Math.floor(v));
  const commit = () => {
    const parsed = Number.parseInt(draft, 10);
    const next = clamp(Number.isFinite(parsed) ? parsed : 1);
    setDraft(String(next));
    onChange(next);
  };
  return (
    <div className="inline-flex shrink-0 items-center gap-1 rounded-xl border-2 border-slate-300 bg-white p-1">
      <button type="button" onClick={() => { const next = clamp(value - 1); setDraft(String(next)); onChange(next); }} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-700" aria-label="Diminuer la quantité"><Minus className="h-4 w-4" /></button>
      <input type="number" min="1" inputMode="numeric" value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }} className="w-16 bg-transparent text-center text-base font-800 text-slate-900 outline-none" aria-label="Quantité à ajouter ou distribuer" />
      <button type="button" onClick={() => { const next = clamp(value + 1); setDraft(String(next)); onChange(next); }} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-700" aria-label="Augmenter la quantité"><Plus className="h-4 w-4" /></button>
    </div>
  );
}
/* ---------- Toast (success + error) ---------- */

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 animate-fadeUp rounded-xl border px-4 py-2.5 text-sm font-700 shadow-cardLg ${
        type === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      <span className="inline-flex items-center gap-2">
        {type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        {message}
      </span>
    </div>
  );
}

/* ---------- Tenues ---------- */

function TenuesPanel({
  uniforms, onChange,
}: {
  uniforms: UniformStockItem[];
  onChange: (u: UniformStockItem[]) => void;
}) {
  const [activeCycle, setActiveCycle] = useState<UniformCycle>('maternelle');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [customSubject, setCustomSubject] = useState('');

  const getQty = (id: string) => qtys[id] ?? 1;
  const setQty = (id: string, v: number) => setQtys(prev => ({ ...prev, [id]: v }));
  const resetQty = (id: string) => setQtys(prev => ({ ...prev, [id]: 1 }));

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const cycleItems = useMemo(
    () => uniforms.filter((u) => u.cycle === activeCycle),
    [uniforms, activeCycle],
  );

  const totals = useMemo(() => {
    const oldStock = cycleItems.reduce((s, i) => s + i.oldStock, 0);
    const newStock = cycleItems.reduce((s, i) => s + i.newStock, 0);
    const sold = cycleItems.reduce((s, i) => s + i.sold, 0);
    const available = oldStock + newStock - sold;
    return { oldStock, newStock, sold, available };
  }, [cycleItems]);

  const updateItem = (id: string, patch: Partial<UniformStockItem>) => {
    onChange(uniforms.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };

  const buyQty = (item: UniformStockItem) => {
    const qty = getQty(item.id);
    updateItem(item.id, { newStock: item.newStock + qty });
    resetQty(item.id);
    showToast(`Achat enregistré — ${qty} tenue(s) taille ${item.size} ajoutée(s)`);
  };

  const sellQty = (item: UniformStockItem) => {
    const qty = getQty(item.id);
    const remaining = uniformRemaining(item);
    if (qty > remaining) {
      showToast(`Stock insuffisant : ${remaining} disponible(s), ${qty} demandé(es)`, 'error');
      return;
    }
    onChange(uniforms.map((u) => (u.id === item.id ? { ...u, sold: u.sold + qty } : u)));
    resetQty(item.id);
    showToast(`Vente enregistrée — ${qty} × ${formatFCFA(item.price)} = ${formatFCFA(qty * item.price)}`);
  };

  const ensureSize = (size: UniformSize) => {
    if (!cycleItems.some((i) => i.size === size)) {
      onChange([...uniforms, newUniformItem(activeCycle, size)]);
    }
  };

  const cycleLabel = UNIFORM_CYCLES.find((c) => c.id === activeCycle)?.label ?? '';

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} />}

      {/* cycle tabs */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {UNIFORM_CYCLES.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCycle(c.id)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-700 transition ${
              activeCycle === c.id
                ? 'bg-gradient-to-br from-royal-700 to-royal-900 text-white shadow-cardLg'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Layers className="h-4 w-4" /> {c.label}
          </button>
        ))}
      </div>

      {/* summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={Package} label="Ancien stock" value={totals.oldStock} accent="slate" />
        <SummaryCard icon={Plus} label="Nouveaux achats" value={totals.newStock} accent="royal" />
        <SummaryCard icon={TrendingDown} label="Vendus" value={totals.sold} accent="gold" />
        <SummaryCard icon={Boxes} label="Total disponible" value={totals.available} accent="emerald" />
      </div>

      {/* Mobile: stacked card layout */}
      <div className="space-y-3 md:hidden">
        {cycleItems.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-card">
            Aucune tenue enregistrée pour ce cycle. Ajoutez une taille ci-dessous.
          </div>
        )}
        {cycleItems.map((item) => {
          const remaining = uniformRemaining(item);
          const low = remaining < 3;
          const out = remaining <= 0;
          return (
            <div
              key={item.id}
              className={`rounded-2xl border bg-white p-4 shadow-card transition ${low ? 'border-red-200' : 'border-slate-200'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl text-base font-800 ${low ? 'bg-red-100 text-red-700' : 'bg-royal-50 text-royal-700'}`}>
                    {item.size}
                  </span>
                  <div>
                    <div className="font-display text-base font-800 text-ink">Taille {item.size}</div>
                    <div className="text-[11px] font-600 text-slate-400">{cycleLabel}</div>
                  </div>
                </div>
                {out ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-700 uppercase tracking-wider text-slate-500">
                    Rupture
                  </span>
                ) : low ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-700 uppercase tracking-wider text-red-700">
                    <AlertTriangle className="h-3 w-3" /> Stock Bas
                  </span>
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400">Ancien stock</div>
                  <NumberInput value={item.oldStock} onChange={(v) => updateItem(item.id, { oldStock: v })} />
                </div>
                <div className="rounded-xl bg-royal-50 px-3 py-2.5">
                  <div className="text-[10px] font-700 uppercase tracking-wider text-royal-700">Nouveaux achats</div>
                  <NumberInput value={item.newStock} onChange={(v) => updateItem(item.id, { newStock: v })} />
                </div>
                <div className="rounded-xl bg-gold-50 px-3 py-2.5">
                  <div className="text-[10px] font-700 uppercase tracking-wider text-gold-700">Prix unitaire</div>
                  <input
                    type="number"
                    min={0}
                    value={item.price}
                    onChange={(e) => updateItem(item.id, { price: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                    className="mt-0.5 w-full bg-transparent font-display text-base font-800 text-gold-700 outline-none"
                  />
                </div>
                <div className={`rounded-xl px-3 py-2.5 ${out ? 'bg-slate-50' : low ? 'bg-red-50' : 'bg-emerald-50'}`}>
                  <div className={`text-[10px] font-700 uppercase tracking-wider ${out ? 'text-slate-400' : low ? 'text-red-700' : 'text-emerald-700'}`}>Disponible</div>
                  <div className={`font-display text-2xl font-800 ${out ? 'text-slate-400' : low ? 'text-red-600' : 'text-emerald-600'}`}>{remaining}</div>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-[11px] font-600 text-slate-500">Vendus: <span className="font-800 text-gold-700">{item.sold}</span></div>
                <div className="text-[11px] font-600 text-slate-500">Valeur: <span className="font-800 text-ink">{formatFCFA(remaining * item.price)}</span></div>
              </div>

              {/* Quantity + action buttons */}
              <div className="mt-3 flex items-center gap-2">
                <QtyInput value={getQty(item.id)} onChange={(v) => setQty(item.id, v)} />
                <button
                  onClick={() => buyQty(item)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border-2 border-royal-200 bg-royal-50 px-2 py-2.5 text-xs font-700 text-royal-700 transition active:scale-95"
                >
                  <Plus className="h-4 w-4" /> Achat
                </button>
                <button
                  onClick={() => sellQty(item)}
                  disabled={out}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 px-2 py-2.5 text-xs font-700 text-white shadow-gold transition hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
                >
                  <Zap className="h-4 w-4" /> Vente
                </button>
              </div>
              <button
                onClick={() => onChange(uniforms.filter((u) => u.id !== item.id))}
                className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-600 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
              >
                <Minus className="h-3.5 w-3.5" /> Supprimer cette taille
              </button>
            </div>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card md:block">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <Shirt className="h-5 w-5 text-royal-700" />
            <h2 className="font-display text-base font-700 text-ink">Tenues — {cycleLabel}</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-600 text-slate-500">
            {cycleItems.length} taille{cycleItems.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] font-700 uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Taille</th>
                <th className="px-3 py-3 text-right">Ancien stock</th>
                <th className="px-3 py-3 text-right">Nouveaux achats</th>
                <th className="px-3 py-3 text-right">Vendus</th>
                <th className="px-3 py-3 text-right">Prix unitaire</th>
                <th className="px-3 py-3 text-right">Total disponible</th>
                <th className="px-5 py-3 text-right">Qté + Actions</th>
              </tr>
            </thead>
            <tbody>
              {cycleItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">
                    Aucune tenue enregistrée pour ce cycle. Ajoutez une taille ci-dessous.
                  </td>
                </tr>
              )}
              {cycleItems.map((item) => {
                const remaining = uniformRemaining(item);
                const low = remaining < 3;
                const out = remaining <= 0;
                return (
                  <tr key={item.id} className={`border-b border-slate-100 transition hover:bg-slate-50/60 ${low ? 'bg-red-50/50' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-800 ${low ? 'bg-red-100 text-red-700' : 'bg-royal-50 text-royal-700'}`}>
                          {item.size}
                        </span>
                        {low && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-700 uppercase tracking-wider text-red-700">
                            <AlertTriangle className="h-3 w-3" /> Alerte : Stock Bas
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <NumberInput value={item.oldStock} onChange={(v) => updateItem(item.id, { oldStock: v })} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <NumberInput value={item.newStock} onChange={(v) => updateItem(item.id, { newStock: v })} />
                    </td>
                    <td className="px-3 py-3 text-right font-700 text-slate-600">{item.sold}</td>
                    <td className="px-3 py-3 text-right">
                      <NumberInput value={item.price} onChange={(v) => updateItem(item.id, { price: v })} />
                    </td>
                    <td className={`px-3 py-3 text-right font-800 ${out ? 'text-slate-400' : low ? 'text-red-600' : 'text-emerald-600'}`}>{remaining}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <QtyInput value={getQty(item.id)} onChange={(v) => setQty(item.id, v)} />
                        <button
                          onClick={() => buyQty(item)}
                          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-royal-200 bg-royal-50 px-3 py-1.5 text-xs font-700 text-royal-700 transition hover:bg-royal-100 active:scale-95"
                        >
                          <Plus className="h-3.5 w-3.5" /> Achat
                        </button>
                        <button
                          onClick={() => sellQty(item)}
                          disabled={out}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-gold-500 to-gold-600 px-3 py-1.5 text-xs font-700 text-white shadow-gold transition hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
                        >
                          <Zap className="h-3.5 w-3.5" /> Vente
                        </button>
                        <button
                          onClick={() => onChange(uniforms.filter((u) => u.id !== item.id))}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          title="Supprimer"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* add size */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-card">
        <span className="text-xs font-600 text-slate-400">Ajouter une taille :</span>
        {UNIFORM_SIZES.filter((s) => !cycleItems.some((i) => i.size === s)).map((size) => (
          <button
            key={size}
            onClick={() => ensureSize(size)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-700 text-slate-600 transition hover:border-royal-300 hover:bg-royal-50 hover:text-royal-700"
          >
            <Plus className="h-3 w-3" /> {size}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Livres ---------- */

function LivresPanel({ books, onChange }: { books: BookStockItem[]; onChange: (b: BookStockItem[]) => void }) {
  const [activeClass, setActiveClass] = useState<BookClass>('Jardin');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [qtys, setQtys] = useState<Record<string, number>>({});

  const getQty = (id: string) => qtys[id] ?? 1;
  const setQty = (id: string, v: number) => setQtys(prev => ({ ...prev, [id]: v }));
  const resetQty = (id: string) => setQtys(prev => ({ ...prev, [id]: 1 }));

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const classItems = useMemo(
    () => books.filter((b) => b.className === activeClass),
    [books, activeClass],
  );

  const totals = useMemo(() => {
    const inStock = classItems.reduce((s, i) => s + i.inStock, 0);
    const sold = classItems.reduce((s, i) => s + i.sold, 0);
    return { inStock, sold, remaining: Math.max(0, inStock - sold) };
  }, [classItems]);

  const updateItem = (id: string, patch: Partial<BookStockItem>) => {
    onChange(books.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const buyQty = (item: BookStockItem) => {
    const qty = getQty(item.id);
    updateItem(item.id, { inStock: item.inStock + qty });
    resetQty(item.id);
    showToast(`Réapprovisionnement — ${qty} livre(s) ${item.subject} ajouté(s)`);
  };

  const sellQty = (item: BookStockItem) => {
    const qty = getQty(item.id);
    const remaining = bookRemaining(item);
    if (qty > remaining) {
      showToast(`Stock insuffisant : ${remaining} disponible(s), ${qty} demandé(s)`, 'error');
      return;
    }
    onChange(books.map((b) => (b.id === item.id ? { ...b, sold: b.sold + qty } : b)));
    resetQty(item.id);
    showToast(`Vente — ${qty} × ${formatFCFA(item.price)} = ${formatFCFA(qty * item.price)}`);
  };

  const ensureSubject = (subject: BookSubject) => {
    const clean = subject.trim();
    if (clean && !classItems.some((i) => i.subject.toLowerCase() === clean.toLowerCase())) {
      onChange([...books, newBookItem(activeClass, clean)]);
      setCustomSubject('');
    }
  };

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} />}

      {/* class tabs */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {BOOK_CLASSES.map((c) => (
          <button
            key={c}
            onClick={() => setActiveClass(c)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-700 transition ${
              activeClass === c
                ? 'bg-gradient-to-br from-royal-700 to-royal-900 text-white shadow-cardLg'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <BookMarked className="h-4 w-4" /> {c}
          </button>
        ))}
      </div>

      {/* summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryCard icon={Package} label="Qté Initiale" value={totals.inStock} accent="royal" />
        <SummaryCard icon={TrendingDown} label="Distribuée" value={totals.sold} accent="gold" />
        <SummaryCard icon={Boxes} label="Reste" value={totals.remaining} accent="emerald" />
      </div>

      {/* Mobile: stacked card layout */}
      <div className="space-y-3 md:hidden">
        {classItems.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-card">
            Aucun livre enregistré pour cette classe. Ajoutez une matière ci-dessous.
          </div>
        )}
        {classItems.map((item) => {
          const remaining = bookRemaining(item);
          const low = remaining < 3;
          const out = remaining <= 0;
          return (
            <div
              key={item.id}
              className={`rounded-2xl border bg-white p-4 shadow-card ${low ? 'border-red-200' : 'border-slate-200'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ${low ? 'bg-red-100 text-red-700' : 'bg-royal-50 text-royal-700'}`}>
                    <BookMarked className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="font-display text-base font-800 text-ink">{item.subject}</div>
                    <div className="text-[11px] font-600 text-slate-400">{activeClass}</div>
                  </div>
                </div>
                {out ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-700 uppercase tracking-wider text-slate-500">
                    Rupture
                  </span>
                ) : low ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-700 uppercase tracking-wider text-red-700">
                    <AlertTriangle className="h-3 w-3" /> Stock Bas
                  </span>
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2.5">
                <div className="rounded-xl bg-royal-50 px-2.5 py-2.5 text-center">
                  <div className="text-[10px] font-700 uppercase tracking-wider text-royal-700">Qté Initiale</div>
                  <NumberInput value={item.inStock} onChange={(v) => updateItem(item.id, { inStock: v })} />
                </div>
                <div className="rounded-xl bg-slate-50 px-2.5 py-2.5 text-center">
                  <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400">Distribuée</div>
                  <div className="font-display text-xl font-800 text-slate-700">{item.sold}</div>
                </div>
                <div className={`rounded-xl px-2.5 py-2.5 text-center ${out ? 'bg-slate-50' : low ? 'bg-red-50' : 'bg-emerald-50'}`}>
                  <div className={`text-[10px] font-700 uppercase tracking-wider ${out ? 'text-slate-400' : low ? 'text-red-700' : 'text-emerald-700'}`}>Reste</div>
                  <div className={`font-display text-xl font-800 ${out ? 'text-slate-400' : low ? 'text-red-600' : 'text-emerald-600'}`}>{remaining}</div>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between rounded-xl bg-gold-50 px-3 py-2">
                <div className="text-[10px] font-700 uppercase tracking-wider text-gold-700">Prix unitaire</div>
                <input
                  type="number"
                  min={0}
                  value={item.price}
                  onChange={(e) => updateItem(item.id, { price: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  className="w-24 bg-transparent text-right font-display text-base font-800 text-gold-700 outline-none"
                />
              </div>

              <div className="mt-2.5 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-[11px] font-600 text-slate-500">Distribués: <span className="font-800 text-gold-700">{item.sold}</span></div>
                <div className="text-[11px] font-600 text-slate-500">Valeur: <span className="font-800 text-ink">{formatFCFA(remaining * item.price)}</span></div>
              </div>

              {/* Quantity + action buttons */}
              <div className="mt-3 flex items-center gap-2">
                <QtyInput value={getQty(item.id)} onChange={(v) => setQty(item.id, v)} />
                <button
                  onClick={() => buyQty(item)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border-2 border-royal-200 bg-royal-50 px-2 py-2.5 text-xs font-700 text-royal-700 transition active:scale-95"
                >
                  <Plus className="h-4 w-4" /> Réappro
                </button>
                <button
                  onClick={() => sellQty(item)}
                  disabled={out}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 px-2 py-2.5 text-xs font-700 text-white shadow-gold transition hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
                >
                  <Zap className="h-4 w-4" /> Distrib.
                </button>
              </div>
              <button
                onClick={() => onChange(books.filter((b) => b.id !== item.id))}
                className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-600 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
              >
                <Minus className="h-3.5 w-3.5" /> Supprimer cette matière
              </button>
            </div>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card md:block">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-royal-700" />
            <h2 className="font-display text-base font-700 text-ink">Livres — {activeClass}</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-600 text-slate-500">
            {classItems.length} matière{classItems.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] font-700 uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Matière</th>
                <th className="px-3 py-3 text-right">Qté Initiale</th>
                <th className="px-3 py-3 text-right">Distribuée</th>
                <th className="px-3 py-3 text-right">Prix unitaire</th>
                <th className="px-3 py-3 text-right">Reste Armoire</th>
                <th className="px-5 py-3 text-right">Qté + Actions</th>
              </tr>
            </thead>
            <tbody>
              {classItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                    Aucun livre enregistré pour cette classe. Ajoutez une matière ci-dessous.
                  </td>
                </tr>
              )}
              {classItems.map((item) => {
                const remaining = bookRemaining(item);
                const low = remaining < 3;
                const out = remaining <= 0;
                return (
                  <tr key={item.id} className={`border-b border-slate-100 transition hover:bg-slate-50/60 ${low ? 'bg-red-50/50' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`grid h-8 w-8 place-items-center rounded-lg ${low ? 'bg-red-100 text-red-700' : 'bg-royal-50 text-royal-700'}`}>
                          <BookMarked className="h-4 w-4" />
                        </span>
                        <span className="font-700 text-ink">{item.subject}</span>
                        {low && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-700 uppercase tracking-wider text-red-700">
                            <AlertTriangle className="h-3 w-3" /> Alerte : Stock Bas
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <NumberInput value={item.inStock} onChange={(v) => updateItem(item.id, { inStock: v })} />
                    </td>
                    <td className="px-3 py-3 text-right font-700 text-slate-600">{item.sold}</td>
                    <td className="px-3 py-3 text-right">
                      <NumberInput value={item.price} onChange={(v) => updateItem(item.id, { price: v })} />
                    </td>
                    <td className={`px-3 py-3 text-right font-800 ${out ? 'text-slate-400' : low ? 'text-red-600' : 'text-emerald-600'}`}>{remaining}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <QtyInput value={getQty(item.id)} onChange={(v) => setQty(item.id, v)} />
                        <button
                          onClick={() => buyQty(item)}
                          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-royal-200 bg-royal-50 px-3 py-1.5 text-xs font-700 text-royal-700 transition hover:bg-royal-100 active:scale-95"
                        >
                          <Plus className="h-3.5 w-3.5" /> Réappro
                        </button>
                        <button
                          onClick={() => sellQty(item)}
                          disabled={out}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-gold-500 to-gold-600 px-3 py-1.5 text-xs font-700 text-white shadow-gold transition hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
                        >
                          <Zap className="h-3.5 w-3.5" /> Distrib.
                        </button>
                        <button
                          onClick={() => onChange(books.filter((b) => b.id !== item.id))}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          title="Supprimer"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* add subject */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-card">
        <span className="text-xs font-600 text-slate-400">Ajouter une matière :</span>
        {BOOK_SUBJECTS.filter((s) => !classItems.some((i) => i.subject === s)).map((subject) => (
          <button
            key={subject}
            onClick={() => ensureSubject(subject)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-700 text-slate-600 transition hover:border-royal-300 hover:bg-royal-50 hover:text-royal-700"
          >
            <Plus className="h-3 w-3" /> {subject}
          </button>
        ))}
        <form onSubmit={e => { e.preventDefault(); ensureSubject(customSubject); }} className="flex w-full flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row"><input value={customSubject} onChange={e => setCustomSubject(e.target.value)} placeholder="Autre matière ou titre de livre" className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-base text-slate-900"/><button type="submit" className="min-h-11 rounded-xl bg-royal-700 px-4 text-sm font-bold text-white">Ajouter</button></form>
      </div>
    </div>
  );
}

/* ---------- shared bits ---------- */

function SummaryCard({
  icon: Icon, label, value, accent,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; accent: 'slate' | 'royal' | 'gold' | 'emerald' }) {
  const styles: Record<string, string> = {
    slate: 'from-slate-100 to-slate-200 text-slate-700',
    royal: 'from-royal-50 to-royal-100 text-royal-700',
    gold: 'from-gold-50 to-gold-100 text-gold-700',
    emerald: 'from-emerald-50 to-emerald-100 text-emerald-600',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-card sm:p-4">
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${styles[accent]} sm:h-11 sm:w-11`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="text-center sm:text-left">
          <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400 sm:text-[11px]">{label}</div>
          <div className="font-display text-xl font-800 text-ink sm:text-2xl">{value}</div>
        </div>
      </div>
    </div>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
      className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-right text-sm font-700 text-ink outline-none transition focus:border-royal-400 focus:ring-4"
    />
  );
}


function SuppliesPanel({ supplies, onChange }: { supplies: SupplyStockItem[]; onChange: (items: SupplyStockItem[]) => void }) {
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (!seeded && supplies.length === 0) {
      setSeeded(true);
      onChange([
        { id: 'default-cahier-100', name: 'Cahier de 100 pages', category: 'Cahiers', unit: 'unité', quantity: 0, minStock: 10, price: 0 },
        { id: 'default-cahier-dessin', name: 'Cahier de dessin', category: 'Cahiers', unit: 'unité', quantity: 0, minStock: 5, price: 0 },
        { id: 'default-cahier-200', name: 'Cahier de 200 pages', category: 'Cahiers', unit: 'unité', quantity: 0, minStock: 10, price: 0 },
        { id: 'default-bic-bleu', name: 'Bic bleu', category: 'Écriture', unit: 'pièce', quantity: 0, minStock: 20, price: 0 },
        { id: 'default-bic-rouge', name: 'Bic rouge', category: 'Écriture', unit: 'pièce', quantity: 0, minStock: 10, price: 0 },
        { id: 'default-crayon', name: 'Crayon à papier', category: 'Écriture', unit: 'pièce', quantity: 0, minStock: 10, price: 0 },
        { id: 'default-gomme', name: 'Gomme', category: 'Écriture', unit: 'pièce', quantity: 0, minStock: 10, price: 0 },
        { id: 'default-couverture', name: 'Couverture de cahier', category: 'Protection', unit: 'pièce', quantity: 0, minStock: 10, price: 0 },
        { id: 'default-regle', name: 'Règle', category: 'Matériel', unit: 'pièce', quantity: 0, minStock: 5, price: 0 },
        { id: 'default-taille-crayon', name: 'Taille-crayon', category: 'Matériel', unit: 'pièce', quantity: 0, minStock: 5, price: 0 },
      ]);
    }
  }, [seeded, supplies.length, onChange]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Fourniture scolaire');
  const [unit, setUnit] = useState('unité');
  const [quantity, setQuantity] = useState('0');
  const [minStock, setMinStock] = useState('3');
  const [price, setPrice] = useState('0');
  const [query, setQuery] = useState('');
  const low = supplies.filter(i => i.quantity <= i.minStock);
  const totalValue = supplies.reduce((sum, i) => sum + i.quantity * i.price, 0);
  const filtered = supplies.filter(i => (i.name + ' ' + i.category).toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const add = () => {
    if (!name.trim()) return;
    onChange([...supplies, { id: `new-${Date.now()}`, name: name.trim(), category, unit,
      quantity: Math.max(0, Number(quantity) || 0), minStock: Math.max(0, Number(minStock) || 0),
      price: Math.max(0, Number(price) || 0) }]);
    setName(''); setQuantity('0'); setPrice('0');
  };
  return <div className="space-y-5">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Articles suivis</p><p className="mt-1 text-2xl font-bold text-ink">{supplies.length}</p></div>
      <div className={`rounded-2xl border p-4 ${low.length ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}><p className="text-xs font-semibold text-slate-600">Stocks faibles</p><p className="mt-1 text-2xl font-bold text-amber-700">{low.length}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Valeur estimée du stock</p><p className="mt-1 text-2xl font-bold text-ink">{formatFCFA(totalValue)}</p></div>
    </div>
    <form onSubmit={e => { e.preventDefault(); add(); }} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
      <label className="text-xs font-semibold text-slate-600 lg:col-span-2">Nom de l’article<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Ex. Cahiers 200 pages" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-royal-600 focus:ring-2 focus:ring-royal-100"/></label>
      <label className="text-xs font-semibold text-slate-600">Catégorie<input value={category} onChange={e=>setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-royal-600"/></label>
      <label className="text-xs font-semibold text-slate-600">Unité<input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="paquet, boîte…" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-royal-600"/></label>
      <label className="text-xs font-semibold text-slate-600">Quantité<input type="number" min="0" value={quantity} onChange={e=>setQuantity(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-royal-600"/></label>
      <label className="text-xs font-semibold text-slate-600">Seuil d’alerte<input type="number" min="0" value={minStock} onChange={e=>setMinStock(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-royal-600"/></label>
      <label className="text-xs font-semibold text-slate-600">Prix unitaire (FCFA)<input type="number" min="0" value={price} onChange={e=>setPrice(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-royal-600"/></label>
      <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-royal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-royal-800 focus:outline-none focus:ring-2 focus:ring-royal-300 lg:col-span-2"><Plus className="h-4 w-4"/> Ajouter l’article</button>
    </form>
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher une fourniture…" className="mb-4 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-royal-600 sm:max-w-sm"/>
      {filtered.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Aucun article. Ajoutez votre première fourniture ci-dessus.</p> :
      <div className="space-y-3">{filtered.map(item=><div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><p className="font-bold text-slate-900">{item.name}</p><p className="text-xs text-slate-500">{item.category} · {item.unit} · {formatFCFA(item.price)} / unité</p>
        {item.quantity <= item.minStock && <p className="mt-1 text-xs font-bold text-amber-700">Stock faible — seuil : {item.minStock}</p>}</div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" aria-label={`Diminuer ${item.name}`} onClick={()=>onChange(supplies.map(i=>i.id===item.id?{...i,quantity:Math.max(0,i.quantity-1)}:i))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"><Minus className="h-4 w-4"/></button>
          <span className="min-w-12 text-center text-sm font-bold text-slate-900">{item.quantity}</span>
          <button type="button" aria-label={`Augmenter ${item.name}`} onClick={()=>onChange(supplies.map(i=>i.id===item.id?{...i,quantity:i.quantity+1}:i))} className="grid h-9 w-9 place-items-center rounded-lg bg-royal-700 text-white hover:bg-royal-800"><Plus className="h-4 w-4"/></button>
          <button type="button" onClick={()=>onChange(supplies.filter(i=>i.id!==item.id))} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">Supprimer</button>
        </div>
      </div>)}</div>}
    </div>
  </div>;
}
