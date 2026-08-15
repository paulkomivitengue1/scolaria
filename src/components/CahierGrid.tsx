import { MessageCircle, ChevronRight, Inbox, FileText, PartyPopper, Utensils, Bus, GraduationCap, Layers } from 'lucide-react';
import type { Student, FeeTypeDef, TrancheDef, FeeSubscription } from '../types';
import { formatFCFA, studentOutstanding, cellStatus, getFeeAccent, FEE_TYPE_ICONS } from '../types';
import { StatusBadge } from './StatusBadge';

interface GridProps {
  students: Student[];
  feeTypes: FeeTypeDef[];
  tranches: TrancheDef[];
  activeFeeType: string;
  onFeeTypeChange: (ft: string) => void;
  onCellClick: (id: string, feeType: string, trancheKey: number | 'single') => void;
  onWhatsApp: (s: Student, feeType: string) => void;
  onAddClick: () => void;
}

const FEE_ICONS: Record<string, typeof GraduationCap> = {
  GraduationCap, FileText, PartyPopper, Utensils, Bus, Layers,
};

export function CahierGrid({ students, feeTypes, tranches, activeFeeType, onFeeTypeChange, onCellClick, onWhatsApp, onAddClick }: GridProps) {
  const ft = feeTypes.find(f => f.feeType === activeFeeType) ?? feeTypes[0];

  return (
    <>
      {/* Fee type selector */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {feeTypes.map(f => {
          const iconName = FEE_TYPE_ICONS[f.feeType] ?? 'FileText';
          const Icon = FEE_ICONS[iconName] ?? FileText;
          const accent = getFeeAccent(f.feeType);
          const isActive = f.feeType === activeFeeType;
          return (
            <button key={f.feeType} onClick={() => onFeeTypeChange(f.feeType)} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-700 transition ${isActive ? `${accent.wrap} ${accent.text} ring-2 ring-current/20` : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              <Icon className="h-4 w-4" />
              {f.label}
            </button>
          );
        })}
      </div>

      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2.5xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-card">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-royal-50 text-royal-400"><Inbox className="h-8 w-8" /></span>
          <h3 className="mt-4 font-display text-lg font-700 text-ink">Aucun élève inscrit</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">Le cahier est vide. Ajoutez votre premier élève pour commencer le suivi des paiements.</p>
          <button onClick={onAddClick} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 px-4 py-2.5 text-sm font-700 text-white shadow-gold transition hover:brightness-105 active:scale-95"><GraduationCap className="h-4.5 w-4.5" />Ajouter un élève</button>
        </div>
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-2.5xl border border-slate-200 bg-white shadow-card lg:block">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th rowSpan={2} className="sticky left-0 z-10 bg-slate-50 px-5 py-3 text-left align-bottom text-xs font-700 uppercase tracking-wider text-slate-500">Élève</th>
                    <th rowSpan={2} className="px-3 py-3 text-left align-bottom text-xs font-700 uppercase tracking-wider text-slate-500">Classe</th>
                    {ft?.paymentMode === 'tranche' ? (
                      tranches.map(t => (
                        <th key={t.index} className="border-l border-slate-200 px-4 py-3 text-center text-xs font-700 uppercase tracking-wider text-royal-700">
                          <span className="inline-flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${getFeeAccent(activeFeeType).dot}`} />
            {t.label}
          </span>
        </th>
      ))
    ) : (
      <th className="border-l border-slate-200 px-4 py-3 text-center text-xs font-700 uppercase tracking-wider text-teal-700">Paiement unique</th>
    )}
                    <th rowSpan={2} className="px-4 py-3 text-right align-bottom text-xs font-700 uppercase tracking-wider text-slate-500">Solde dû</th>
                    <th rowSpan={2} className="px-3 py-3 align-bottom text-xs font-700 uppercase tracking-wider text-slate-500">Reçu</th>
                  </tr>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {ft?.paymentMode === 'tranche' && tranches.map(t => (
                      <th key={t.index} className="border-l border-slate-200 px-2 py-2 text-center text-[11px] font-600 text-slate-500">Paiement {t.index}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, idx) => {
                    const fee = s.fees.find(f => f.feeType === activeFeeType);
                    const out = studentOutstanding(s);
                    const ini = `${s.firstName[0] ?? ''}${s.lastName[0] ?? ''}`;
                    const expectedPerTranche = fee && ft?.paymentMode === 'tranche' ? fee.totalExpected / (tranches.length || 1) : (fee?.totalExpected ?? 0);
                    return (
                      <tr key={s.id} className="border-b border-slate-100 transition hover:bg-royal-50" style={{ background: idx % 2 ? 'var(--slate-50)' : '#fff' }}>
                        <td className="sticky left-0 z-10 px-5 py-3" style={{ background: 'inherit' }}>
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-royal-100 to-royal-200 text-xs font-700 text-royal-700">{ini}</div>
                            <div className="leading-tight">
                              <div className="font-600 text-ink">{s.firstName} {s.lastName}</div>
                              <div className="text-[11px] text-slate-400">{s.parentName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3"><span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-600 text-slate-600">{s.className}</span></td>
                        {fee ? cells(fee, ft, tranches, expectedPerTranche, s.id, onCellClick) : empties(ft, tranches)}
                        <td className="px-4 py-3 text-right"><span className={`font-display text-sm font-700 ${out > 0 ? 'text-gold-600' : 'text-emerald-600'}`}>{out > 0 ? formatFCFA(out) : 'Soldé'}</span></td>
                        <td className="px-3 py-3 text-center"><button onClick={() => onWhatsApp(s, activeFeeType)} className="inline-grid h-9 w-9 place-items-center rounded-xl text-white shadow-sm transition hover:scale-105 active:scale-95" style={{ background: '#25D366' }} aria-label="Reçu WhatsApp"><MessageCircle className="h-4.5 w-4.5" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: stacked cards */}
          <div className="space-y-3 lg:hidden">
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
                        <div className="text-[11px] text-slate-400">{s.className} · {s.parentName}</div>
                      </div>
                    </div>
                    <button onClick={() => onWhatsApp(s, activeFeeType)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-sm transition active:scale-95" style={{ background: '#25D366' }}><MessageCircle className="h-4.5 w-4.5" /></button>
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span className="text-[11px] font-600 uppercase tracking-wide text-slate-500">Solde dû (total)</span>
                    <span className={`font-display text-sm font-700 ${out > 0 ? 'text-gold-600' : 'text-emerald-600'}`}>{out > 0 ? formatFCFA(out) : 'Soldé'}</span>
                  </div>
                  {fee ? (
                    <div className="mt-3 space-y-2.5">
                      {ft?.paymentMode === 'tranche' ? (
                        <div>
                          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-700 uppercase tracking-wider">
                            <span className={`h-1.5 w-1.5 rounded-full ${getFeeAccent(activeFeeType).dot}`} />
                            <span className="text-royal-700">{ft.label}</span>
                            <ChevronRight className="h-3 w-3 text-slate-400" />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {tranches.map(t => {
                              const p = fee.payments[t.index] ?? { paid: 0 };
                              return (
                                <button key={t.index} onClick={() => onCellClick(s.id, activeFeeType, t.index)} className="flex flex-col items-center gap-1 rounded-lg border border-slate-100 bg-white px-2.5 py-2 transition active:scale-95 hover:bg-royal-50">
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
                          <button onClick={() => onCellClick(s.id, activeFeeType, 'single')} className="flex flex-col items-center gap-1">
                            <StatusBadge status={cellStatus(fee.payments['single']?.paid ?? 0, fee.totalExpected)} paid={fee.payments['single']?.paid ?? 0} monthlyFee={fee.totalExpected} size="sm" />
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
        </>
      )}
    </>
  );
}

function cells(
  fee: FeeSubscription,
  ft: FeeTypeDef | undefined,
  tranches: TrancheDef[],
  expectedPerTranche: number,
  id: string,
  click: (id: string, feeType: string, trancheKey: number | 'single') => void,
) {
  if (ft?.paymentMode === 'tranche') {
    return tranches.map((t, i) => {
      const p = fee.payments[t.index] ?? { paid: 0 };
      const st = cellStatus(p.paid, expectedPerTranche);
      return (
        <td key={t.index} className="border-l border-slate-100 px-2 py-3 text-center" style={i % 3 === 0 ? { borderLeftColor: 'var(--slate-200)' } : undefined}>
          <button onClick={() => click(id, fee.feeType, t.index)} className="grid place-items-center rounded-lg p-1 transition hover:scale-110 active:scale-95" title={`${t.label} — payé ${formatFCFA(p.paid)} / dû ${formatFCFA(expectedPerTranche)}`}>
            <StatusBadge status={st} paid={p.paid} monthlyFee={expectedPerTranche} />
          </button>
        </td>
      );
    });
  } else {
    const p = fee.payments['single'] ?? { paid: 0 };
    const st = cellStatus(p.paid, fee.totalExpected);
    return (
      <td className="border-l border-slate-100 px-2 py-3 text-center">
        <button onClick={() => click(id, fee.feeType, 'single')} className="grid place-items-center rounded-lg p-1 transition hover:scale-110 active:scale-95" title={`Payé ${formatFCFA(p.paid)} / dû ${formatFCFA(fee.totalExpected)}`}>
          <StatusBadge status={st} paid={p.paid} monthlyFee={fee.totalExpected} />
        </button>
      </td>
    );
  }
}

function empties(ft: FeeTypeDef | undefined, tranches: TrancheDef[]) {
  if (ft?.paymentMode === 'tranche') {
    return tranches.map(t => <td key={t.index} className="border-l border-slate-100 px-2 py-3 text-center"><span className="text-[11px] text-slate-300">—</span></td>);
  }
  return <td className="border-l border-slate-100 px-2 py-3 text-center"><span className="text-[11px] text-slate-300">—</span></td>;
}
