import type { Student, MonthKey, ServiceType } from './types';
import { MONTH_LABELS, monthlyShare, formatFCFA } from './types';

export interface WhatsAppContext {
  student: Student;
  month: MonthKey;
  service: ServiceType;
  schoolName: string;
}

export function buildWhatsAppMessage(ctx: WhatsAppContext): string {
  const { student, month, service, schoolName } = ctx;
  const svc = student.services.find(s => s.type === service);
  const monthlyFee = svc ? Math.round(monthlyShare(svc.annualFee)) : 0;
  const paid = svc ? svc.payments[month].paid : 0;
  const remaining = Math.max(0, Math.round(monthlyFee - paid));

  const studentName = `${student.firstName} ${student.lastName}`;
  const className = student.className;
  const monthLabel = MONTH_LABELS[month];
  const parentName = student.parentName || 'Cher parent';
  const school = schoolName?.trim() || DEFAULT_SCHOOL;

  const lines: string[] = [
    `Bonjour ${parentName},`,
    `Ici la direction de l'école ${school}.`,
    `Nous vous contactons concernant le suivi des frais de scolarité pour votre enfant ${studentName} (${className}) pour le mois de ${monthLabel}.`,
    `- Montant mensuel dû: ${formatFCFA(monthlyFee)}`,
    `- Montant payé à ce jour: ${formatFCFA(Math.round(paid))}`,
    `- Reste à payer pour ce mois: ${formatFCFA(remaining)}`,
  ];

  if (remaining > 0) {
    lines.push(`Nous vous prions de bien vouloir régulariser le solde restant de ${formatFCFA(remaining)} dès que possible. Merci pour votre collaboration.`);
  } else {
    lines.push(`Nous vous remercions pour votre paiement complet pour ce mois. Excellente journée à vous !`);
  }

  lines.push('Cordialement,');
  lines.push('La Direction.');

  return lines.join('\n');
}

/**
 * Sanitize a phone number for wa.me:
 *  - remove spaces, dashes, parentheses
 *  - strip a leading '+'
 *  - convert a leading '00' (international prefix) to nothing (wa.me wants bare digits with country code)
 * Returns digits only, e.g. "221771234567".
 */
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

const SESSION_KEY = 'scolaria_session';
const DEFAULT_SCHOOL = 'Notre École';

export function getSchoolName(): string {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return DEFAULT_SCHOOL;
    const s = JSON.parse(raw);
    return s.school || DEFAULT_SCHOOL;
  } catch {
    return DEFAULT_SCHOOL;
  }
}

export function setSchoolName(name: string): void {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const session = raw ? JSON.parse(raw) : {};
    session.school = name;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // noop
  }
}
