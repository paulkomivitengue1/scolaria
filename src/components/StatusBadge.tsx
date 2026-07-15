import { Check } from 'lucide-react';
import type { PaymentStatus } from '../types';
import { formatFCFAShort } from '../types';
interface BadgeProps { status: PaymentStatus; paid?: number; monthlyFee?: number; size?: 'sm'|'md'; className?: string; }
export function StatusBadge({ status, paid = 0, monthlyFee = 0, size = 'md', className = '' }: BadgeProps) {
  const sm = size === 'sm';
  if (status === 'paid') return <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 font-700 text-white shadow-sm ${sm?'px-2 py-0.5 text-[10px]':'px-2.5 py-1 text-[11px]'} ${className}`} title="Payé"><Check className={sm?'h-3 w-3':'h-3.5 w-3.5'} strokeWidth={3}/>{formatFCFAShort(paid)}</span>;
  if (status === 'partial') { const r = Math.max(0, Math.round(monthlyFee - paid)); return <span className={`inline-flex items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-500 font-700 text-white shadow-sm ${sm?'px-2 py-0.5 text-[10px]':'px-2.5 py-1 text-[11px]'} ${className}`} title="Partiel">Reste: {formatFCFAShort(r)}</span>; }
  return <span className={`inline-grid place-items-center rounded-full border-2 border-dashed border-slate-200 bg-slate-50 text-slate-300 ${sm?'h-6 w-6':'h-7 w-7'} ${className}`} title="Non payé"><span className={`block rounded-full bg-slate-300 ${sm?'h-1.5 w-1.5':'h-2 w-2'}`}/></span>;
}
