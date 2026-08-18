import { useMemo, useState } from 'react';
import {
  GraduationCap, Users, CheckCircle2, AlertCircle, ChevronRight,
  ChevronLeft, Layers, MessageCircle,
} from 'lucide-react';
import type { Student, FeeTypeDef, TrancheDef } from '../types';
import {
  formatFCFA, studentOutstanding, studentCollected, studentExpected,
  cellStatus,
} from '../types';
import { StatusBadge } from './StatusBadge';

interface Props {
  students: Student[];
  feeTypes: FeeTypeDef[];
  tranches: TrancheDef[];
  onCellClick: (id: string, feeType: string, trancheKey: number | 'single') => void;
  onWhatsApp: (s: Student, feeType: string) => void;
}

interface ClassStat {
  className: string;
  total: number;
  paid: number;
  unpaid: number;
  outstanding: number;
  collected: number;
  expected: number;
}

export function ClassView({ students, feeTypes, tranches, onCellClick, onWhatsApp }: Props) {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [activeFeeType, setActiveFeeType] = useState<string>('scolarite');

  const classStats = useMemo<ClassStat[]>(() => {
    const map = new Map<string, Student[]>();
    for (const s of students) {
      const arr = map.get(s.className) ?? [];
      arr.push(s);
      map.set(s.className, arr);
    }
    return Array.from(map.entries()).map(([className, sts]) => {
      let paid = 0;
      let outstanding = 0;
      let collected = 0;
      let expected = 0;
      for (const s of sts) {
        const out = studentOutstanding(s);
        if (out <= 0) paid++;
        else outstanding += out;
        collected += studentCollected(s);
        expected += studentExpected(s);
      }
      return {
        className,
        total: sts.length,
        paid,
        unpaid: sts.length - paid,
        outstanding,
        collected,
        expected,
      };
    }).sort((a, b) => a.className.localeCompare(b.className));
  }, [students]);

  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(s => s.className === selectedClass);
  }, [students, selectedClass]);

  if (selectedClass) {
    return (
      <ClassDetail
        className={selectedClass}
        students={classStudents}
        feeTypes={feeTypes}
        tranches={tranches}
        activeFeeType={activeFeeType}
        onFeeTypeChange={setActiveFeeType}
        onCellClick={onCellClick}
        onWhatsApp={onWhatsApp}
        onBack={() => setSelectedClass(null)}
      />
    );
  }

  const totalStudents = classStats.reduce((s, c) => s + c.total, 0);
  const totalPaid = classStats.reduce((s, c) => s + c.paid, 0);
  const totalUnpaid = classStats.reduce((s, c) => s + c.unpaid, 0);
  const totalOutstanding = classStats.reduce((s, c) => s + c.outstanding, 0);

  return (
    <div className="animate-fadeIn">
      <div className="mb-5">
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-royal-700">
          <Layers className="h-3 w-3" /> Scolarité
        </div>
        <h1 className="font-display text-2xl font-700 tracking-tight text-ink sm:text-3xl">Vue par classe</h1>
        <p className="mt-1 text-sm text-slate-500">Effectifs et impayés par classe. Cliquez sur une classe pour voir le détail.</p>
      </div>

      {/* General summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryMini icon={Users} label="Total élèves" value={String(totalStudents)} accent="royal" />
        <SummaryMini icon={CheckCircle2} label="À jour" value={String(totalPaid)} accent="emerald" />
        <SummaryMini icon={AlertCircle} label="Avec impayé" value={String(totalUnpaid)} accent="gold" />
        <SummaryMini icon={AlertCircle} label="Total impayé" value={formatFCFA(totalOutstanding)} accent="red" />
      </div>

      {/* Class cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classStats.length === 0 && (
          <div className="col-span-full rounded-2.5xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-card">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-royal-50 text-royal-400 mx-auto">
              <GraduationCap className="h-8 w-8" />
            </span>
            <h3 className="mt-4 font-display text-lg font-700 text-ink">Aucune classe</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">Aucun élève n'a été inscrit pour le moment.</p>
          </div>
        )}
        {classStats.map((cs) => (
          <button
            key={cs.className}
            onClick={() => setSelectedClass(cs.className)}
            className="group rounded-2.5xl border border-slate-200 bg-white p-5 text-left shadow-card transition hover:shadow-cardLg active:scale-95"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-royal-700 to-royal-900 text-white shadow-card">
                  <GraduationCap className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-display text-base font-800 text-ink">{cs.className}</h3>
                  <p className="text-[11px] font-600 text-slate-400">{cs.total} élève{cs.total !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-royal-700" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-emerald-50 px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-700 uppercase tracking-wider text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> À jour
                </div>
                <div className="font-display text-xl font-800 text-emerald-600">{cs.paid}</div>
              </div>
              <div className={`rounded-xl px-3 py-2.5 ${cs.unpaid > 0 ? 'bg-gold-50' : 'bg-slate-50'}`}>
                <div className={`flex items-center gap-1.5 text-[10px] font-700 uppercase tracking-wider ${cs.unpaid > 0 ? 'text-gold-700' : 'text-slate-400'}`}>
                  <AlertCircle className="h-3 w-3" /> Impayé
                </div>
                <div className={`font-display text-xl font-800 ${cs.unpaid > 0 ? 'text-gold-600' : 'text-slate-400'}`}>{cs.unpaid}</div>
              </div>
            </div>

            {cs.outstanding > 0 && (
              <div className="mt-2.5 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-[11px] font-600 text-slate-500">Reste à recouvrer</span>
                <span className="font-display text-sm font-800 text-gold-600">{formatFCFA(cs.outstanding)}</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Class detail view ---------- */

function ClassDetail({
  className, students, feeTypes, tranches, activeFeeType, onFeeTypeChange,
  onCellClick, onWhatsApp, onBack,
}: {
  className: string;
  students: Student[];
  feeTypes: FeeTypeDef[];
  tranches: TrancheDef[];
  activeFeeType: string;
  onFeeTypeChange: (ft: string) => void;
  onCellClick: (id: string, feeType: string, trancheKey: number | 'single') => void;
  onWhatsApp: (s: Student, feeType: string) => void;
  onBack: () => void;
}) {
  const ft = feeTypes.find(f => f.feeType === activeFeeType) ?? feeTypes[0];

  const totals = useMemo(() => {
    let collected = 0, expected = 0, outstanding = 0, paid = 0;
    for (const s of students) {
      collected += studentCollected(s);
      expected += studentExpected(s);
      outstanding += studentOutstanding(s);
      if (studentOutstanding(s) <= 0) paid++;
    }
    return { collected, expected, outstanding, paid, count: students.length };
  }, [students]);

  return (
    <div className="animate-fadeIn">
      {/* Back button + title */}
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-700 text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95"
      >
        <ChevronLeft className="h-4 w-4" /> Retour aux classes
      </button>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-royal-700">
            <GraduationCap className="h-3 w-3" /> {className}
          </div>
          <h1 className="font-display text-2xl font-700 tracking-tight text-ink sm:text-3xl">{className}</h1>
          <p className="mt-1 text-sm text-slate-500">{totals.count} élève{totals.count !== 1 ? 's' : ''} · {totals.paid} à jour · {formatFCFA(totals.outstanding)} d'impayé</p>
        </div>
      </div>

      {/* Fee type selector */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {feeTypes.map(f => {
          const isActive = f.feeType === activeFeeType;
          return (
            <button
              key={f.feeType}
              onClick={() => onFeeTypeChange(f.feeType)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-700 transition ${
                isActive ? 'bg-royal-50 text-royal-700 ring-2 ring-current/20' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {students.length === 0 ? (
        <div className="rounded-2.5xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-card">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-slate-400 mx-auto">
            <Users className="h-8 w-8" />
          </span>
          <h3 className="mt-4 font-display text-lg font-700 text-ink">Aucun élève dans cette classe</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map(s => {
            const fee = s.fees.find(f => f.feeType === activeFeeType);
            const out = studentOutstanding(s);
            const ini = `${s.firstName[0] ?? ''}${s.lastName[0] ?? ''}`;
            const expectedPerTranche = fee && ft?.paymentMode === 'tranche' ? fee.totalExpected / (tranches.length || 1) : (fee?.totalExpected ?? 0);
            return (
              <div key={s.id} className="animate-floatUp rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-royal-100 to-royal-200 text-sm font-700 text-royal-700">{ini}</div>
                    <div className="leading-tight">
                      <div className="font-600 text-ink">{s.firstName} {s.lastName}</div>
                      <div className="text-[11px] text-slate-400">{s.parentName}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => onWhatsApp(s, activeFeeType)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-sm transition active:scale-95"
                    style={{ background: '#25D366' }}
                  >
                    <MessageCircle className="h-4.5 w-4.5" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-[11px] font-600 uppercase tracking-wide text-slate-500">Solde dû (total)</span>
                  <span className={`font-display text-sm font-700 ${out > 0 ? 'text-gold-600' : 'text-emerald-600'}`}>
                    {out > 0 ? formatFCFA(out) : 'Soldé'}
                  </span>
                </div>
                {fee ? (
                  <div className="mt-3 space-y-2.5">
                    {ft?.paymentMode === 'tranche' ? (
                      <div>
                        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-700 uppercase tracking-wider text-royal-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-royal-700" />
                          {ft.label}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {tranches.map(t => {
                            const p = fee.payments[t.index] ?? { paid: 0 };
                            return (
                              <button
                                key={t.index}
                                onClick={() => onCellClick(s.id, activeFeeType, t.index)}
                                className="flex flex-col items-center gap-1 rounded-lg border border-slate-100 bg-white px-2.5 py-2 transition active:scale-95 hover:bg-royal-50"
                              >
                                <span className="text-[10px] font-600 text-slate-500">{t.label}</span>
                                <StatusBadge status={cellStatus(p.paid, expectedPerTranche)} paid={p.paid} monthlyFee={expectedPerTranche} size="sm" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white p-3">
                        <span className="text-sm font-600 text-slate-600">Paiement</span>
                        <button onClick={() => onCellClick(s.id, activeFeeType, 'single')}>
                          <StatusBadge
                            status={cellStatus(fee.payments['single']?.paid ?? 0, fee.totalExpected)}
                            paid={fee.payments['single']?.paid ?? 0}
                            monthlyFee={fee.totalExpected}
                            size="sm"
                          />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-center text-xs text-slate-400">Non inscrit à {ft?.label}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Small summary card ---------- */

function SummaryMini({
  icon: Icon, label, value, accent,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  accent: 'royal' | 'emerald' | 'gold' | 'red';
}) {
  const styles: Record<string, string> = {
    royal: 'bg-royal-50 text-royal-700',
    emerald: 'bg-emerald-50 text-emerald-600',
    gold: 'bg-gold-50 text-gold-600',
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
          <div className="font-display text-lg font-800 text-ink truncate">{value}</div>
        </div>
      </div>
    </div>
  );
}
