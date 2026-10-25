/**
 * Fixtures used by the import tests. They mimic the files a school actually
 * provides: Excel workbook with real date cells, CSV exported by Excel on
 * Windows (CP1252), a .xls file, and broken files.
 */
import * as XLSX from 'xlsx';

export const HEADERS = ['Prénom', 'Nom', 'Classe', 'Parent', 'Téléphone parent', 'Date naissance', 'Lieu naissance', 'Sexe'];
export const SCHOOL_CLASSES = ['6ème A', '5ème B'];

function workbookToBytes(workbook, bookType = 'xlsx') {
  return new Uint8Array(XLSX.write(workbook, { type: 'array', bookType, cellDates: true }));
}

function sheetFromRows(rows, options = {}) {
  return XLSX.utils.aoa_to_sheet(rows, options);
}

/** Clean workbook built like the downloadable Gestilys template. */
export function templateWorkbook(filename = 'eleves.xlsx') {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheetFromRows([
    HEADERS,
    ['Aminata', 'Traoré', '6ème A', 'Mamadou Traoré', '75000000', '2013-04-12', 'Bamako', 'F'],
    ['Moussa', 'Diarra', '6ème A', 'Fanta Diarra', '66000000', '2012-11-02', 'Ségou', 'M'],
    ['Fatoumata', 'Keïta', '5ème B', '', '', '', '', 'F'],
  ]), 'Élèves');
  return new File([workbookToBytes(workbook)], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** Workbook where the "Date naissance" cells are real Excel date cells. */
export function dateCellsWorkbook(filename = 'eleves-dates.xlsx') {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheetFromRows([
    HEADERS,
    ['Aminata', 'Traoré', '6ème A', 'Mamadou Traoré', 75000000, new Date(2013, 3, 12), 'Bamako', 'F'],
    ['Moussa', 'Diarra', '6ème A', '', '', new Date(2012, 10, 2), '', 'M'],
  ], { cellDates: true }), 'Liste');
  return new File([workbookToBytes(workbook)], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** Workbook whose extension is wrong (a CSV renamed .xlsx) — common on Android. */
export function mislabeledCsv(filename = 'eleves.xlsx') {
  const csv = ['Prénom;Nom;Classe', 'Aminata;Traoré;6ème A', 'Moussa;Diarra;5ème B'].join('\r\n');
  return new File([new TextEncoder().encode(csv)], filename, { type: '' });
}

/** CSV as exported by Excel FR on Windows: Windows-1252 bytes, ";" separator. */
export function windows1252Csv(filename = 'eleves.csv') {
  const text = [HEADERS.join(';'), 'Aminata;Traoré;6ème A;Mamadou Traoré;75000000;12/04/2013;Bamako;F'].join('\r\n');
  const bytes = new Uint8Array([...text].map((char) => char.charCodeAt(0))); // é = 0xE9
  return new File([bytes], filename, { type: 'text/csv' });
}

export function utf8Csv(filename = 'eleves.csv') {
  const text = [HEADERS.join(';'), 'Aminata;Traoré;6ème A;Mamadou Traoré;75000000;12/04/2013;Bamako;F'].join('\r\n');
  return new File([new TextEncoder().encode('\uFEFF' + text)], filename, { type: 'text/csv' });
}

export function legacyXls(filename = 'eleves.xls') {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheetFromRows([HEADERS, ['Aminata', 'Traoré', '6ème A', '', '', '', '', 'F']]), 'Eleves');
  return new File([workbookToBytes(workbook, 'biff8')], filename, { type: 'application/vnd.ms-excel' });
}

/** Workbook with a title row above the header row. */
export function titledWorkbook(filename = 'liste.xlsx') {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheetFromRows([
    ['École Les Palmiers — Liste des élèves 2026-2027'],
    [],
    ['PRÉNOMS', 'NOM(S)', 'CLASSE', 'PARENT', 'TÉLÉPHONE'],
    ['Aminata', 'Traoré', '6ème A', 'Mamadou Traoré', '75000000'],
  ]), 'Liste');
  return new File([workbookToBytes(workbook)], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** Duplicates inside the file + a row already registered in the school. */
export function duplicatesWorkbook(filename = 'doublons.xlsx') {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheetFromRows([
    ['Prénom', 'Nom', 'Classe'],
    ['Aminata', 'Traoré', '6ème A'],
    ['aminata', 'TRAORE', '6ème A'],
    ['Moussa', 'Diarra', '6ème A'],
    ['Fatoumata', 'Keïta', '5ème B'],
  ]), 'Élèves');
  return new File([workbookToBytes(workbook)], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** Workbook with an unknown class. */
export function unknownClassWorkbook(filename = 'classe-inconnue.xlsx') {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheetFromRows([
    ['Prénom', 'Nom', 'Classe'],
    ['Aminata', 'Traoré', 'Terminale C'],
  ]), 'Élèves');
  return new File([workbookToBytes(workbook)], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** One row in a configured class, one row in an unknown class. */
export function mixedClassWorkbook(filename = 'classes-mixtes.xlsx') {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheetFromRows([
    ['Prénom', 'Nom', 'Classe'],
    ['Aminata', 'Traoré', '6ème A'],
    ['Ibrahim', 'Coulibaly', 'Terminale C'],
  ]), 'Élèves');
  return new File([workbookToBytes(workbook)], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** One complete row, one row missing the class, one row with a broken date. */
export function partlyInvalidWorkbook(filename = 'lignes-incompletes.xlsx') {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheetFromRows([
    ['Prénom', 'Nom', 'Classe', 'Date naissance'],
    ['Aminata', 'Traoré', '6ème A', '2013-04-12'],
    ['Moussa', 'Diarra', '', ''],
    ['Fanta', 'Cissé', '6ème A', 'pas une date'],
  ]), 'Élèves');
  return new File([workbookToBytes(workbook)], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** No usable header row. */
export function headerlessWorkbook(filename = 'sans-entetes.xlsx') {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheetFromRows([
    ['Aminata', 'Traoré', '6ème A'],
    ['Moussa', 'Diarra', '6ème A'],
  ]), 'Feuil1');
  return new File([workbookToBytes(workbook)], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** Corrupted Excel file (right extension, unreadable content). */
export function corruptedWorkbook(filename = 'casse.xlsx') {
  return new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05])], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
