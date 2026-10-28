/**
 * Import des élèves depuis un fichier Excel (.xlsx / .xls / .xlsm) ou CSV.
 *
 * Ce module est volontairement sans dépendance à React ni au DOM : il reçoit un
 * fichier « de type File » (nom, taille, arrayBuffer) et renvoie un aperçu
 * prêt à être vérifié. Il est donc testable directement (voir tests/).
 *
 * Objectifs de robustesse (téléphones Android, fichiers réels d'école) :
 *  - lire les octets immédiatement et plusieurs fois si le fournisseur Android
 *    (content://, Google Drive, OneDrive) échoue une première fois ;
 *  - reconnaître le format par les octets d'en-tête et non par l'extension ;
 *  - décoder les CSV Windows-1252 exportés par Excel (accents français) ;
 *  - accepter les vraies cellules date d'Excel (nombres de série) ;
 *  - accepter les variantes d'en-têtes réellement utilisées (« NOM(S) »,
 *    « PRÉNOMS », « TÉLÉPHONE », titres au-dessus du tableau…) ;
 *  - signaler clairement les lignes inutilisables, les doublons et les classes
 *    inconnues au lieu d'afficher un aperçu vide.
 */

export interface ImportedStudentRow {
  firstName: string;
  lastName: string;
  className: string;
  parentName: string;
  parentPhone: string;
  birthDate?: string;
  birthPlace?: string;
  sexe: 'M' | 'F';
}

export type StudentFileKind = 'xlsx' | 'xls' | 'csv';

/** Ligne de l'aperçu, avec son état de contrôle. */
export interface PreviewRow extends ImportedStudentRow {
  /** Numéro de ligne dans le fichier d'origine (1 = première ligne). */
  lineNumber: number;
  /** Déjà présente dans la base de l'école (nom + prénom + classe). */
  alreadyRegistered: boolean;
  /** Doublon d'une ligne précédente du même fichier. */
  duplicateInFile: boolean;
}

/** Ligne du fichier qui ne peut pas être importée, avec la raison. */
export interface InvalidImportRow {
  lineNumber: number;
  reason: string;
}

export interface ParsedGridResult {
  rows: PreviewRow[];
  invalid: InvalidImportRow[];
}

export interface ImportPreview {
  fileName: string;
  kind: StudentFileKind;
  /** Toutes les lignes valides du fichier, doublons inclus (pour l'affichage). */
  rows: PreviewRow[];
  /** Lignes réellement importables (ni doublon, ni déjà inscrite). */
  importableRows: ImportedStudentRow[];
  importableCount: number;
  duplicateInFileCount: number;
  alreadyRegisteredCount: number;
  /** Lignes ignorées (champ manquant, date invalide…) avec leur raison. */
  invalidRows: InvalidImportRow[];
  invalidCount: number;
  /** Classes présentes dans le fichier mais absentes de la configuration. */
  unknownClasses: string[];
  warnings: string[];
}

/** Erreur lisible par l'utilisateur, avec détails optionnels. */
export class StudentImportError extends Error {
  readonly details: string[];

  constructor(message: string, details: string[] = []) {
    super(message);
    this.name = 'StudentImportError';
    this.details = details;
  }
}

