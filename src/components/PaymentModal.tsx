import { useEffect, useState } from 'react';
import { X, Wallet, Check, Coins, TrendingUp, ChevronDown } from 'lucide-react';
import type { Student, FeeSubscription, TrancheDef, FeeTypeDef } from '../types';
import { formatFCFA, formatFCFAShort, cellStatus, studentOutstanding } from '../types';
import { StatusBadge } from './StatusBadge';

interface Props {
  student: Student | null;
  feeType: string | null;
  trancheKey: number | 'single' | null;
  open: boolean;
  onClose: () => void;
  onValidate: (id: string, feeType: string, trancheKey: number | 'single', amt: number) => void;
  feeTypes: FeeTypeDef[];
  tranches: TrancheDef[];
}

export function PaymentModal({ student, feeType, trancheKey, open, onClose, onValidate, feeTypes, tranches }: Props) {
  const [amount, setAmount] = useState('');
  const [selFeeType, setSelFeeType] = useState<string>('');
  const [selTrancheKey, setSelTrancheKey] = useState<number | 'single'>('single');

  useEffect(() => {
    if (open) {
      setAmount('');
      if (feeType) setSelFeeType(feeType);
      if (trancheKey !== null) setSelTrancheKey(trancheKey);
    }
  }, [open, student?.id, feeType, trancheKey]);

  if (!student) return null;

  const ft = feeTypes.find(f => f.feeType === selFeeType) ?? feeTypes[0];
  if (!ft) return null;

  const fee: FeeSubscription | undefined = student.fees.find(f => f.feeType === selFeeType);
  const isTrancheMode = ft.paymentMode === 'tranche';

  // Get expected amount for this tranche/single payment
  const expectedAmount = fee ? (isTrancheMode
    ? (fee.totalExpected / Object.keys(fee.payments).length)
    : fee.totalExpected) : 0;

  const paid = fee ? (fee.payments[selTrancheKey]?.paid ?? 0) : 0;
  const remaining = Math.max(0, expectedAmount - paid);
  const status = cellStatus(paid, expectedAmount);
  const v = parseInt(amount, 10) || 0;
  const liveRem = Math.max(0, remaining - v);
  const wouldComplete = v > 0 && liveRem <= 0;
  const outstanding = studentOutstanding(student);
  const quick = [Math.round(remaining), Math.round(expectedAmount)].filter((q, i, a) => q > 0 && a.indexOf(q) === i);

  const handleValidate = () => {
    if (v <= 0) return;
    onValidate(student.id, selFeeType, selTrancheKey, v);
    onClose();
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity .22s ease' }}>
      <div className="modal-backdrop is-open" onClick={onClose} style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity .22s ease' }} />
      <div className={`modal-panel relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2.5xl bg-white shadow-2xl transition ${open ? 'animate-scaleIn' : 'opacity-0'}`}>
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-royal-700 to-royal-900 px-5 py-4 text-white">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,rgba(255,255,255,.18) 1px,transparent 0)', backgroundSize: '18px 18px' }} />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><Wallet className="h-5 w-5 text-gold-300" /></span>
              <div>
                <h2 className="font-display text-base font-700 leading-tight">Paiement — {ft.label}</h2>
                <p className="text-xs text-royal-100">{student.firstName} {student.lastName} · {student.className}</p>
              </div>
            </div>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 transition hover:bg-white/20 active:scale-95"><X className="h-4.5 w-4.5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {/* Fee type + tranche selectors */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-700 uppercase tracking-wide text-slate-500">Type de frais</label>
              <div className="relative">
                <select value={selFeeType} onChange={e => setSelFeeType(e.target.value)} className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm font-600 text-ink outline-none transition focus:border-royal-400 focus:ring-4">
                  {feeTypes.map(f => <option key={f.feeType} value={f.feeType}>{f.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            {isTrancheMode && (
              <div>
                <label className="mb-1 block text-[11px] font-700 uppercase tracking-wide text-slate-500">Tranche</label>
                <div className="relative">
                  <select value={selTrancheKey === 'single' ? 1 : selTrancheKey} onChange={e => setSelTrancheKey(parseInt(e.target.value, 10))} className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm font-600 text-ink outline-none transition focus:border-royal-400 focus:ring-4">
                    {tranches.map(t => <option key={t.index} value={t.index}>{t.label}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-slate-500"><Check className="h-4 w-4" />Statut actuel</div>
            <div className="flex items-center gap-2">
              <StatusBadge status={status} paid={paid} monthlyFee={expectedAmount} size="sm" />
              <span className="text-xs font-600 text-slate-600">{status === 'paid' ? 'Soldé' : status === 'partial' ? 'Partiel' : 'Non payé'}</span>
            </div>
          </div>

          {/* Expected amount */}
          <div className="mb-3 rounded-xl px-4 py-3" style={{ background: 'var(--royal-50)' }}>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-600 text-royal-700"><Coins className="h-4 w-4" />{isTrancheMode ? 'Montant de cette tranche' : 'Montant dû'}</span>
              <span className="font-display text-lg font-800 text-royal-700">{formatFCFA(expectedAmount)}</span>
            </div>
          </div>

          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-xs font-600 text-slate-500">Déjà payé</span>
            <span className="font-display text-sm font-700 text-teal-600">{formatFCFA(paid)}</span>
          </div>

          {/* Amount input */}
          <h3 className="mb-2 mt-5 text-xs font-700 uppercase tracking-wider text-slate-500">Montant payé ce jour (FCFA)</h3>
          <div className="flex items-stretch gap-2">
            <input type="number" min={0} step={500} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" autoFocus className="h-12 flex-1 rounded-xl border-2 border-slate-200 bg-white px-4 text-right text-lg font-700 text-ink outline-none transition focus:border-royal-400 focus:ring-4" />
            <span className="flex items-center rounded-xl bg-slate-100 px-3 text-sm font-700 text-slate-600">FCFA</span>
          </div>

          {quick.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {quick.map((q, i) => (
                <button key={i} onClick={() => setAmount(String(q))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-600 text-slate-600 transition hover:border-royal-300 hover:bg-royal-50 active:scale-95">
                  {q === Math.round(remaining) && remaining !== expectedAmount ? 'Solder' : isTrancheMode ? 'Tranche' : 'Total'} · {formatFCFAShort(q)}
                </button>
              ))}
            </div>
          )}

          {/* Remaining */}
          <div className="mt-4 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-700 text-gold-700">{isTrancheMode ? 'Reste à payer pour cette tranche' : 'Reste à payer'}</span>
              <span className={`font-display text-lg font-800 ${wouldComplete ? 'text-emerald-600' : 'text-gold-600'}`}>{wouldComplete ? '0 FCFA' : formatFCFA(liveRem)}</span>
            </div>
            {v > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-600">
                {wouldComplete
                  ? <span className="flex items-center gap-1 text-emerald-600"><Check className="h-3.5 w-3.5" strokeWidth={3} />{isTrancheMode ? 'Cette tranche sera soldée' : 'Ce frais sera soldé'}</span>
                  : <span className="flex items-center gap-1 text-gold-700"><TrendingUp className="h-3.5 w-3.5" />Après ce paiement: {formatFCFA(liveRem)}</span>}
              </div>
            )}
          </div>

          {/* Student outstanding */}
          <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-xs">
            <span className="font-600 text-slate-500">Solde global de l'élève</span>
            <span className={`font-display font-700 ${outstanding > 0 ? 'text-gold-600' : 'text-emerald-600'}`}>{formatFCFA(outstanding)}</span>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3">
          <div className="flex gap-2">
            <button onClick={onClose} className="flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-600 text-slate-600 transition hover:bg-slate-50 active:scale-95">Annuler</button>
            <button onClick={handleValidate} disabled={v <= 0} className="flex h-11 flex-[1.6] items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-royal-700 to-royal-900 text-sm font-700 text-white shadow-cardLg transition hover:brightness-110 active:scale-95 disabled:opacity-40"><Check className="h-4 w-4" strokeWidth={3} />Valider le paiement</button>
          </div>
        </div>
      </div>
    </div>
  );
}
