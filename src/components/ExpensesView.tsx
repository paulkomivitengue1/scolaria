import { useState } from 'react';
import { Receipt, Trash2, Plus } from 'lucide-react';
import type { Expense, ExpenseCategory } from '../types';
import { EXPENSE_CATEGORIES, formatFCFA } from '../types';

interface Props {
  expenses: Expense[];
  onAdd: (expense: Omit<Expense, 'id'>) => void;
  onDelete: (id: string) => void;
}

export function ExpensesView({ expenses, onAdd, onDelete }: Props) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('autre');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!label.trim() || !amt || amt <= 0) return;
    onAdd({ label: label.trim(), amount: amt, category, expenseDate: date });
    setLabel('');
    setAmount('');
    setCategory('autre');
    setDate(new Date().toISOString().slice(0, 10));
  };

  return (
    <div>
      <div className="mb-5">
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-royal-700">
          <Receipt className="h-3 w-3" /> Finance
        </div>
        <h1 className="font-display text-2xl font-700 tracking-tight text-ink sm:text-3xl">Dépenses</h1>
        <p className="mt-1 text-sm text-slate-500">Suivez les sorties d'argent de l'école.</p>
      </div>

      <div className="mb-6 rounded-2.5xl border border-slate-200 bg-white p-5 shadow-card">
        <p className="text-xs font-700 uppercase tracking-wider text-slate-500">Total Dépenses</p>
        <p className="mt-1.5 font-display text-2xl font-800 tracking-tight text-ink">{formatFCFA(total)}</p>
      </div>

      <form onSubmit={handleSubmit} className="mb-6 rounded-2.5xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="mb-4 font-display text-base font-700 text-ink">Ajouter une dépense</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-600 text-slate-500">Libellé</label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Ex : Achat de craies"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-royal-400 focus:ring-4"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-600 text-slate-500">Montant (FCFA)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-royal-400 focus:ring-4"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-600 text-slate-500">Catégorie</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as ExpenseCategory)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-royal-400 focus:ring-4"
            >
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-600 text-slate-500">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-royal-400 focus:ring-4"
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 px-4 py-2.5 text-sm font-700 text-white shadow-gold transition hover:brightness-105 active:scale-95"
        >
          <Plus className="h-4.5 w-4.5" /> Enregistrer la dépense
        </button>
      </form>

      <div className="rounded-2.5xl border border-slate-200 bg-white shadow-card">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-display text-base font-700 text-ink">Historique</h2>
        </div>
        {expenses.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">Aucune dépense enregistrée.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {expenses.map(exp => (
              <div key={exp.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-600 text-ink">{exp.label}</p>
                  <p className="text-[11px] text-slate-400">
                    {EXPENSE_CATEGORIES.find(c => c.id === exp.category)?.label} · {new Date(exp.expenseDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-700 text-ink">{formatFCFA(exp.amount)}</span>
                  <button
                    onClick={() => onDelete(exp.id)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
    }