export interface ImportSourceFile {
  name: string;
  type: string;
  size: number;
  lastModified?: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

export interface ExistingStudentLike {
  firstName: string;
  lastName: string;
  className: string;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 5000;
const HEADER_SCAN_ROWS = 15;
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
const DAY_MS = 86400000;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function messageOf(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return fallback;
}

// ── Normalisation ────────────────────────────────────────────────────────────

/** Minuscules, sans accents, sans ponctuation : sert à comparer les en-têtes. */
export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Clé de comparaison des classes : « 6e A » et « 6ème A » sont équivalents. */
export function normalizeClassName(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/(\d+)(?:ere|er|eme|e|ieme|ie)?/g, '$1')
    .replace(/[^a-z0-9]/g, '');
}

/** Clé de comparaison des noms : espaces multiples, casse et accents ignorés. */
export function normalizePersonName(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Clé unique d'un élève (prénom + nom + classe). Utilisée à la fois pour
 * marquer les doublons dans l'aperçu et pour refuser les doublons en base.
 */
export function studentDuplicateKey(student: { firstName: string; lastName: string; className: string }): string {
  return [
    normalizePersonName(student.firstName),
    normalizePersonName(student.lastName),
    normalizeClassName(student.className),
  ].join('|');
}

// ── Valeurs de cellules ──────────────────────────────────────────────────────

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function isoFromUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function isValidIso(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

/** Convertit un numéro de série Excel (ex. 41376) en AAAA-MM-JJ. */
export function excelSerialToIsoDate(serial: number): string {
  const date = new Date(EXCEL_EPOCH_UTC + Math.round(serial) * DAY_MS);
  return isValidIso(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()) ? isoFromUtc(date) : '';
}

/**
 * Normalise une date de naissance : accepte AAAA-MM-JJ, JJ/MM/AAAA, JJ.MM.AAAA,
 * AAAA/MM/JJ, AAAAMMJJ, un nombre de série Excel et un objet Date.
 * Renvoie '' si la valeur est vide ; lève une erreur explicite sinon.
 */
export function normalizeBirthDate(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new StudentImportError('Date de naissance invalide dans le fichier.');
    return isoFromUtc(new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())));
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new StudentImportError('Date de naissance invalide dans le fichier.');
    // AAAAMMJJ saisi comme un nombre (ex. 20130412).
    if (value >= 19000101 && value <= 21001231) {
      const text = String(Math.round(value));
      return normalizeBirthDate(`${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`);
    }
    // Numéro de série Excel (1900 → 2100 environ).
    if (value >= 61 && value <= 73051) {
      const iso = excelSerialToIsoDate(value);
      if (iso) return iso;
    }
    throw new StudentImportError(
      `Date de naissance invalide : « ${value} ». Utilisez JJ/MM/AAAA ou AAAA-MM-JJ.`,
    );
  }
  const text = String(value).trim();
  if (!text) return '';
  const isoMatch = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const [year, month, day] = [Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3])];
    if (!isValidIso(year, month, day)) throw invalidDate(text);
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }
  const frenchMatch = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if (frenchMatch) {
    const day = Number(frenchMatch[1]);
    const month = Number(frenchMatch[2]);
    let year = Number(frenchMatch[3]);
    if (frenchMatch[3].length === 2) year += year > 60 ? 1900 : 2000;
    if (!isValidIso(year, month, day)) throw invalidDate(text);
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }
  const compactMatch = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    const [year, month, day] = [Number(compactMatch[1]), Number(compactMatch[2]), Number(compactMatch[3])];
    if (!isValidIso(year, month, day)) throw invalidDate(text);
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }
  throw invalidDate(text);
}

function invalidDate(text: string): StudentImportError {
  return new StudentImportError(
    `Date de naissance invalide : « ${text} ». Utilisez JJ/MM/AAAA ou AAAA-MM-JJ.`,
  );
}

/** Texte propre d'une cellule (nombres, booléens, dates Excel). */
export function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.replace(/\u00a0/g, ' ').trim();
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
  }
  if (typeof value === 'boolean') return value ? 'oui' : 'non';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : isoFromUtc(new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())));
  }
  if (typeof value === 'object' && value !== null && 'w' in value) return String((value as { w?: unknown }).w ?? '').trim();
  return String(value).trim();
}

/**
 * Téléphone : le texte est conservé tel qu'il est écrit dans le fichier
 * (uniquement débarrassé des espaces insécables et des espaces superflus).
 *
 * Règle métier inchangée par rapport à la production : on ne supprime ni la
 * mise en forme (« 75 00 00 00 »), ni un éventuel « +223 », ni un suffixe.
 * Les zéros initiaux sont préservés dès lors que la cellule est du texte.
 */
