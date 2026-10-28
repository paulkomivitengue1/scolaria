/**
 * Journal de diagnostic de l'import, stocké sur l'appareil.
 *
 * Objectif : pouvoir comprendre un échec sur un téléphone Android **sans**
 * brancher l'appareil à un ordinateur ni ouvrir les outils de développeur.
 * Le journal est affiché dans l'écran d'import et peut être copié en un appui.
 *
 * Confidentialité : on n'enregistre JAMAIS de donnée d'élève (ni nom, ni
 * téléphone, ni date de naissance). Uniquement : l'étape technique, le nom du
 * fichier choisi, sa taille, et le message d'erreur technique.
 */

const STORAGE_KEY = 'gestilys-import-diagnostics';
const MAX_ENTRIES = 30;

export interface ImportDiagnosticEntry {
  at: string;
  step: string;
  file?: string;
  size?: number;
  detail?: string;
}

interface StoredDiagnostics {
  environment: string;
  entries: ImportDiagnosticEntry[];
}

function environmentSummary(): string {
  try {
    const nav = navigator as Navigator & { deviceMemory?: number; standalone?: boolean };
    const standalone = nav.standalone === true
      || (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches);
    return [
      `mode=${standalone ? 'PWA installée' : 'navigateur'}`,
      `memoire~${nav.deviceMemory ?? '?'}Go`,
      `coeurs=${nav.hardwareConcurrency ?? '?'}`,
      `reseau=${nav.onLine ? 'en ligne' : 'hors ligne'}`,
      `ecran=${window.screen?.width ?? '?'}x${window.screen?.height ?? '?'}`,
      `dpr=${window.devicePixelRatio ?? '?'}`,
      `ua=${navigator.userAgent}`,
    ].join(' | ');
  } catch {
    return 'environnement indisponible';
  }
}

function readAll(): StoredDiagnostics {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { environment: environmentSummary(), entries: [] };
    const parsed = JSON.parse(raw) as StoredDiagnostics;
    if (!parsed || !Array.isArray(parsed.entries)) return { environment: environmentSummary(), entries: [] };
    return { environment: parsed.environment || environmentSummary(), entries: parsed.entries };
  } catch {
    return { environment: environmentSummary(), entries: [] };
  }
}

/** Ajoute une étape au journal (best-effort : n'échoue jamais). */
export function logImportEvent(step: string, info: { file?: string; size?: number; detail?: string } = {}): void {
  try {
    const current = readAll();
    const entries = current.entries.slice(-(MAX_ENTRIES - 1));
    entries.push({
      at: new Date().toISOString(),
      step,
      file: info.file ? String(info.file).slice(0, 120) : undefined,
      size: typeof info.size === 'number' ? info.size : undefined,
      detail: info.detail ? String(info.detail).slice(0, 300) : undefined,
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ environment: environmentSummary(), entries }));
  } catch {
    /* Le diagnostic est facultatif : il ne doit jamais bloquer un import. */
  }
}

export function readImportDiagnostics(): { environment: string; entries: ImportDiagnosticEntry[] } {
  return readAll();
}

/** Version texte, lisible et copiable, pour un envoi au support. */
export function formatImportDiagnostics(): string {
  const { environment, entries } = readAll();
  if (!entries.length) return 'Aucune trace enregistrée pour le moment.';
  const lines = [`Gestilys — diagnostic import (${new Date().toLocaleString('fr-FR')})`, environment, ''];
  for (const entry of entries.slice().reverse()) {
    const parts = [entry.at, entry.step];
    if (entry.file) parts.push(`fichier=${entry.file}`);
    if (typeof entry.size === 'number') parts.push(`taille=${entry.size}o`);
    if (entry.detail) parts.push(`détail=${entry.detail}`);
    lines.push(parts.join(' · '));
  }
  return lines.join('\n');
}

export function clearImportDiagnostics(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* facultatif */ }
}
