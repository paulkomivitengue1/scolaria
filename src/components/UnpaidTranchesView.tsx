import { useMemo, useState } from 'react';
import {
  AlertCircle, ChevronDown, Users, Wallet, TrendingDown, Filter,
} from 'lucide-react';
import type {
  Student, SchoolFeeConfig,
} from '../types';
import {
  formatFCFA, formatFCFAShort, getFeeAmount, CLASS_LIST,
} from '../types';

interface Props {
  students: Student[];
  feeConfig: SchoolFeeConfig;
}

interface UnpaidRow {
  student: Student;
  expected: number;
  paid: number;
  remaining: number;
}

export function UnpaidTranchesView({ students, feeConfig }: Props) {
  const tranches = feeConfig.tranches;
  const [selectedTranche, setSelectedTranche] = useState<number>(tranches[0]?.index ?? 1);
  const [classFilter, setClassFilter] = useState<string>('all');

  const rows = useMemo<UnpaidRow[]>(() => {
    const result: UnpaidRow[] = [];
    for (const s of students) {
      if (classFilter !== 'all' && s.className !== classFilter) continue;
      let expected = 0;
      let paid = 0;
      for (const fee of s.fees) {
        if (fee.paymentMode !== 'tranche') continue;
        const amt = getFeeAmount(feeConfig.feeConfig, fee.feeType, s.className, selectedTranche);
        if (amt <= 0) continue;
        expected += amt;
        paid += fee.payments[String(selectedTranche)]?.paid ?? 0;
      }
      const remaining = Math.max(0, expected - paid);
      if (remaining > 0) {
        result.push({ student: s, expected, paid, remaining });
      }
    }
    result.sort((a, b) => b.remaining - a.remaining);
    return result;
  }, [students, feeConfig.feeConfig, selectedTranche, classFilter]);

  const totalUnpaid = rows.reduce((s, r) => s + r.remaining, 0);
  const totalExpected = rows.reduce((s, r) => s + r.expected, 0);
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);

  const trancheLabel = tranches.find(t => t.index === selectedTranche)?.label ?? `Tranche ${selectedTranche}`;
  const availableClasses = useMemo(() => {
    const set = new Set(students.map(s => s.className));
    return CLASS_LIST.filter(c => set.has(c));
  }, [students]);

  return (
    <div className="animate-fadeIn">
      <div className="mb-5">
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-red-700">
          <AlertCircle className="h-3 w-3" /> Recouvrement
        </div>
        <h1 className="font-display text-2xl font-700 tracking-tight text-ink sm:text-3xl">Impayés par tranche</h1>
        <p className="mt-1 text-sm text-slate-500">Élèves n'ayant pas réglé la totalité d'une tranche. Trié du plus gros impayé au plus petit.</p>
      </div>

      {/* Selectors */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Tranche selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-700 uppercase tracking-wider text-slate-400">Tranche</label>
          <div className="relative">
            <select
              value={selectedTranche}
              onChange={e => setSelectedTranche(Number(e.target.value))}
              className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm font-700 text-ink shadow-sm outline-none transition focus:border-royal-400"
            >
              {tranches.map(t => (
                <option key={t.index} value={t.index}>{t.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Class filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-700 uppercase tracking-wider text-slate-400">Classe</label>
          <div className="relative">
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm font-700 text-ink shadow-sm outline-none transition focus:border-royal-400"
            >
              <option value="all">Toutes les classes</option>
              {availableClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryMini icon={Wallet} label="Attendu" value={formatFCFA(totalExpected)} accent="royal" />
        <SummaryMini icon={Users} label="Encaissé" value={formatFCFA(totalPaid)} accent="emerald" />
        <SummaryMini icon={TrendingDown} label="Impayé" value={formatFCFA(totalUnpaid)} accent="red" />
      </div>

      {/* Total unpaid banner */}
      <div className="mb-5 flex items-center justify-between rounded-2.5xl border border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 px-5 py-4 shadow-card">
        <div>
          <div className="text-[11px] font-700 uppercase tracking-wider text-red-700">Total impayé — {trancheLabel}</div>
          <div className="font-display text-2xl font-800 text-red-700 sm:text-3xl">{formatFCFA(totalUnpaid)}</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-700 uppercase tracking-wider text-red-600">{rows.length} élève{rows.length !== 1 ? 's' : ''}</div>
          <div className="text-sm font-600 text-red-500">à recouvrer</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2.5xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-card">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-500 mx-auto">
            <Users className="h-8 w-8" />
          </span>
          <h3 className="mt-4 font-display text-lg font-700 text-ink">Aucun impayé</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500 mx-auto">Tous les élèves ont réglé la {trancheLabel} en totalité{classFilter !== 'all' ? ` en ${classFilter}` : ''}.</p>
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="space-y-3 md:hidden">
            {rows.map(({ student: s, expected, paid, remaining }) => {
              const ini = `${s.firstName[0] ?? ''}${s.lastName[0] ?? ''}`;
              const pct = expected > 0 ? Math.round((paid / expected) * 100) : 0;
              return (
                <div key={s.id} className="animate-floatUp rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-royal-100 to-royal-200 text-sm font-700 text-royal-700">{ini}</div>
                      <div className="leading-tight">
                        <div className="font-700 text-ink">{s.firstName} {s.lastName}</div>
                        <div className="text-[11px] font-600 text-slate-400">{s.className}</div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[10px] font-700 uppercase tracking-wider text-red-600">Reste</div>
                      <div className="font-display text-lg font-800 text-red-600">{formatFCFAShort(remaining)}</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-gold-500' : 'bg-slate-200'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-royal-50 px-2.5 py-2 text-center">
                      <div className="text-[10px] font-700 uppercase tracking-wider text-royal-700">Attendu</div>
                      <div className="font-display text-sm font-800 text-royal-700">{formatFCFAShort(expected)}</div>
                    </div>
                    <div className="rounded-xl bg-emerald-50 px-2.5 py-2 text-center">
                      <div className="text-[10px] font-700 uppercase tracking-wider text-emerald-700">Payé</div>
                      <div className="font-display text-sm font-800 text-emerald-600">{formatFCFAShort(paid)}</div>
                    </div>
                    <div className="rounded-xl bg-red-50 px-2.5 py-2 text-center">
                      <div className="text-[10px] font-700 uppercase tracking-wider text-red-700">Reste</div>
                      <div className="font-display text-sm font-800 text-red-600">{formatFCFAShort(remaining)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card md:block">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <h2 className="font-display text-base font-700 text-ink">{trancheLabel}</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-600 text-slate-500">{rows.length} élève{rows.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] font-700 uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3">Élève</th>
                    <th className="px-3 py-3">Classe</th>
                    <th className="px-3 py-3 text-right">Attendu</th>
                    <th className="px-3 py-3 text-right">Payé</th>
                    <th className="px-3 py-3 text-right">Reste à payer</th>
                    <th className="px-5 py-3 text-right">Progression</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ student: s, expected, paid, remaining }) => {
                    const ini = `${s.firstName[0] ?? ''}${s.lastName[0] ?? ''}`;
                    const pct = expected > 0 ? Math.round((paid / expected) * 100) : 0;
                    return (
                      <tr key={s.id} className="border-b border-slate-100 transition hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-royal-100 to-royal-200 text-xs font-700 text-royal-700">{ini}</span>
                            <span className="font-700 text-ink">{s.firstName} {s.lastName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{s.className}</td>
                        <td className="px-3 py-3 text-right font-700 text-royal-700">{formatFCFAShort(expected)}</td>
                        <td className="px-3 py-3 text-right font-700 text-emerald-600">{formatFCFAShort(paid)}</td>
                        <td className="px-3 py-3 text-right font-800 text-red-600">{formatFCFAShort(remaining)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-gold-500' : 'bg-slate-200'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-xs font-700 text-slate-500">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td colSpan={4} className="px-5 py-3 text-right font-700 uppercase tracking-wider text-slate-500">Total impayé</td>
                    <td className="px-3 py-3 text-right font-display text-base font-800 text-red-600">{formatFCFA(totalUnpaid)}</td>
                    <td className="px-5 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryMini({
  icon: Icon, label, value, accent,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  accent: 'royal' | 'emerald' | 'red';
}) {
  const styles: Record<string, string> = {
    royal: 'bg-royal-50 text-royal-700',
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-card sm:p-4">
      <div className="flex items-center gap-2">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${styles[accent]}`}>
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-700 uppercase tracking-wider text-slate-400 truncate">{label}</div>
          <div className="font-display text-base font-800 text-ink truncate">{value}</div>
        </div>
      </div>
    </div>
  );
}