export function normalizePhone(value: unknown): string {
  return cellText(value);
}

function normalizeSex(value: unknown): 'M' | 'F' {
  const text = normalizeHeader(value);
  if (!text) return 'M';
  if (/^(f|fem|feminin|fille|female|girl)/.test(text)) return 'F';
  return 'M';
}

// ── En-têtes ─────────────────────────────────────────────────────────────────

type Field = 'first' | 'last' | 'cls' | 'parent' | 'phone' | 'birthDate' | 'birthPlace' | 'sex';
type HeaderMap = Partial<Record<Field, number>>;

const EXACT_ALIASES: Record<Field, string[]> = {
  first: ['prenom', 'prenoms', 'prenomdeleleve', 'prenomsdeleleve', 'prenomseleves', 'firstname', 'givenname'],
  last: ['nom', 'noms', 'nomdefamille', 'nomdefamilleeleve', 'nomdeleleve', 'nomseleves', 'lastname', 'surname', 'patronyme'],
  cls: ['classe', 'classes', 'class', 'niveau', 'section', 'division', 'classefrequentee', 'niveauscolaire', 'grade'],
  parent: ['parent', 'parents', 'nomparent', 'nomdesparent', 'nomduparent', 'nomdututeur', 'tuteur', 'tutrice', 'nomdupere', 'nomdelamere', 'pere', 'mere', 'responsable', 'responsablelegal', 'nomresponsable'],
  phone: ['telephone', 'telephones', 'telephoneparent', 'telephoneduparent', 'telephonetuteur', 'telephonepere', 'telephonepereoumere', 'tel', 'telfixe', 'telparent', 'telportable', 'phone', 'phoneparent', 'contact', 'contactparent', 'mobile', 'portable', 'numeroparent', 'numerodutelephone', 'numerotelephone'],
  birthDate: ['datenaissance', 'datedenaissance', 'datenaiss', 'naissance', 'ddn', 'birthdate', 'birthday', 'dateofbirth'],
  birthPlace: ['lieunaissance', 'lieudenaissance', 'lieuxnaissance', 'villeenaisance', 'villedenaissance', 'lieu', 'birthplace', 'lieuenaissance', 'lieunaissancedeleve'],
  sex: ['sexe', 'sexes', 'genre', 'gender', 'sex'],
};

/** En-têtes qui mélangent nom et prénom dans une seule colonne. */
const COMBINED_ALIASES = [
  'nometprenom', 'nomsetprenoms', 'nomsprenoms', 'nomsprenom', 'nomprenom', 'prenomnom',
  'prenomsetnom', 'nomcomplet', 'nomcomplets', 'nomprenomdeleleve', 'nomsprenomsdeleleves',
];

/**
 * Règle par « contient » : un en-tête réel contient souvent des mots en trop
 * (« Téléphone du parent », « Classe fréquentée », « NOM(S) »).
 * L'ordre évite les collisions : téléphone avant parent, prénom avant nom
 * (car « prenom » contient « nom »).
 */
function fieldForHeader(rawHeader: string): Field | 'combined' | null {
  const header = normalizeHeader(rawHeader);
  if (!header) return null;
  if (COMBINED_ALIASES.includes(header)) return 'combined';
  for (const [field, aliases] of Object.entries(EXACT_ALIASES) as Array<[Field, string[]]>) {
    if (aliases.includes(header)) return field;
  }
  const birthish = header.includes('naiss') || header.includes('ddn') || header.includes('birth') || header.includes('born');
  if (birthish) {
    return header.includes('lieu') || header.includes('ville') || header.includes('place') ? 'birthPlace' : 'birthDate';
  }
  if (['telephone', 'tel', 'phone', 'mobile', 'portable', 'contact', 'numero', 'gsm'].some((keyword) => header.includes(keyword))) return 'phone';
  if (['parent', 'tuteur', 'tutrice', 'pere', 'mere', 'responsable'].some((keyword) => header.includes(keyword))) return 'parent';
  if (['sexe', 'genre', 'gender'].some((keyword) => header.includes(keyword))) return 'sex';
  if (['classe', 'niveau', 'division', 'section', 'grade'].some((keyword) => header.includes(keyword))) return 'cls';
  if (header.includes('prenom') || header.includes('firstname') || header.includes('givenname')) return 'first';
  if (header.includes('nom') || header.includes('lastname') || header.includes('surname')) return 'last';
  return null;
}

