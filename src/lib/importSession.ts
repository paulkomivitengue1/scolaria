/**
 * Mémorisation de l'import en cours (fichier choisi + aperçu).
 *
 * Pourquoi : sur Android, Chrome (et la PWA installée) peut recréer la page
 * pendant ou juste après le choix du fichier dans le sélecteur système. L'état
 * React est alors perdu. On enregistre donc, par ordre de disponibilité :
 *
 *  1. le fichier lui-même, IMMÉDIATEMENT au moment du choix (avant toute
 *     lecture) : si la page est tuée pendant la lecture, on peut réessayer ;
 *  2. les octets du fichier, dès qu'ils ont été lus avec succès : relire le
 *     fichier d'origine n'est alors plus nécessaire (URI `content://`,
 *     fournisseur cloud devenu indisponible…) ;
 *  3. l'aperçu déjà calculé : au remontage de l'écran, il est réaffiché
 *     instantanément, sans relire ni ré-analyser le fichier.
 *
 * IndexedDB est utilisé en priorité (pas de quota de 5 Mo comme
 * sessionStorage) ; sessionStorage sert de secours pour l'aperçu si IndexedDB
 * est indisponible (navigation privée). Toutes les erreurs sont silencieuses :
 * l'import normal reste possible sans cette mécanique de reprise.
 */
import type { ImportedStudentRow, InvalidImportRow, StudentFileKind } from './studentImport';

const DB_NAME = 'gestilys-import-recovery';
const DB_VERSION = 3;
const STATE_STORE = 'state';
/** Nouveau nom de store : évite tout conflit avec l'ancien store « files ». */
const HANDLE_STORE = 'handles';
const BYTES_KEY = 'pending-bytes';
const SNAPSHOT_KEY = 'pending-snapshot';
const HANDLE_KEY = 'pending-handle';
const ATTEMPTS_KEY = 'analysis-attempts';
const FALLBACK_KEY = 'gestilys-import-snapshot';
const FALLBACK_MAX_CHARS = 2_000_000;

/** Un aperçu ou un fichier mémorisé n'est réutilisé que pendant 24 h. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Nombre maximal de ré-analyses automatiques d'un même fichier. */
export const MAX_AUTO_ANALYSIS_ATTEMPTS = 2;

function isRecent(savedAt: unknown): boolean {
  return typeof savedAt === 'number' && Number.isFinite(savedAt)
    && Date.now() - savedAt < MAX_AGE_MS && savedAt <= Date.now() + 60_000;
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
      if (!db.objectStoreNames.contains(STATE_STORE)) db.createObjectStore(STATE_STORE);
      if (!db.objectStoreNames.contains(HANDLE_STORE)) db.createObjectStore(HANDLE_STORE);
      // Ancienne version : l'import y stockait des objets File peu fiables.
      if (db.objectStoreNames.contains('files')) db.deleteObjectStore('files');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Ouverture du stockage impossible'));
    request.onblocked = () => reject(new Error('Stockage verrouillé par un autre onglet'));
  });
}

async function write(store: string, key: string, value: unknown): Promise<boolean> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value, key);
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

async function read<T>(store: string, key: string): Promise<T | null> {
  try {
    const db = await openDb();
    const value = await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const request = tx.objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return value ?? null;
  } catch {
    return null;
  }
}

async function remove(store: string, keys: string[]): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      for (const key of keys) tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* Nettoyage au mieux : un enregistrement obsolète sera remplacé au prochain import. */
  }
}

// ── 1. Le fichier choisi, gardé dès sa sélection ────────────────────────────

export interface StoredFileHandle {
  savedAt: number;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  file: File;
}

/**
 * Enregistre le fichier choisi **avant** de le lire. Sur Android, c'est le seul
 * moyen de récupérer l'import si la page est recréée pendant la lecture.
 */
export async function saveFileHandle(file: File): Promise<boolean> {
  const record: StoredFileHandle = {
    savedAt: Date.now(),
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    file,
  };
  return write(HANDLE_STORE, HANDLE_KEY, record);
}

