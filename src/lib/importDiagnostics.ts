/**
 * Journal de diagnostic de l'import, stocké sur l'appareil.
 * Aucun nom d'élève ni téléphone n'est enregistré.
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
  storage?: string;
}

function environmentSummary(): string {
  try {
    const nav = navigator as Navigator & { deviceMemory?: number; standalone?: boolean };
    const standalone = nav.standalone === true
      || (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches);
    const storageStatus = (kind: 'localStorage' | 'sessionStorage') => {
      try {
        const storage = window[kind];
        const key = '__gestilys_import_diag_test__';
        storage.setItem(key, '1');
        storage.removeItem(key);
        return 'ok';
      } catch { return 'bloqué'; }
    };
    return [
      `diagnostic=picker-v3`,
      `mode=${standalone ? 'PWA installée' : 'navigateur'}`,
      `memoire~${nav.deviceMemory ?? '?'}Go`,
      `coeurs=${nav.hardwareConcurrency ?? '?'}`,
      `reseau=${nav.onLine ? 'en ligne' : 'hors ligne'}`,
      `stockageLocal=${storageStatus('localStorage')}`,
      `stockageSession=${storageStatus('sessionStorage')}`,
      `ecran=${window.screen?.width ?? '?'}x${window.screen?.height ?? '?'}`,
      `dpr=${window.devicePixelRatio ?? '?'}`,
      `ua=${navigator.userAgent}`,
    ].join(' | ');
  } catch { return 'environnement indisponible'; }
}

function availableStores(): Array<{ name: 'localStorage' | 'sessionStorage'; store: Storage }> {
  const stores: Array<{ name: 'localStorage' | 'sessionStorage'; store: Storage }> = [];
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    try {
      const store = window[name];
      const testKey = '__gestilys_import_diag_test__';
      store.setItem(testKey, '1');
      store.removeItem(testKey);
      stores.push({ name, store });
    } catch { /* essaie l'autre stockage */ }
  }
  return stores;
}

function readAll(): StoredDiagnostics {
  const stores = availableStores();
  for (const { name, store } of stores) {
    try {
      const raw = store.getItem(STORAGE_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as StoredDiagnostics;
      if (parsed && Array.isArray(parsed.entries)) {
        return { environment: parsed.environment || environmentSummary(), entries: parsed.entries, storage: name };
      }
    } catch { /* essaie le stockage suivant */ }
  }
  return { environment: environmentSummary(), entries: [], storage: stores[0]?.name };
}

let globalErrorHandlersInstalled = false;

/**
 * Capture les erreurs JavaScript qui ne remontent pas toujours jusqu'au
 * gestionnaire d'import, sans enregistrer de données d'élèves.
 */
export function installImportDiagnosticErrorHandlers(): void {
  if (globalErrorHandlersInstalled || typeof window === 'undefined') return;
  globalErrorHandlersInstalled = true;
  window.addEventListener('error', (event) => {
    const location = event.filename ? ` · ${event.filename.split('/').pop() || ''}:${event.lineno || 0}:${event.colno || 0}` : '';
    logImportEvent('erreur JavaScript globale', {
      detail: `${event.message || 'Erreur JavaScript inconnue'}${location}`,
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const detail = reason instanceof Error
      ? `${reason.name}: ${reason.message}`
      : typeof reason === 'string' ? reason : 'Promesse rejetée sans message exploitable';
    logImportEvent('promesse rejetée sans gestionnaire', { detail });
  });
}

/** Ajoute une étape au journal sans jamais bloquer l'import. */
export function logImportEvent(step: string, info: { file?: string; size?: number; detail?: string } = {}): void {
  try {
    const stores = availableStores();
    const current = readAll();
    const entries = current.entries.slice(-(MAX_ENTRIES - 1));
    entries.push({
      at: new Date().toISOString(),
      step,
      file: info.file ? String(info.file).slice(0, 120) : undefined,
      size: typeof info.size === 'number' ? info.size : undefined,
      detail: info.detail ? String(info.detail).slice(0, 300) : undefined,
    });
    const payload = JSON.stringify({ environment: environmentSummary(), entries });
    for (const { store } of stores) {
      try { store.setItem(STORAGE_KEY, payload); } catch { /* essaie l'autre stockage */ }
    }
  } catch { /* diagnostic facultatif */ }
}

export function readImportDiagnostics(): { environment: string; entries: ImportDiagnosticEntry[] } {
  return readAll();
}

function diagnosticAdvice(entry: ImportDiagnosticEntry): string | null {
  const text = `${entry.step} ${entry.detail || ''}`.toLocaleLowerCase('fr');
  if (/mémoire|memoire|memory|quota|allocation|out of memory/.test(text)) {
    return 'Piste : fermez les autres onglets, puis enregistrez uniquement la feuille des élèves dans un nouveau fichier .xlsx ou .csv plus léger.';
  }
  if (/indexeddb|stockage|quotaexceeded|transaction/.test(text)) {
    return 'Piste : ouvrez Gestilys dans Chrome normal, fermez les autres onglets Gestilys et réessayez sans effacer les données du site.';
  }
  if (/lecture|arraybuffer|fichier|permission|content:\/\//.test(text)) {
    return 'Piste : copiez le fichier dans le dossier Téléchargements du téléphone, puis sélectionnez cette copie.';
  }
  if (/module excel|xlsx|chunk|chargement module/.test(text)) {
    return 'Piste : vérifiez la connexion Internet et rechargez Gestilys avant de choisir à nouveau le fichier.';
  }
  if (/erreur|échec|rejet|failed|failure/.test(text)) {
    return 'Piste : cette erreur nécessite une vérification du code. Conservez et transmettez ce diagnostic complet.';
  }
  return null;
}

/** Version texte lisible et copiable pour le support. */
export function formatImportDiagnostics(): string {
  const { environment, entries, storage } = readAll();
  const header = [
    `Gestilys — diagnostic import (${new Date().toLocaleString('fr-FR')})`,
    'versionDiagnostic=picker-v3',
    environment,
    `journal=${storage || 'aucun stockage disponible'}`,
    '',
  ];
  if (!entries.length) {
    return [...header, 'Aucune étape enregistrée. Si ce message apparaît juste après ouverture, le code de diagnostic peut ne pas être chargé ou le stockage est indisponible.'].join('\n');
  }
  for (const entry of entries.slice().reverse()) {
    const parts = [entry.at, entry.step];
    if (entry.file) parts.push(`fichier=${entry.file}`);
    if (typeof entry.size === 'number') parts.push(`taille=${entry.size}o`);
    if (entry.detail) parts.push(`détail=${entry.detail}`);
    header.push(parts.join(' · '));
    const advice = diagnosticAdvice(entry);
    if (advice) header.push('  → ' + advice);
  }
  return header.join('\n');
}

export function clearImportDiagnostics(): void {
  for (const { store } of availableStores()) {
    try { store.removeItem(STORAGE_KEY); } catch { /* facultatif */ }
  }
}