function mapHeaders(row: unknown[]): { map: HeaderMap; combinedHeader: string } {
  const map: HeaderMap = {};
  let combinedHeader = '';
  row.forEach((cell, index) => {
    const field = fieldForHeader(cellText(cell));
    if (field === 'combined') { combinedHeader = cellText(cell); return; }
    if (!field) return;
    if (map[field] === undefined) map[field] = index;
  });
  return { map, combinedHeader };
}

function describeHeaders(row: unknown[]): string {
  const cells = row.map(cellText).filter(Boolean).slice(0, 8);
  return cells.length ? `Colonnes détectées : ${cells.map((cell) => `« ${cell} »`).join(', ')}.` : 'La première ligne est vide.';
}

/** Vrai si la ligne ressemble à une ligne d'en-têtes complète. */
function isHeaderRow(row: unknown[]): { ok: boolean; map: HeaderMap; combinedHeader: string } {
  const { map, combinedHeader } = mapHeaders(row);
  const filled = row.filter((cell) => cellText(cell)).length;
  const ok = map.first !== undefined && map.last !== undefined && map.cls !== undefined && filled >= 2;
  return { ok, map, combinedHeader };
}

// ── Analyse d'une grille (feuille Excel ou CSV) ──────────────────────────────

const EMPTY_ROW = (row: unknown[] | undefined) => !row || row.every((cell) => !cellText(cell));

/**
 * Transforme une grille (tableau de lignes) en élèves.
 * Les lignes inexploitables ne sont pas importées en silence : elles lèvent une
 * erreur qui indique les numéros de ligne concernés.
 */
