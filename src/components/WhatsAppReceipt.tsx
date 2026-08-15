import { useState } from 'react';
import { X, MessageCircle, Send, ChevronDown } from 'lucide-react';
import type { Student, FeeTypeDef, TrancheDef } from '../types';
import { formatFCFA } from '../types';
import { buildWhatsAppMessage, buildWhatsAppLink } from '../whatsapp';
import { StatusBadge } from './StatusBadge';

interface Props {
  student: Student | null;
  open: boolean;
  onClose: () => void;
  schoolName: string;
  initialFeeType?: string | null;
  feeTypes: FeeTypeDef[];
  tranches: TrancheDef[];
}

export function WhatsAppReceipt({ student, open, onClose, schoolName, initialFeeType, feeTypes, tranches }: Props) {
  const [selFeeType, setSelFeeType] = useState<string>('');

  if (open && student && initialFeeType && selFeeType !== initialFeeType) {
    setSelFeeType(initialFeeType);
  }

  if (!student) return null;

  const ft = feeTypes.find(f => f.feeType === selFeeType) ?? feeTypes[0];
  if (!ft) return null;

  const fee = student.fees.find(f => f.feeType === selFeeType);
  const totalPaid = fee ? Object.values(fee.payments).reduce((s, p) => s + p.paid, 0) : 0;
  const remaining = Math.max(0, (fee?.totalExpected ?? 0) - totalPaid);
  const status = fee ? (totalPaid >= (fee.totalExpected - 0.5) ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid') : 'unpaid';

  const ctx = { student, feeType: selFeeType, tranches, feeTypes, schoolName };
  const message = buildWhatsAppMessage(ctx);
  const link = buildWhatsAppLink(ctx);

  const send = () => { window.open(link, '_blank'); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity .22s ease' }}>
      <div className="modal-backdrop is-open" onClick={onClose} style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity .22s ease' }} />
      <div className={`modal-panel relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2.5xl bg-white shadow-2xl transition ${open ? 'animate-scaleIn' : 'opacity-0'}`}>
        <div className="relative shrink-0 overflow-hidden px-5 py-4 text-white" style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}>
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><MessageCircle className="h-5 w-5 text-white" /></span>
              <div>
                <h2 className="font-display text-base font-700 leading-tight">Message WhatsApp</h2>
                <p className="text-xs text-white/80">{student.parentName} · {student.parentPhone}</p>
              </div>
            </div>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 transition hover:bg-white/20 active:scale-95"><X className="h-4.5 w-4.5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="mb-4">
            <label className="mb-1 block text-[11px] font-700 uppercase tracking-wide text-slate-500">Type de frais</label>
            <div className="relative">
              <select value={selFeeType} onChange={e => setSelFeeType(e.target.value)} className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm font-600 text-ink outline-none transition focus:border-royal-400 focus:ring-4">
                {feeTypes.map(f => <option key={f.feeType} value={f.feeType}>{f.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-600 text-slate-500">Total dû: <strong className="text-ink">{formatFCFA(fee?.totalExpected ?? 0)}</strong></span>
              <span className="text-[11px] font-600 text-slate-500">Payé: <strong className="text-teal-600">{formatFCFA(Math.round(totalPaid))}</strong></span>
              <span className="text-[11px] font-600 text-slate-500">Reste: <strong className={remaining > 0 ? 'text-gold-600' : 'text-emerald-600'}>{formatFCFA(Math.round(remaining))}</strong></span>
            </div>
            <StatusBadge status={status as 'paid' | 'partial' | 'unpaid'} paid={totalPaid} monthlyFee={fee?.totalExpected ?? 0} size="sm" />
          </div>

          <h3 className="mb-2 text-xs font-700 uppercase tracking-wider text-slate-500">Aperçu du message</h3>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{message}</div>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3">
          <button onClick={send} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-700 text-white shadow-sm transition hover:brightness-105 active:scale-95" style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}>
            <Send className="h-4 w-4" /> Envoyer sur WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
