import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import * as XLSX from 'xlsx';

const sourcePath = resolve('src/lib/studentImport.ts');
const outputPath = resolve('tests/.build/studentImport.mjs');
await mkdir(dirname(outputPath), { recursive: true });
const source = await readFile(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  },
}).outputText;
await writeFile(outputPath, compiled, 'utf8');
const importer = await import(pathToFileURL(outputPath).href);

const tests = [];
function test(name, run) {
  tests.push({ name, run });
}

test('Reconnaît les en-têtes français sous une ligne de titre', () => {
  const result = importer.parseStudentGrid([
    ['Liste officielle des élèves'],
    ['NOM(S)', 'PRÉNOMS', 'Classe fréquentée', 'Nom du parent', 'Téléphone du parent', 'Date naissance'],
    ['Traoré', 'Aminata', '6ème A', 'Mamadou Traoré', '75000000', 41376],
  ]);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].firstName, 'Aminata');
  assert.equal(result.rows[0].lastName, 'Traoré');
  assert.equal(result.rows[0].className, '6ème A');
  assert.equal(result.rows[0].birthDate, '2013-04-12');
});

test('Décode correctement les CSV Windows-1252 avec accents', () => {
  const bytes = new Uint8Array(Buffer.from(
    'Prénom;Nom;Classe;Téléphone parent\\r\\nAminata;Traoré;6ème A;75000000',
    'latin1',
  ));
  const result = importer.parseStudentCsv(bytes);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].firstName, 'Aminata');
  assert.equal(result.rows[0].lastName, 'Traoré');
  assert.equal(result.rows[0].className, '6ème A');
});

test('Normalise les dates Excel et rejette les dates impossibles', () => {
  assert.equal(importer.normalizeBirthDate(41376), '2013-04-12');
  assert.equal(importer.normalizeBirthDate('12/04/2013'), '2013-04-12');
  assert.throws(() => importer.normalizeBirthDate('31/02/2013'), /Date de naissance invalide/);
});

test('Détecte les doublons en ignorant casse, accents et espaces', () => {
  const parsed = importer.parseStudentGrid([
    ['Prénom', 'Nom', 'Classe'],
    ['Aminata', 'Traoré', '6ème A'],
    [' aminata ', 'TRAORE', '6e A'],
  ]);
  const preview = importer.buildImportPreview(parsed.rows, { classNames: ['6ème A'] });
  assert.equal(preview.rows.length, 2);
  assert.equal(preview.duplicateInFileCount, 1);
  assert.equal(preview.importableCount, 1);
});

test('N’importe pas une classe inconnue ni un élève déjà inscrit', () => {
  const parsed = importer.parseStudentGrid([
    ['Prénom', 'Nom', 'Classe'],
    ['Fatoumata', 'Keïta', '5ème B'],
    ['Aminata', 'Traoré', 'Classe inexistante'],
  ]);
  const preview = importer.buildImportPreview(parsed.rows, {
    classNames: ['5ème B'],
    existingStudents: [{ firstName: 'Fatoumata', lastName: 'Keïta', className: '5ème B' }],
  });
  assert.equal(preview.alreadyRegisteredCount, 1);
  assert.deepEqual(preview.unknownClasses, ['Classe inexistante']);
  assert.equal(preview.importableCount, 0);
});

test('Détecte le format réel par les octets, même si le nom de fichier est faux', () => {
  assert.equal(importer.detectFileKind(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), 'liste.csv'), 'xlsx');
  assert.equal(importer.detectFileKind(new Uint8Array(Buffer.from('Prénom;Nom;Classe')), 'liste.xlsx'), 'csv');
});

test('Lit un vrai classeur XLSX avec aperçu contrôlable', async () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Prénom', 'Nom', 'Classe', 'Date naissance'],
    ['Aminata', 'Traoré', '6ème A', 41376],
  ]), 'Élèves');
  const bytes = new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
  const preview = await importer.prepareImportFromBytes(bytes, 'liste.xlsx', { classNames: ['6ème A'] });
  assert.equal(preview.importableCount, 1);
  assert.equal(preview.importableRows[0].birthDate, '2013-04-12');
});

let failures = 0;
for (const { name, run } of tests) {
  try {
    await run();
    console.log('PASS ' + name);
  } catch (error) {
    failures += 1;
    console.error('FAIL ' + name + '\\n' + (error?.stack || error));
  }
}
console.log('\\n' + (tests.length - failures) + '/' + tests.length + ' tests réussis');
if (failures) process.exitCode = 1;