export function parseStudentGrid(grid: unknown[][], sheetLabel?: string): ParsedGridResult {
  const prefix = sheetLabel ? `Feuille « ${sheetLabel} » : ` : '';
  const scanLimit = Math.min(grid.length, HEADER_SCAN_ROWS);
  let headerIndex = -1;
  let headers: HeaderMap = {};
  let combinedHeader = '';

  for (let index = 0; index < scanLimit; index += 1) {
    if (EMPTY_ROW(grid[index])) continue;
    const candidate = isHeaderRow(grid[index]);
    if (candidate.ok) {
      headerIndex = index;
      headers = candidate.map;
      break;
    }
    if (candidate.combinedHeader && !combinedHeader) combinedHeader = candidate.combinedHeader;
  }

  if (headerIndex < 0) {
    if (combinedHeader) {
      throw new StudentImportError(
        prefix + `la colonne « ${combinedHeader} » contient le nom ET le prénom. Séparez-la en deux colonnes « Prénom » et « Nom », puis réessayez.`,
      );
    }
    const firstFilled = grid.find((row) => !EMPTY_ROW(row));
    throw new StudentImportError(
      prefix + 'aucune ligne d’en-têtes avec « Prénom », « Nom » et « Classe » n’a été trouvée dans les 15 premières lignes.',
      firstFilled ? [describeHeaders(firstFilled)] : [],
    );
  }

  const dataRows = grid.slice(headerIndex + 1);
  if (dataRows.length > MAX_ROWS) {
    throw new StudentImportError(
      prefix + `le fichier contient plus de ${MAX_ROWS.toLocaleString('fr-FR')} lignes. Séparez la liste en plusieurs fichiers pour éviter de saturer la mémoire du téléphone.`,
    );
  }

  const rows: PreviewRow[] = [];
  const invalid: InvalidImportRow[] = [];
  const seen = new Set<string>();

  dataRows.forEach((cells, offset) => {
    if (!cells || EMPTY_ROW(cells)) return;
    const lineNumber = headerIndex + offset + 2; // +1 ligne d'en-tête, +1 index 1-based
    const value = (index?: number) => (index === undefined || index < 0 ? '' : cells[index]);
    const firstName = cellText(value(headers.first)).replace(/\s+/g, ' ');
    const lastName = cellText(value(headers.last)).replace(/\s+/g, ' ');
    const className = cellText(value(headers.cls)).replace(/\s+/g, ' ');
    if (!firstName && !lastName && !className) return;

    const missing = [
      !firstName ? 'Prénom' : '',
      !lastName ? 'Nom' : '',
      !className ? 'Classe' : '',
    ].filter(Boolean);
    if (missing.length) {
      const label = missing.length === 1
        ? missing[0] + (missing[0] === 'Classe' ? ' manquante' : ' manquant')
        : missing.join(', ') + ' manquants';
      const who = [firstName, lastName].filter(Boolean).join(' ');
      invalid.push({ lineNumber, reason: label + (who ? ' — « ' + who + ' »' : '') });
      return;
    }

    let birthDate = '';
    try {
      birthDate = normalizeBirthDate(value(headers.birthDate));
    } catch (error) {
      invalid.push({ lineNumber, reason: messageOf(error, 'date de naissance invalide') });
      return;
    }

    const row: PreviewRow = {
      firstName,
      lastName,
      className,
      parentName: cellText(value(headers.parent)).replace(/\s+/g, ' '),
      parentPhone: normalizePhone(value(headers.phone)),
      birthDate,
      birthPlace: cellText(value(headers.birthPlace)).replace(/\s+/g, ' '),
      sexe: normalizeSex(value(headers.sex)),
      lineNumber,
      alreadyRegistered: false,
      duplicateInFile: false,
    };
    if (birthDate === '') delete (row as { birthDate?: string }).birthDate;
    if (!row.birthPlace) delete (row as { birthPlace?: string }).birthPlace;

    const key = studentDuplicateKey(row);
    if (seen.has(key)) row.duplicateInFile = true;
    else seen.add(key);
    rows.push(row);
  });

  if (!rows.length) {
    // Aucune ligne exploitable : on explique précisément pourquoi.
    throw new StudentImportError(
      prefix + (invalid.length
        ? 'aucune ligne du fichier n’est complète : ' + invalid.length + ' ligne(s) ont un champ manquant ou une date invalide.'
        : 'aucun élève n’a été trouvé sous la ligne des en-têtes.'),
      invalid.slice(0, 5).map((row) => 'ligne ' + row.lineNumber + ' : ' + row.reason),
    );
  }
  return { rows, invalid };
}

// ── CSV ──────────────────────────────────────────────────────────────────────

/**
 * Décode un fichier texte : UTF-8 (avec ou sans BOM), UTF-16LE/BE, sinon
 * Windows-1252 — le cas des CSV exportés par Excel en français.
 */
export function decodeTextBytes(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder('windows-1252').decode(bytes);
    } catch {
      return new TextDecoder('utf-8').decode(bytes);
    }
  }
}

function detectSeparator(text: string): string {
  const sample = text.split(/\r?\n/).find((line) => line.trim()) || '';
  const count = (char: string) => sample.split(char).length - 1;
  const candidates: Array<[string, number]> = [
    [';', count(';')],
    ['\t', count('\t')],
    [',', count(',')],
  ];
  candidates.sort((a, b) => b[1] - a[1]);
  return candidates[0][1] > 0 ? candidates[0][0] : ';';
}

/** Découpe un CSV complet en grille, guillemets et retours à la ligne compris. */
export function tokenizeCsv(text: string, separator: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') { field += '"'; index += 1; }
        else quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === separator) { row.push(field); field = ''; continue; }
    if (char === '\r') { continue; }
    if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((cells) => cells.some((cell) => cell.trim()));
}

