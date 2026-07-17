import { useMemo, useState } from 'react';
import {
  Shirt, BookOpen, Boxes, Plus, Minus, Zap, AlertTriangle, Package,
  TrendingDown, Layers, BookMarked,
} from 'lucide-react';
import type {
  UniformStockItem, BookStockItem, UniformCycle, UniformSize, BookClass, BookSubject,
} from '../types';
import {
  UNIFORM_CYCLES, UNIFORM_SIZES, BOOK_CLASSES, BOOK_SUBJECTS,
  uniformRemaining, bookRemaining,
} from '../types';
import { newUniformItem, newBookItem } from '../data';

type SubTab = 'tenues' | 'livres';

interface Props {
  uniforms: UniformStockItem[];
  books: BookStockItem[];
  onUniformsChange: (u: UniformStockItem[]) => void;
  onBooksChange: (b: BookStockItem[]) => void;
}

export function StocksView({ uniforms, books, onUniformsChange, onBooksChange }: Props) {
  const [sub, setSub] = useState<SubTab>('tenues');

  return (
    <div className="animate-fadeIn">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-royal-700">
            <Boxes className="h-3 w-3" /> Inventaire
          </div>
          <h1 className="font-display text-2xl font-700 tracking-tight text-ink sm:text-3xl">Gestion des Stocks</h1>
          <p className="mt-1 text-sm text-slate-500">Suivez les tenues et les livres de votre établissement en temps réel.</p>
        </div>
      </div>

      <div className="mb-6 inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
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
      </div>

      {sub === 'tenues' ? (
        <TenuesPanel uniforms={uniforms} onChange={onUniformsChange} />
      ) : (
        <LivresPanel books={books} onChange={onBooksChange} />
      )}
    </div>
  );
}

/* ---------- Tenues ---------- */

function TenuesPanel({ uniforms, onChange }: { uniforms: UniformStockItem[]; onChange: (u: UniformStockItem[]) => void }) {
  const [activeCycle, setActiveCycle] = useState<UniformCycle>('maternelle');

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

  const quickSell = (id: string) => {
    onChange(uniforms.map((u) => (u.id === id ? { ...u, sold: u.sold + 1 } : u)));
  };

  const ensureSize = (size: UniformSize) => {
    if (!cycleItems.some((i) => i.size === size)) {
      onChange([...uniforms, newUniformItem(activeCycle, size)]);
    }
  };

  const cycleLabel = UNIFORM_CYCLES.find((c) => c.id === activeCycle)?.label ?? '';

  return (
    <div>
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

      {/* table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
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
                <th className="px-3 py-3 text-right">Total disponible</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cycleItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                    Aucune tenue enregistrée pour ce cycle. Ajoutez une taille ci-dessous.
                  </td>
                </tr>
              )}
              {cycleItems.map((item) => {
                const remaining = uniformRemaining(item);
                const low = remaining < 3;
                return (
                  <tr key={item.id} className={`border-b border-slate-100 transition hover:bg-slate-50/60 ${low ? 'bg-red-50/50' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-800 ${low ? 'bg-red-100 text-red-700' : 'bg-royal-50 text-royal-700'}`}>
                          {item.size}
                        </span>
                        {low && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-700 uppercase tracking-wider text-red-700">
                            <AlertTriangle className="h-3 w-3" /> Stock bas
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
                    <td className={`px-3 py-3 text-right font-800 ${low ? 'text-red-600' : 'text-emerald-600'}`}>{remaining}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => quickSell(item.id)}
                          disabled={remaining <= 0}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-gold-500 to-gold-600 px-3 py-1.5 text-xs font-700 text-white shadow-gold transition hover:brightness-105 active:scale-95 disabled:opacity-40"
                        >
                          <Zap className="h-3.5 w-3.5" /> Vente rapide
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
        {/* add size */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3">
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
    </div>
  );
}

/* ---------- Livres ---------- */

function LivresPanel({ books, onChange }: { books: BookStockItem[]; onChange: (b: BookStockItem[]) => void }) {
  const [activeClass, setActiveClass] = useState<BookClass>('Jardin');

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

  const quickSell = (id: string) => {
    onChange(books.map((b) => (b.id === id ? { ...b, sold: b.sold + 1 } : b)));
  };

  const ensureSubject = (subject: BookSubject) => {
    if (!classItems.some((i) => i.subject === subject)) {
      onChange([...books, newBookItem(activeClass, subject)]);
    }
  };

  return (
    <div>
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
      <div className="mb-6 grid grid-cols-3 gap-3">
        <SummaryCard icon={Package} label="En stock" value={totals.inStock} accent="royal" />
        <SummaryCard icon={TrendingDown} label="Vendus" value={totals.sold} accent="gold" />
        <SummaryCard icon={Boxes} label="Restants" value={totals.remaining} accent="emerald" />
      </div>

      {/* table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
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
                <th className="px-3 py-3 text-right">En stock</th>
                <th className="px-3 py-3 text-right">Vendus</th>
                <th className="px-3 py-3 text-right">Restants</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {classItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">
                    Aucun livre enregistré pour cette classe. Ajoutez une matière ci-dessous.
                  </td>
                </tr>
              )}
              {classItems.map((item) => {
                const remaining = bookRemaining(item);
                const low = remaining < 3;
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
                            <AlertTriangle className="h-3 w-3" /> Stock bas
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <NumberInput value={item.inStock} onChange={(v) => updateItem(item.id, { inStock: v })} />
                    </td>
                    <td className="px-3 py-3 text-right font-700 text-slate-600">{item.sold}</td>
                    <td className={`px-3 py-3 text-right font-800 ${low ? 'text-red-600' : 'text-emerald-600'}`}>{remaining}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => quickSell(item.id)}
                          disabled={remaining <= 0}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-gold-500 to-gold-600 px-3 py-1.5 text-xs font-700 text-white shadow-gold transition hover:brightness-105 active:scale-95 disabled:opacity-40"
                        >
                          <Zap className="h-3.5 w-3.5" /> Vente rapide
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
        {/* add subject */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3">
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
        </div>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${styles[accent]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="text-[11px] font-700 uppercase tracking-wider text-slate-400">{label}</div>
          <div className="font-display text-2xl font-800 text-ink">{value}</div>
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
