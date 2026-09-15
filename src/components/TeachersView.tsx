import { useState, useMemo } from 'react';
import {
  Users, Plus, Trash2, Pencil, Check, X, Phone, BookOpen,
  Wallet, TrendingUp, Clock,
} from 'lucide-react';
import type { Teacher, SalaryPayment } from '../types';
import { formatFCFA, monthLabel, SCHOOL_MONTHS } from '../types';

interface Props {
  teachers: Teacher[];
  salaryPayments: SalaryPayment[];
  onAdd: (t: Omit<Teacher, 'id'>) => void;
  onUpdate: (id: string, updates: { firstName: string; lastName: string; phone: string; subject: string; monthlySalary: number }) => void;
  onDelete: (id: string) => void;
  onPaySalary: (teacherId: string, month: string, amount: number) => void;
  onUnpaySalary: (paymentId: string) => void;
}

export function TeachersView({ teachers, salaryPayments, onAdd, onUpdate, onDelete, onPaySalary, onUnpaySalary }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', subject: '', monthlySalary: '' });
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const totalMonthly = teachers.reduce((s, t) => s + t.monthlySalary, 0);
  const totalPaidThisMonth = useMemo(() => {
    return salaryPayments
      .filter(p => p.month === selectedMonth)
      .reduce((s, p) => s + p.amount, 0);
  }, [salaryPayments, selectedMonth]);

  const teacherPaymentForMonth = (teacherId: string): SalaryPayment | undefined => {
    return salaryPayments.find(p => p.teacherId === teacherId && p.month === selectedMonth);
  };

  const handleSubmit = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    const data = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      subject: form.subject.trim(),
      monthlySalary: Number(form.monthlySalary) || 0,
    };
    if (editId) {
      onUpdate(editId, data);
    } else {
      onAdd(data);
    }
    setForm({ firstName: '', lastName: '', phone: '', subject: '', monthlySalary: '' });
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (t: Teacher) => {
    setEditId(t.id);
    setForm({ firstName: t.firstName, lastName: t.lastName, phone: t.phone, subject: t.subject, monthlySalary: String(t.monthlySalary) });
    setShowForm(true);
  };

  const cancelForm = () => {
    setForm({ firstName: '', lastName: '', phone: '', subject: '', monthlySalary: '' });
    setEditId(null);
    setShowForm(false);
  };

  const inputCls = 'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-royal-400 focus:ring-4';

  return (
    <div>
      <div className="mb-5">
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-royal-700">
          <Users className="h-3 w-3" /> Personnel
        </div>
        <h1 className="font-display text-2xl font-700 tracking-tight text-ink sm:text-3xl">Enseignants & Salaires</h1>
        <p className="mt-1 text-sm text-slate-500">Gérez vos enseignants et le suivi des paiements de salaires par mois.</p>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard icon={Users} label="Enseignants" value={String(teachers.length)} accent="royal" />
        <SummaryCard icon={Wallet} label="Masse salariale / mois" value={formatFCFA(totalMonthly)} accent="gold" />
        <SummaryCard icon={TrendingUp} label={`Payé en ${monthLabel(selectedMonth)}`} value={formatFCFA(totalPaidThisMonth)} accent="emerald" />
      </div>

      {/* Month selector */}
      <div className="mb-5 flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
        {SCHOOL_MONTHS.map(m => {
          const yyyymm = `${getSchoolYear(m)}-${m}`;
          const isActive = yyyymm === selectedMonth;
          const paidCount = salaryPayments.filter(p => p.month === yyyymm).length;
          return (
            <button
              key={m}
              onClick={() => setSelectedMonth(yyyymm)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-700 transition ${isActive ? 'bg-royal-700 text-white shadow-card' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {monthLabel(yyyymm).split(' ')[0]}
              {paidCount > 0 && <span className={`ml-1.5 text-[10px] ${isActive ? 'text-royal-200' : 'text-emerald-600'}`}>{paidCount} payé{paidCount > 1 ? 's' : ''}</span>}
            </button>
          );
        })}
      </div>

      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => { setEditId(null); setForm({ firstName: '', lastName: '', phone: '', subject: '', monthlySalary: '' }); setShowForm(true); }}
          className="mb-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 px-4 py-2.5 text-sm font-700 text-white shadow-gold transition hover:brightness-105 active:scale-95"
        >
          <Plus className="h-4.5 w-4.5" /> Ajouter un enseignant
        </button>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div className="mb-6 rounded-2.5xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-700 text-ink">{editId ? 'Modifier l\'enseignant' : 'Nouvel enseignant'}</h2>
            <button onClick={cancelForm} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100"><X className="h-4.5 w-4.5" /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-600 text-slate-500">Prénom</label>
              <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="Awa" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-600 text-slate-500">Nom</label>
              <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Diallo" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-600 text-slate-500">Téléphone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+223 77 123 45 67" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-600 text-slate-500">Matière principale</label>
              <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Mathématiques" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-600 text-slate-500">Salaire mensuel (FCFA)</label>
              <input type="number" value={form.monthlySalary} onChange={e => setForm({ ...form, monthlySalary: e.target.value })} placeholder="75000" className={inputCls} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleSubmit} disabled={!form.firstName.trim() || !form.lastName.trim()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-royal-700 to-royal-900 px-5 py-2.5 text-sm font-700 text-white shadow-cardLg transition hover:brightness-110 active:scale-95 disabled:opacity-40">
              <Check className="h-4.5 w-4.5" /> {editId ? 'Enregistrer' : 'Ajouter'}
            </button>
            <button onClick={cancelForm} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-600 text-slate-600 transition hover:bg-slate-50">Annuler</button>
          </div>
        </div>
      )}

      {/* Teacher list */}
      {teachers.length === 0 ? (
        <div className="rounded-2.5xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-card">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-slate-400 mx-auto"><Users className="h-8 w-8" /></span>
          <h3 className="mt-4 font-display text-lg font-700 text-ink">Aucun enseignant enregistré</h3>
          <p className="mt-1 text-sm text-slate-400">Ajoutez votre premier enseignant pour commencer le suivi des salaires.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {teachers.map(t => {
            const payment = teacherPaymentForMonth(t.id);
            const isPaid = !!payment;
            return (
              <div key={t.id} className="animate-floatUp rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-royal-100 to-royal-200 text-sm font-700 text-royal-700">
                      {t.firstName[0] ?? ''}{t.lastName[0] ?? ''}
                    </div>
                    <div className="leading-tight">
                      <div className="font-700 text-ink">{t.firstName} {t.lastName}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                        {t.subject && <span className="inline-flex items-center gap-1"><BookOpen className="h-3 w-3" />{t.subject}</span>}
                        {t.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{t.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(t)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-royal-300 hover:bg-royal-50 hover:text-royal-700 active:scale-95"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => onDelete(t.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 active:scale-95"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-[11px] font-600 uppercase tracking-wide text-slate-500">Salaire mensuel</span>
                  <span className="font-display text-sm font-700 text-ink">{formatFCFA(t.monthlySalary)}</span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-700 text-emerald-700">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} /> Payé en {monthLabel(selectedMonth).split(' ')[0]}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-gold-50 px-3 py-1.5 text-xs font-700 text-gold-600">
                        <Clock className="h-3.5 w-3.5" /> Non payé en {monthLabel(selectedMonth).split(' ')[0]}
                      </span>
                    )}
                  </div>
                  {isPaid ? (
                    <button
                      onClick={() => payment && onUnpaySalary(payment.id)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-600 text-slate-500 transition hover:bg-slate-50 active:scale-95"
                    >
                      Annuler le paiement
                    </button>
                  ) : (
                    <button
                      onClick={() => onPaySalary(t.id, selectedMonth, t.monthlySalary)}
                      disabled={t.monthlySalary <= 0}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 px-3.5 py-1.5 text-xs font-700 text-white shadow-sm transition hover:brightness-110 active:scale-95 disabled:opacity-40"
                    >
                      <Wallet className="h-3.5 w-3.5" /> Marquer payé
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment history */}
      {salaryPayments.length > 0 && (
        <div className="mt-8 rounded-2.5xl border border-slate-200 bg-white shadow-card">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-display text-base font-700 text-ink">Historique des paiements de salaires</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {salaryPayments.slice(0, 20).map(p => {
              const teacher = teachers.find(t => t.id === p.teacherId);
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-600 text-ink">{teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Enseignant supprimé'}</p>
                    <p className="text-[11px] text-slate-400">{monthLabel(p.month)} · {new Date(p.paidAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-700 text-ink">{formatFCFA(p.amount)}</span>
                    <button
                      onClick={() => onUnpaySalary(p.id)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, accent }: { icon: typeof Users; label: string; value: string; accent: 'royal' | 'gold' | 'emerald' }) {
  const styles: Record<string, string> = {
    royal: 'bg-royal-50 text-royal-700',
    gold: 'bg-gold-50 text-gold-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${styles[accent]}`}><Icon className="h-4.5 w-4.5" /></span>
        <div className="min-w-0">
          <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400 truncate">{label}</div>
          <div className="font-display text-lg font-800 text-ink truncate">{value}</div>
        </div>
      </div>
    </div>
  );
}

function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  // School year: Oct-Jun. If current month is Jul-Sep, default to October of that year.
  if (['07', '08', '09'].includes(m)) {
    return `${y}-10`;
  }
  return `${y}-${m}`;
}

function getSchoolYear(month: string): number {
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  // If we're in Jan-Jun and the month is Oct-Dec, the school year started the previous year.
  if (['01', '02', '03', '04', '05', '06'].includes(currentMonth) && ['10', '11', '12'].includes(month)) {
    return now.getFullYear() - 1;
  }
  return now.getFullYear();
}