export function parseStudentCsvText(text: string): ParsedGridResult {
  const normalized = text.replace(/^\uFEFF/, '');
  if (!normalized.trim()) throw new StudentImportError('Le fichier CSV est vide.');
  // Séparateur le plus probable d'abord, puis les autres : une ligne de titre
  // contenant des virgules ne doit pas empêcher la détection du « ; ».
  const preferred = detectSeparator(normalized);
  const separators = [preferred, ';', ',', '\t'].filter((separator, index, list) => list.indexOf(separator) === index);
  let firstError: unknown = null;
  for (const separator of separators) {
    try {
      return parseStudentGrid(tokenizeCsv(normalized, separator));
    } catch (error) {
      if (!firstError) firstError = error;
      if (separator === preferred) firstError = error;
    }
  }
  throw firstError instanceof Error
    ? firstError
    : new StudentImportError('Ce fichier CSV n’a pas pu être lu. Enregistrez-le à nouveau au format CSV UTF-8 (séparateur point-virgule).');
}

export function parseStudentCsv(textOrBytes: string | Uint8Array): ParsedGridResult {
  return typeof textOrBytes === 'string' ? parseStudentCsvText(textOrBytes) : parseStudentCsvText(decodeTextBytes(textOrBytes));
}

// ── Lecture du fichier ───────────────────────────────────────────────────────

/**
 * Lit les octets du fichier. Sur Android, un fichier choisi via le sélecteur
 * système (content://, Google Drive, OneDrive) peut échouer une première fois :
 * on réessaie avant d'afficher un message explicite.
 */
export async function readFileBytes(file: ImportSourceFile, attempts = 3): Promise<Uint8Array> {
  let lastProblem = '';
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      if (bytes.byteLength > 0) return bytes;
      lastProblem = 'fichier vide';
    } catch (error) {
      lastProblem = messageOf(error, 'lecture impossible');
    }
    if (attempt < attempts - 1) await delay(120 * (attempt + 1));
  }
  throw new StudentImportError(
    `Le fichier « ${file.name} » n’a pas pu être lu (${lastProblem}). Sur Android, copiez-le d’abord dans « Téléchargements » (ou enregistrez-le sur le téléphone depuis Google Drive / OneDrive) puis sélectionnez-le à nouveau.`,
  );
}

/** Détecte le format réel grâce aux octets d'en-tête, pas à l'extension. */
export function detectFileKind(bytes: Uint8Array, fileName = ''): StudentFileKind {
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)) {
    return 'xlsx';
  }
  if (bytes.length >= 8 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    return 'xls';
  }
  // Un fichier texte (même mal nommé « .xlsx », cas fréquent sur Android) est
  // lu comme un CSV : c'est plus utile qu'un message « fichier illisible ».
  void fileName;
  return 'csv';
}

interface SpreadsheetLibrary {
  read: (data: Uint8Array, options: Record<string, unknown>) => {
    SheetNames: string[];
    Sheets: Record<string, unknown>;
  };
  utils: { sheet_to_json: (sheet: unknown, options: Record<string, unknown>) => unknown[][] };
}

/** Charge xlsx à la demande, avec une seconde tentative (réseau mobile instable). */
async function loadSpreadsheetLibrary(): Promise<SpreadsheetLibrary> {
  try {
    return (await import('xlsx')) as unknown as SpreadsheetLibrary;
  } catch {
    await delay(300);
    try {
      return (await import('xlsx')) as unknown as SpreadsheetLibrary;
    } catch {
      throw new StudentImportError(
        'Le module de lecture Excel n’a pas pu être chargé. Vérifiez la connexion Internet puis réessayez. En attendant, un fichier CSV peut être importé.',
      );
    }
  }
}

