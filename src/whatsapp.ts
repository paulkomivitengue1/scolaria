import type { Student, TrancheDef, FeeTypeDef } from './types';
import { formatFCFA } from './types';

export interface WhatsAppContext {
  student: Student;
  feeType: string;
  tranches: TrancheDef[];
  feeTypes: FeeTypeDef[];
  schoolName: string;
}

export function buildWhatsAppMessage(ctx: WhatsAppContext): string {
  const { student, feeType, tranches, feeTypes, schoolName } = ctx;
  const fee = student.fees.find(f => f.feeType === feeType);
  const ft = feeTypes.find(f => f.feeType === feeType);
  const label = ft?.label ?? feeType;

  const studentName = `${student.firstName} ${student.lastName}`;
  const className = student.className;
  const parentName = student.parentName || 'Cher parent';
  const school = schoolName?.trim() || DEFAULT_SCHOOL;

  const lines: string[] = [
    `Bonjour ${parentName},`,
    `Ici la direction de l'école ${school}.`,
    `Nous vous contactons concernant le suivi des frais de ${label} pour votre enfant ${studentName} (${className}).`,
  ];

  if (!fee) {
    lines.push(`Votre enfant n'est pas inscrit à ce service.`);
    lines.push('Cordialement,');
    lines.push('La Direction.');
    return lines.join('\n');
  }

  if (ft?.paymentMode === 'tranche') {
    const trancheCount = tranches.length || 1;
    const perTranche = fee.totalExpected / trancheCount;
    lines.push(`- Total ${label}: ${formatFCFA(fee.totalExpected)} (${trancheCount} tranches)`);
    lines.push(`- Montant par tranche: ${formatFCFA(Math.round(perTranche))}`);

    for (const t of tranches) {
      const paid = fee.payments[t.index]?.paid ?? 0;
      const remaining = Math.max(0, Math.round(perTranche - paid));
      const status = paid >= perTranche - 0.5 ? 'Soldée' : paid > 0 ? `Partiel (reste ${formatFCFA(remaining)})` : `Non payée (${formatFCFA(remaining)})`;
      lines.push(`- ${t.label}: ${status}`);
    }
  } else {
    const paid = fee.payments['single']?.paid ?? 0;
    const remaining = Math.max(0, Math.round(fee.totalExpected - paid));
    lines.push(`- Montant dû: ${formatFCFA(fee.totalExpected)}`);
    lines.push(`- Montant payé: ${formatFCFA(Math.round(paid))}`);
    lines.push(`- Reste à payer: ${formatFCFA(remaining)}`);
  }

  const totalPaid = Object.values(fee.payments).reduce((s, p) => s + p.paid, 0);
  const totalRemaining = Math.max(0, fee.totalExpected - totalPaid);

  if (totalRemaining > 0) {
    lines.push(`Nous vous prions de bien vouloir régulariser le solde restant de ${formatFCFA(totalRemaining)} dès que possible. Merci pour votre collaboration.`);
  } else {
    lines.push(`Nous vous remercions pour votre paiement complet. Excellente journée à vous !`);
  }

  lines.push('Cordialement,');
  lines.push('La Direction.');

  return lines.join('\n');
}

export function sanitizePhone(raw: string): string {
  let digits = raw.replace(/[^\d]/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  return digits;
}

export function buildWhatsAppLink(ctx: WhatsAppContext): string {
  const message = buildWhatsAppMessage(ctx);
  const phone = sanitizePhone(ctx.student.parentPhone);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encoded}`;
}

const DEFAULT_SCHOOL = 'Notre École';