export async function loadFileHandle(): Promise<File | null> {
  const record = await read<StoredFileHandle>(HANDLE_STORE, HANDLE_KEY);
  if (!record || !isRecent(record.savedAt)) {
    if (record) await remove(HANDLE_STORE, [HANDLE_KEY]);
    return null;
  }
  // Selon le navigateur, l'objet relu peut être un Blob plutôt qu'un File.
  // On vérifie qu'il se comporte VRAIMENT comme un Blob : mieux vaut renoncer
  // à la reprise que d'analyser des données corrompues.
  const blob = record.file as unknown as Blob;
  const looksLikeBlob = Boolean(blob)
    && typeof blob.size === 'number' && blob.size > 0
    && typeof (blob as Blob).arrayBuffer === 'function'
    && typeof (blob as Blob).slice === 'function';
  if (!looksLikeBlob) return null;
  if (typeof File !== 'undefined' && blob instanceof File) return blob;
  try {
    return new File([blob], record.name, { type: record.type, lastModified: record.lastModified });
  } catch {
    return null;
  }
}

// ── 2. Les octets, une fois la lecture réussie ──────────────────────────────

export interface StoredImportFile {
  name: string;
  type: string;
  lastModified: number;
  savedAt: number;
  bytes: Uint8Array;
}

export async function saveImportFileBytes(file: {
  name: string;
  type: string;
  lastModified: number;
  bytes: Uint8Array;
}): Promise<boolean> {
  return write(STATE_STORE, BYTES_KEY, { ...file, savedAt: Date.now() } satisfies StoredImportFile);
}

export async function loadImportFileBytes(): Promise<StoredImportFile | null> {
  const record = await read<StoredImportFile>(STATE_STORE, BYTES_KEY);
  if (!record || !record.bytes) return null;
  if (!isRecent(record.savedAt)) { await remove(STATE_STORE, [BYTES_KEY]); return null; }
  const bytes = record.bytes instanceof Uint8Array ? record.bytes : new Uint8Array(record.bytes as ArrayBuffer);
  if (!bytes.byteLength) return null;
  return { ...record, bytes };
}

// ── 3. L'aperçu déjà calculé ────────────────────────────────────────────────

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

/** Enregistre l'aperçu (ou l'erreur) pour le réafficher après recréation de l'écran. */
export async function saveImportSnapshot(snapshot: StoredImportSnapshot): Promise<void> {
  const stored = await write(STATE_STORE, SNAPSHOT_KEY, snapshot);
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
  const stored = await read<StoredImportSnapshot>(STATE_STORE, SNAPSHOT_KEY);
  if (stored) {
    if (!isRecent(stored.savedAt)) { await remove(STATE_STORE, [SNAPSHOT_KEY]); return null; }
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

// ── 4. Garde-fou contre les boucles de ré-analyse ───────────────────────────

interface StoredAttempts {
  signature: string;
  count: number;
  savedAt: number;
}

/**
 * Compte les ré-analyses automatiques du même fichier. Sans ce garde-fou, un
 * fichier qui échoue en boucle ferait tourner l'analyse à chaque remontage.
 * Renvoie le nombre de tentatives déjà effectuées (1 pour la première).
 */
export async function noteAnalysisAttempt(signature: string): Promise<number> {
  const previous = await read<StoredAttempts>(STATE_STORE, ATTEMPTS_KEY);
  const sameRun = previous && previous.signature === signature && isRecent(previous.savedAt);
  const count = sameRun ? previous.count + 1 : 1;
  await write(STATE_STORE, ATTEMPTS_KEY, { signature, count, savedAt: Date.now() } satisfies StoredAttempts);
  return count;
}

export async function resetAnalysisAttempts(): Promise<void> {
  await remove(STATE_STORE, [ATTEMPTS_KEY]);
}

// ── Nettoyage ───────────────────────────────────────────────────────────────

/** Efface tout l'état d'import mémorisé (après un import réussi). */
export async function clearImportSession(): Promise<void> {
  try { sessionStorage.removeItem(FALLBACK_KEY); } catch { /* optionnel */ }
  await remove(STATE_STORE, [BYTES_KEY, SNAPSHOT_KEY, ATTEMPTS_KEY]);
  await remove(HANDLE_STORE, [HANDLE_KEY]);
}