const READ_OPTIONS = {
  type: 'array',
  dense: true,
  sheetRows: MAX_ROWS + 6,
  // cellDates: false → les dates restent des numéros de série Excel, convertis
  // par normalizeBirthDate sans dépendre du fuseau horaire du téléphone.
  cellDates: false,
  cellFormula: false,
  cellHTML: false,
  cellStyles: false,
  bookVBA: false,
  WTF: false,
} as const;

export async function parseWorkbookBytes(bytes: Uint8Array, kind: StudentFileKind = 'xlsx'): Promise<{ rows: PreviewRow[]; invalid: InvalidImportRow[]; kind: StudentFileKind }> {
  const XLSX = await loadSpreadsheetLibrary();
  let workbook: { SheetNames: string[]; Sheets: Record<string, unknown> };
  try {
    // Parse the ZIP container only once. Re-reading the same workbook once per
    // sheet caused repeated decompression and high transient memory pressure on
    // Android, especially for files with several sheets.
    workbook = XLSX.read(bytes, READ_OPTIONS as unknown as Record<string, unknown>);
  } catch {
    throw new StudentImportError(
      'Ce fichier Excel est illisible : il est peut-être endommagé, protégé par un mot de passe, ou ce n’est pas un vrai fichier Excel. Ouvrez-le dans Excel, choisissez « Enregistrer sous » puis le format .xlsx, et réessayez.',
    );
  }
  const sheetNames = workbook?.SheetNames || [];
  if (!sheetNames.length) throw new StudentImportError('Le classeur Excel ne contient aucune feuille.');
  const problems: string[] = [];
  for (const sheetName of sheetNames) {
    try {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet || !(sheet as { '!ref'?: string })['!ref']) continue;
      const grid = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: true,
        defval: '',
        blankrows: false,
        range: { s: { r: 0, c: 0 }, e: { r: MAX_ROWS + 5, c: 25 } },
      }) as unknown[][];
      const parsed = parseStudentGrid(grid, sheetNames.length > 1 ? sheetName : undefined);
      return { rows: parsed.rows, invalid: parsed.invalid, kind };
    } catch (error) {
      problems.push(messageOf(error, `Feuille « ${sheetName} » : format non reconnu.`));
    } finally {
      // Release each processed grid as soon as possible. The parser only needs
      // one sheet's normalized rows; it must not retain converted grids.
      delete workbook.Sheets[sheetName];
    }
  }
  throw new StudentImportError(
    problems.length === 1
      ? problems[0]
      : 'Aucune feuille de ce classeur ne contient un tableau d’élèves utilisable.',
    problems.length > 1 ? problems : [],
  );
}

// ── Aperçu prêt à confirmer ──────────────────────────────────────────────────

export interface BuildPreviewOptions {
  fileName: string;
  kind: StudentFileKind;
  classNames: string[];
  existingStudents?: ExistingStudentLike[];
  /** Lignes refusées lors de l'analyse (champ manquant, date invalide…). */
  invalidRows?: InvalidImportRow[];
}

/**
 * Enrichit les lignes analysées : classe configurée reconnue, doublons du
 * fichier, élèves déjà inscrits, et lignes réellement importables.
 */
