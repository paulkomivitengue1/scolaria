/**
 * Mémorisation de l'import en cours (fichier choisi + aperçu).
 *
 * Pourquoi : sur Android, Chrome (et la PWA installée) peut recréer la page
 * pendant ou juste après le choix du fichier dans le sélecteur système. L'état
 * React est alors perdu. On enregistre donc :
 *  - les octets du fichier (dès qu'ils sont lus), pour pouvoir relancer
 *    l'analyse sans dépendre du fichier d'origine (qui peut ne plus être
 *    lisible après un redémarrage du navigateur) ;
 *  - l'aperçu déjà calculé, pour le réafficher immédiatement sans re-analyser.
 *
 * IndexedDB est utilisé en priorité (pas de quota de 5 Mo comme
 * sessionStorage) ; sessionStorage sert de secours si IndexedDB est
 * indisponible (navigation privée). Toutes les erreurs sont silencieuses :
 * l'import normal reste possible sans cette mécanique de reprise.
 */
import type { ImportedStudentRow, InvalidImportRow, StudentFileKind } from './studentImport';

const DB_NAME = 'gestilys-import-recovery';
const DB_VERSION = 2;
const STORE = 'state';
const FILE_KEY = 'pending-file';
const SNAPSHOT_KEY = 'pending-snapshot';
const FALLBACK_KEY = 'gestilys-import-snapshot';
const FALLBACK_MAX_CHARS = 2_000_000;
/**
 * Un aperçu mémorisé n'est réutilisé que pendant 24 h : au-delà, il ne
 * correspond probablement plus à ce que la direction est en train de faire.
 */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function isRecent(savedAt: unknown): boolean {
  return typeof savedAt === 'number' && Number.isFinite(savedAt) && Date.now() - savedAt < MAX_AGE_MS && savedAt <= Date.now() + 60_000;
}

export interface StoredImportFile {
  name: string;
  type: string;
  lastModified: number;
  savedAt: number;
  bytes: Uint8Array;
}

export interface StoredImportSnapshot {
  savedAt: number;
  status: 'ready' | 'error';
  fileName: string;
  kind?: StudentFileKind;
  rows?: ImportedStudentRow[];
  /** Lignes refusées (champ manquant, date invalide…) pour les réafficher. */
  invalid?: InvalidImportRow[];
  message?: string;
  details?: string[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponible'));
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      reject(error);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      // Ancienne version : l'import y stockait des objets File peu fiables.
      if (db.objectStoreNames.contains('files')) db.deleteObjectStore('files');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Ouverture du stockage impossible'));
    request.onblocked = () => reject(new Error('Stockage verrouillé par un autre onglet'));
  });
}

async function write(key: string, value: unknown): Promise<boolean> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Écriture impossible'));
      tx.onabort = () => reject(tx.error || new Error('Écriture interrompue'));
    });
    db.close();
    return true;
  } catch {
    return false;
  }
}

async function read<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb();
    const value = await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return value ?? null;
  } catch {
    return null;
  }
}

async function remove(keys: string[]): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      for (const key of keys) tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* Nettoyage au mieux : un enregistrement obsolète sera remplacé au prochain import. */
  }
}

/** Enregistre les octets du fichier choisi (reprise possible avant l'analyse). */
export async function saveImportFileBytes(file: {
  name: string;
  type: string;
  lastModified: number;
  bytes: Uint8Array;
}): Promise<boolean> {
  return write(FILE_KEY, { ...file, savedAt: Date.now() } satisfies StoredImportFile);
}

export async function loadImportFileBytes(): Promise<StoredImportFile | null> {
  const record = await read<StoredImportFile>(FILE_KEY);
  if (!record || !record.bytes) return null;
  if (!isRecent(record.savedAt)) { await remove([FILE_KEY]); return null; }
  const bytes = record.bytes instanceof Uint8Array ? record.bytes : new Uint8Array(record.bytes as ArrayBuffer);
  if (!bytes.byteLength) return null;
  return { ...record, bytes };
}

/** Enregistre l'aperçu (ou l'erreur) pour le réafficher après recréation de l'écran. */
export async function saveImportSnapshot(snapshot: StoredImportSnapshot): Promise<void> {
  const stored = await write(SNAPSHOT_KEY, snapshot);
  if (stored) {
    // Une copie légère dans sessionStorage permet un affichage immédiat
    // (synchrone) au remontage de l'écran, avant la lecture d'IndexedDB.
    try { sessionStorage.removeItem(FALLBACK_KEY); } catch { /* optionnel */ }
    return;
  }
  try {
    const serialized = JSON.stringify(snapshot);
    if (serialized.length <= FALLBACK_MAX_CHARS) sessionStorage.setItem(FALLBACK_KEY, serialized);
  } catch {
    /* Pas de reprise : l'import en cours reste affiché dans l'onglet actif. */
  }
}

export async function loadImportSnapshot(): Promise<StoredImportSnapshot | null> {
  const stored = await read<StoredImportSnapshot>(SNAPSHOT_KEY);
  if (stored) {
    if (!isRecent(stored.savedAt)) { await remove([SNAPSHOT_KEY]); return null; }
    return stored;
  }
  try {
    const raw = sessionStorage.getItem(FALLBACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredImportSnapshot;
    if (!parsed || typeof parsed !== 'object' || !isRecent(parsed.savedAt)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Efface tout l'état d'import mémorisé (après un import réussi). */
export async function clearImportSession(): Promise<void> {
  try { sessionStorage.removeItem(FALLBACK_KEY); } catch { /* optionnel */ }
  await remove([FILE_KEY, SNAPSHOT_KEY]);
}