export function buildImportPreview(rows: PreviewRow[], options: BuildPreviewOptions): ImportPreview {
  const classByNormalizedName = new Map(options.classNames.map((name) => [normalizeClassName(name), name]));
  const unknownClasses: string[] = [];
  const registeredKeys = new Set((options.existingStudents || []).map((student) => studentDuplicateKey(student)));

  const previewRows = rows.map((row) => {
    const configured = classByNormalizedName.get(normalizeClassName(row.className));
    if (!configured && !unknownClasses.some((name) => normalizeClassName(name) === normalizeClassName(row.className))) {
      unknownClasses.push(row.className);
    }
    return {
      ...row,
      className: configured || row.className,
      alreadyRegistered: registeredKeys.has(studentDuplicateKey({ ...row, className: configured || row.className })),
    };
  });

  const importableRows = previewRows
    .filter((row) => !row.duplicateInFile && !row.alreadyRegistered && classByNormalizedName.has(normalizeClassName(row.className)))
    .map(({ lineNumber: _line, duplicateInFile: _duplicate, alreadyRegistered: _registered, ...student }) => student);

  const invalidRows = options.invalidRows || [];
  const warnings: string[] = [];
  if (invalidRows.length) {
    warnings.push(`${invalidRows.length} ligne(s) du fichier ne peuvent pas être importées (champ manquant ou date invalide) : elles sont listées ci-dessous et seront ignorées.`);
  }
  const duplicateInFileCount = previewRows.filter((row) => row.duplicateInFile).length;
  const alreadyRegisteredCount = previewRows.filter((row) => row.alreadyRegistered).length;
  const unknownClassCount = previewRows.filter((row) => !classByNormalizedName.has(normalizeClassName(row.className))).length;
  if (duplicateInFileCount) warnings.push(`${duplicateInFileCount} ligne(s) répètent un élève déjà présent dans le fichier : elles seront ignorées.`);
  if (alreadyRegisteredCount) warnings.push(`${alreadyRegisteredCount} élève(s) sont déjà inscrits dans cette école : ils seront ignorés.`);
  if (unknownClasses.length) {
    warnings.push(`${unknownClassCount} ligne(s) concernent une classe absente de la configuration (${unknownClasses.join(', ')}) : elles seront ignorées. Créez ces classes dans Paramètres puis relisez le fichier pour les ajouter.`);
  }

  return {
    fileName: options.fileName,
    kind: options.kind,
    rows: previewRows,
    importableRows,
    importableCount: importableRows.length,
    duplicateInFileCount,
    alreadyRegisteredCount,
    invalidRows,
    invalidCount: invalidRows.length,
    unknownClasses,
    warnings,
  };
}

export interface PrepareImportOptions extends Omit<BuildPreviewOptions, 'fileName' | 'kind'> {
  /** Appelé dès que les octets sont disponibles (reprise après écran recréé). */
  onBytes?: (bytes: Uint8Array) => void | Promise<void>;
  maxBytes?: number;
}

/** Prépare un aperçu à partir d'octets déjà lus (reprise comprise). */
export async function prepareImportFromBytes(bytes: Uint8Array, fileName: string, options: PrepareImportOptions): Promise<ImportPreview> {
  const kind = detectFileKind(bytes, fileName);
  let parsed: ParsedGridResult;
  let detectedKind: StudentFileKind = kind;
  if (kind === 'csv') {
    parsed = parseStudentCsvText(decodeTextBytes(bytes));
  } else {
    const workbook = await parseWorkbookBytes(bytes, kind);
    parsed = { rows: workbook.rows, invalid: workbook.invalid };
    detectedKind = workbook.kind;
  }
  return buildImportPreview(parsed.rows, { ...options, fileName, kind: detectedKind, invalidRows: parsed.invalid });
}

/** Prépare un aperçu à partir du fichier choisi par l'utilisateur. */
export async function prepareImportFromFile(file: ImportSourceFile, options: PrepareImportOptions): Promise<ImportPreview> {
  const maxBytes = options.maxBytes ?? MAX_FILE_BYTES;
  if (file.size > maxBytes) {
    throw new StudentImportError(
      `Ce fichier dépasse ${Math.round(maxBytes / (1024 * 1024))} Mo et risque de saturer la mémoire du téléphone. Ouvrez-le dans Excel, enregistrez uniquement la feuille des élèves dans un nouveau fichier (.xlsx ou .csv), puis réessayez.`,
    );
  }
  const bytes = await readFileBytes(file);
  if (options.onBytes) {
    try {
      await options.onBytes(bytes);
    } catch {
      /* La sauvegarde de secours est optionnelle : l'import continue. */
    }
  }
  return prepareImportFromBytes(bytes, file.name, options);
}
