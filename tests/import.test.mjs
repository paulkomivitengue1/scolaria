/**
 * Tests de l'import Excel/CSV de l'espace Direction.
 *
 * Exécution : npm test
 *
 * Les tests passent par le vrai composant DirectionHub (rendu en jsdom), le
 * vrai analyseur de fichiers (xlsx/csv) et IndexedDB (fake-indexeddb). Ils
 * reproduisent notamment la recréation de page d'Android : c'est ce scénario
 * qui faisait disparaître l'aperçu des élèves.
 */
import assert from 'node:assert/strict';
import { setupDom, waitFor, sleep, selectFile, textOf } from './dom.mjs';
import * as fx from './fixtures.mjs';

setupDom();
const { mountDirectionHub, studentImport, importSession } = await import('./.build/harness.mjs');

const results = [];
let currentName = '';
let failures = 0;

async function test(name, run) {
  currentName = name;
  await resetState();
  try {
    await run();
    results.push(['✅', name]);
    console.log('✅ ' + name);
  } catch (error) {
    failures += 1;
    results.push(['❌', name + ' — ' + error.message]);
    console.log('❌ ' + name + '\n   ' + (error.stack || error.message).split('\n').slice(0, 4).join('\n   '));
  }
}

// ── Utilitaires ─────────────────────────────────────────────────────────────

const EXISTING_STUDENT = {
  id: 's1', firstName: 'Fatoumata', lastName: 'Keïta', className: '5ème B',
  fees: [], parentName: '', parentPhone: '', matricule: 'M-1', sexe: 'F',
};

function props(overrides = {}) {
  return {
    schoolId: 'school-1',
    schoolName: 'École Les Palmiers',
    students: [EXISTING_STUDENT],
    classNames: fx.SCHOOL_CLASSES,
    teachers: [],
    expenses: [],
    salaryPayments: [],
    premium: true,
    onImportStudents: async () => 0,
    onNavigate: () => {},
    ...overrides,
  };
}

async function resetState() {
  document.body.innerHTML = '';
  sessionStorage.clear();
  localStorage.clear();
  try { await importSession.clearImportSession(); } catch { /* base absente */ }
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase('gestilys-import-recovery');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

async function openImportTab(container) {
  await waitFor(() => [...container.querySelectorAll('button')].some((node) => /Import élèves/.test(node.textContent || '')), { label: 'bouton Import élèves' });
  const button = [...container.querySelectorAll('button')].find((node) => /Import élèves/.test(node.textContent || ''));
  button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await waitFor(() => container.querySelector('input[type="file"]'), { label: 'champ fichier' });
}

function previewRows(container) {
  return [...container.querySelectorAll('[data-testid="import-preview"] tbody tr')];
}

function alertText(container) {
  return textOf(container.querySelector('[role="alert"]'));
}

async function mountAndOpen(overrides) {
  const app = mountDirectionHub(props(overrides));
  await openImportTab(app.container);
  return app;
}

function cells(row) {
  return [...row.querySelectorAll('td')].map((cell) => textOf(cell));
}

async function pickAndWaitPreview(container, file) {
  selectFile(container, file);
  await waitFor(() => previewRows(container).length > 0, { label: 'aperçu des élèves', timeout: 8000 });
  return previewRows(container);
}

// ── 1. Analyse des formats réels ────────────────────────────────────────────

await test('Affiche l’aperçu d’un fichier Excel propre', async () => {
  const app = await mountAndOpen();
  const rows = await pickAndWaitPreview(app.container, fx.templateWorkbook());
  assert.equal(rows.length, 3, 'trois élèves doivent être affichés');
  assert.deepEqual(cells(rows[0]).slice(0, 5), ['Aminata', 'Traoré', '6ème A', 'Mamadou Traoré', '75000000'], 'la première ligne doit être lisible');
  // 3 lignes dans le fichier, dont Fatoumata Keïta déjà inscrite dans les props de test.
  assert.match(textOf(app.container.querySelector('[data-testid="import-summary"]')), /2 à importer/);
  assert.equal(alertText(app.container), '', 'aucune erreur ne doit être affichée');
  app.unmount();
});

await test('Accepte les vraies cellules date d’Excel (nombres de série)', async () => {
  const app = await mountAndOpen();
  const rows = await pickAndWaitPreview(app.container, fx.dateCellsWorkbook());
  assert.equal(rows.length, 2);
  assert.equal(cells(rows[0])[5], '2013-04-12', 'la date doit être convertie en AAAA-MM-JJ');
  assert.equal(cells(rows[1])[5], '2012-11-02');
  app.unmount();
});

await test('Accepte un CSV exporté par Excel en Windows-1252', async () => {
  const app = await mountAndOpen();
  const rows = await pickAndWaitPreview(app.container, fx.windows1252Csv());
  assert.equal(rows.length, 1);
  assert.deepEqual(cells(rows[0]).slice(0, 3), ['Aminata', 'Traoré', '6ème A'], 'les accents doivent être décodés');
  assert.equal(cells(rows[0])[5], '2013-04-12');
  app.unmount();
});

await test('Accepte un CSV UTF-8 avec BOM', async () => {
  const app = await mountAndOpen();
  const rows = await pickAndWaitPreview(app.container, fx.utf8Csv());
  assert.equal(rows.length, 1);
  app.unmount();
});

await test('Accepte un ancien fichier .xls', async () => {
  const app = await mountAndOpen();
  const rows = await pickAndWaitPreview(app.container, fx.legacyXls());
  assert.equal(rows.length, 1);
  app.unmount();
});

await test('Lit un CSV mal nommé « .xlsx » (fréquent sur Android)', async () => {
  const app = await mountAndOpen();
  const rows = await pickAndWaitPreview(app.container, fx.mislabeledCsv());
  assert.equal(rows.length, 2);
  app.unmount();
});

await test('Trouve les en-têtes sous un titre, avec « NOM(S) » et « PRÉNOMS »', async () => {
  const app = await mountAndOpen();
  const rows = await pickAndWaitPreview(app.container, fx.titledWorkbook());
  assert.equal(rows.length, 1);
  assert.deepEqual(cells(rows[0]).slice(0, 3), ['Aminata', 'Traoré', '6ème A']);
  app.unmount();
});

// ── 2. Doublons ─────────────────────────────────────────────────────────────

await test('Un doublon dans le fichier bloque l’import et l’explique (règle de production)', async () => {
  let submitted = null;
  const app = await mountAndOpen({ onImportStudents: async (rows) => { submitted = rows; return rows.length; } });
  const rows = await pickAndWaitPreview(app.container, fx.duplicatesWorkbook());
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.map((row) => row.getAttribute('data-status')), ['ok', 'blocked', 'ok', 'blocked'],
    'doublon Aminata + Fatoumata déjà inscrite');
  assert.equal(cells(rows[1])[6], 'doublon');
  assert.equal(cells(rows[3])[6], 'déjà inscrit');
  const summary = textOf(app.container.querySelector('[data-testid="import-summary"]'));
  assert.match(summary, /2 à importer/);
  assert.match(summary, /1 déjà inscrit/);
  assert.match(summary, /1 doublon/);
  assert.match(textOf(app.container.querySelector('[data-testid="import-blocking"]')), /1 doublon\(s\) dans le fichier/);

  const confirm = [...app.container.querySelectorAll('button')].find((node) => /Confirmer/.test(node.textContent || ''));
  assert.equal(confirm.disabled, true, 'le bouton doit être bloqué tant que le doublon est présent');
  confirm.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(150);
  assert.equal(submitted, null, 'aucun envoi ne doit avoir lieu');
  app.unmount();
});

await test('Un élève déjà inscrit est ignoré, les autres sont importés', async () => {
  let submitted = null;
  const app = await mountAndOpen({ onImportStudents: async (rows) => { submitted = rows; return rows.length; } });
  const rows = await pickAndWaitPreview(app.container, fx.alreadyRegisteredWorkbook());
  assert.equal(rows.length, 2);
  assert.equal(cells(rows[0])[6], 'déjà inscrit');
  const confirm = [...app.container.querySelectorAll('button')].find((node) => /Confirmer/.test(node.textContent || ''));
  assert.equal(confirm.disabled, false);
  assert.match(textOf(confirm), /Confirmer l’import de 1 élève/);
  confirm.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await waitFor(() => submitted, { label: 'appel onImportStudents' });
  assert.deepEqual(submitted.map((row) => row.firstName), ['Moussa']);
  app.unmount();
});

await test('Un double appui sur « Confirmer » ne lance qu’un seul import', async () => {
  let calls = 0;
  const app = await mountAndOpen({ onImportStudents: async (rows) => { calls += 1; await sleep(150); return rows.length; } });
  await pickAndWaitPreview(app.container, fx.templateWorkbook());
  const confirm = [...app.container.querySelectorAll('button')].find((node) => /Confirmer/.test(node.textContent || ''));
  confirm.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  confirm.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await waitFor(() => calls > 0, { label: 'premier import' });
  await sleep(400);
  assert.equal(calls, 1, 'un seul appel à onImportStudents');
  app.unmount();
});

await test('Après un import réussi, l’aperçu et la reprise automatique sont effacés', async () => {
  const app = await mountAndOpen({ students: [], onImportStudents: async (rows) => rows.length });
  await pickAndWaitPreview(app.container, fx.templateWorkbook());
  const confirm = [...app.container.querySelectorAll('button')].find((node) => /Confirmer/.test(node.textContent || ''));
  confirm.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await waitFor(() => previewRows(app.container).length === 0, { label: 'aperçu vidé' });
  assert.match(textOf(app.container.querySelector('[role="status"]')), /3 élève\(s\) importé/);
  assert.equal(await importSession.loadImportSnapshot(), null, 'aucun aperçu mémorisé');
  assert.equal(await importSession.loadImportFileBytes(), null, 'aucun fichier mémorisé');
  app.unmount();
});

// ── 3. Erreurs explicites ───────────────────────────────────────────────────

await test('Détecte le séparateur CSV même avec une ligne de titre contenant des virgules', async () => {
  assert.equal(studentImport.parseStudentCsv('Rentrée 2026, école Les Palmiers\r\nPrénom;Nom;Classe\r\nAminata;Traoré;6ème A\r\n').rows.length, 1);
});

await test('Signale une classe inconnue et bloque l’import', async () => {
  const app = await mountAndOpen();
  selectFile(app.container, fx.unknownClassWorkbook());
  await waitFor(() => app.container.querySelector('[data-testid="import-summary"]'), { label: 'aperçu' });
  const summary = textOf(app.container.querySelector('[data-testid="import-summary"]'));
  assert.match(summary, /1 classe\(s\) inconnue\(s\)/);
  const confirm = [...app.container.querySelectorAll('button')].find((node) => /Confirmer/.test(node.textContent || ''));
  assert.equal(confirm.disabled, true, 'aucune ligne importable : le bouton doit être désactivé');
  assert.match(textOf(app.container), /Terminale C/, 'la classe fautive est nommée');
  app.unmount();
});

await test('Une classe inconnue bloque tout le fichier et l’explique (règle de production)', async () => {
  let submitted = null;
  const app = await mountAndOpen({ students: [], onImportStudents: async (rows) => { submitted = rows; return rows.length; } });
  const rows = await pickAndWaitPreview(app.container, fx.mixedClassWorkbook());
  assert.deepEqual(rows.map((row) => row.getAttribute('data-status')), ['ok', 'blocked']);
  assert.equal(cells(rows[1])[6], 'classe inconnue');
  assert.match(textOf(app.container.querySelector('[data-testid="import-summary"]')), /1 classe\(s\) inconnue\(s\)/);
  const blocking = textOf(app.container.querySelector('[data-testid="import-blocking"]'));
  assert.match(blocking, /Terminale C/, 'la classe fautive doit être nommée');
  assert.match(blocking, /Aucun élève de ce fichier ne sera enregistré/);
  const confirm = [...app.container.querySelectorAll('button')].find((node) => /Confirmer/.test(node.textContent || ''));
  assert.equal(confirm.disabled, true);
  confirm.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(150);
  assert.equal(submitted, null);
  app.unmount();
});

await test('Liste les lignes incomplètes et bloque l’import (règle de production)', async () => {
  let submitted = null;
  const app = await mountAndOpen({ students: [], onImportStudents: async (rows) => { submitted = rows; return rows.length; } });
  await pickAndWaitPreview(app.container, fx.partlyInvalidWorkbook());
  assert.equal(previewRows(app.container).length, 1, 'une seule ligne complète');
  const invalid = textOf(app.container.querySelector('[data-testid="import-invalid"]'));
  assert.match(invalid, /ligne 3 : Classe manquante/);
  assert.match(invalid, /ligne 4 : Date de naissance invalide/);
  assert.match(textOf(app.container.querySelector('[data-testid="import-blocking"]')), /2 ligne\(s\) incomplète\(s\)/);
  const confirm = [...app.container.querySelectorAll('button')].find((node) => /Confirmer/.test(node.textContent || ''));
  assert.equal(confirm.disabled, true);
  confirm.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(150);
  assert.equal(submitted, null, 'rien ne doit être importé partiellement');
  app.unmount();
});

await test('Explique l’absence d’en-têtes au lieu d’afficher un aperçu vide', async () => {
  const app = await mountAndOpen();
  selectFile(app.container, fx.headerlessWorkbook());
  await waitFor(() => app.container.querySelector('[data-testid="import-error"]'), { label: 'message d’erreur' });
  const message = alertText(app.container);
  assert.match(message, /en-têtes/);
  assert.match(message, /Prénom/);
  app.unmount();
});

await test('Signale un fichier Excel corrompu', async () => {
  const app = await mountAndOpen();
  selectFile(app.container, fx.corruptedWorkbook());
  await waitFor(() => app.container.querySelector('[data-testid="import-error"]'), { label: 'message d’erreur' });
  assert.match(alertText(app.container), /illisible/);
  app.unmount();
});

// ── 4. Reprise après recréation de la page (Android) ────────────────────────

await test('Réaffiche l’aperçu après recréation de l’écran (sans relire le fichier)', async () => {
  const app = await mountAndOpen();
  await pickAndWaitPreview(app.container, fx.templateWorkbook());
  app.unmount();
  document.body.innerHTML = '';

  const app2 = mountDirectionHub(props());
  await waitFor(() => previewRows(app2.container).length > 0, { label: 'aperçu restauré', timeout: 8000 });
  const rows = previewRows(app2.container);
  assert.equal(rows.length, 3, 'les 3 élèves doivent réapparaître');
  assert.deepEqual(cells(rows[0]).slice(0, 3), ['Aminata', 'Traoré', '6ème A']);
  assert.equal(alertText(app2.container), '');
  // L'onglet Import doit être ouvert automatiquement.
  assert.ok(app2.container.querySelector('input[type="file"]'), 'l’onglet Import doit être affiché');
  app2.unmount();
});

await test('Reprend l’analyse depuis les octets mémorisés si la page a été tuée pendant l’analyse', async () => {
  // Simule Android : le fichier a été choisi et enregistré, mais la page a été
  // recréée avant la fin de l'analyse (aucun aperçu mémorisé).
  const file = fx.templateWorkbook();
  const bytes = new Uint8Array(await file.arrayBuffer());
  await importSession.saveImportFileBytes({ name: file.name, type: file.type, lastModified: 1, bytes });

  const app = mountDirectionHub(props());
  await waitFor(() => previewRows(app.container).length > 0, { label: 'aperçu repris', timeout: 8000 });
  assert.equal(previewRows(app.container).length, 3);
  assert.deepEqual(cells(previewRows(app.container)[0]).slice(0, 3), ['Aminata', 'Traoré', '6ème A']);
  app.unmount();
});

await test('Un nouveau fichier illisible conserver l’aperçu précédent et l’explique', async () => {
  const app = await mountAndOpen();
  await pickAndWaitPreview(app.container, fx.templateWorkbook());
  const before = previewRows(app.container).length;
  assert.ok(before > 0);

  selectFile(app.container, fx.headerlessWorkbook());
  await waitFor(() => app.container.querySelector('[data-testid="import-error"]'), { label: 'erreur du nouveau fichier' });
  assert.equal(previewRows(app.container).length, before, 'l’aperçu valide doit rester affiché');
  assert.match(alertText(app.container), /en-têtes/);
  assert.match(textOf(app.container), /aperçu du fichier « eleves.xlsx » est conservé/i);
  // Le bouton de confirmation reste disponible pour le fichier conservé.
  const confirm = [...app.container.querySelectorAll('button')].find((node) => /Confirmer/.test(node.textContent || ''));
  assert.equal(confirm.disabled, false);
  app.unmount();
});

await test('L’erreur s’affiche DANS le panneau d’aperçu (visible sur téléphone)', async () => {
  const app = await mountAndOpen();
  selectFile(app.container, fx.corruptedWorkbook());
  await waitFor(() => app.container.querySelector('[data-testid="import-error"]'), { label: 'message d’erreur' });
  const panel = app.container.querySelector('[data-testid="import-preview-panel"]');
  assert.ok(panel, 'le panneau d’aperçu doit exister');
  assert.ok(panel.querySelector('[data-testid="import-error"] > p'), 'l’erreur doit être dans le panneau, pas seulement en haut de page');
  assert.match(textOf(panel.querySelector('[data-testid="import-error"]')), /illisible/);
  app.unmount();
});

await test('Sur téléphone, l’écran défile vers le résultat après l’analyse', async () => {
  let scrolled = 0;
  const originalMatchMedia = window.matchMedia;
  const originalScroll = window.HTMLElement.prototype.scrollIntoView;
  window.matchMedia = (query) => ({
    matches: query.includes('max-width: 1023px'),
    media: query, onchange: null, addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
  });
  window.HTMLElement.prototype.scrollIntoView = function () { scrolled += 1; };
  try {
    const app = await mountAndOpen();
    await pickAndWaitPreview(app.container, fx.templateWorkbook());
    assert.ok(scrolled > 0, 'scrollIntoView doit être appelé sur mobile après l’aperçu');
    app.unmount();
  } finally {
    window.matchMedia = originalMatchMedia;
    window.HTMLElement.prototype.scrollIntoView = originalScroll;
  }
});

await test('Affiche une consigne si le sélecteur Android ne renvoie aucun fichier', async () => {
  const app = await mountAndOpen();
  const input = app.container.querySelector('input[type="file"]');
  input.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  window.dispatchEvent(new window.Event('focus'));
  await waitFor(() => app.container.querySelector('[data-testid="import-hint"]'), { label: 'consigne du sélecteur', timeout: 6000 });
  assert.match(textOf(app.container.querySelector('[data-testid="import-hint"]')), /Aucun fichier n’a été reçu/);
  app.unmount();
});

await test('Le fichier est mémorisé avant lecture et ne corrompt jamais l’analyse', async () => {
  // Une page tuée PENDANT la lecture ne laisse que le fichier, pas les octets.
  const file = fx.templateWorkbook();
  await importSession.clearImportSession();
  const stored = await importSession.saveFileHandle(file);
  assert.equal(stored, true, 'l’enregistrement du fichier doit être tenté au moment du choix');
  assert.equal(await importSession.loadImportFileBytes(), null, 'aucun octet enregistré');

  // LIMITE DE SIMULATION : fake-indexeddb + jsdom ne restituent pas fidèlement
  // un objet File (Chrome le fait nativement). Si le fichier relu n'est pas un
  // vrai Blob, la reprise doit être abandonnée proprement — jamais analyser des
  // données corrompues, jamais rester bloqué sur « Vérification… ».
  const restored = await importSession.loadFileHandle();
  const app = mountDirectionHub(props());
  if (restored) {
    await waitFor(() => previewRows(app.container).length > 0 || app.container.querySelector('[data-testid="import-error"]'),
      { label: 'résultat de la reprise', timeout: 8000 });
    if (previewRows(app.container).length) {
      assert.deepEqual(cells(previewRows(app.container)[0]).slice(0, 3), ['Aminata', 'Traoré', '6ème A']);
    } else {
      assert.match(textOf(app.container), /n’a pas pu|conservé|Aucun fichier/);
    }
  } else {
    // Aucune reprise possible : l'écran doit rester utilisable et ne rien inventer.
    await sleep(300);
    await openImportTab(app.container);
    await waitFor(() => !/Vérification d’un import précédent/.test(textOf(app.container)), { label: 'fin de la vérification', timeout: 8000 });
    assert.equal(previewRows(app.container).length, 0, 'aucun aperçu ne doit être inventé');
    assert.match(textOf(app.container), /Aucun fichier sélectionné/);
  }
  app.unmount();
});

await test('Garde-fou : la reprise automatique s’arrête après 2 tentatives', async () => {
  const file = fx.corruptedWorkbook();
  const bytes = new Uint8Array(await file.arrayBuffer());
  await importSession.clearImportSession();
  await importSession.saveImportFileBytes({ name: file.name, type: file.type, lastModified: 1, bytes });
  const signature = `${file.name}|${bytes.byteLength}`;
  for (let i = 0; i < 3; i += 1) await importSession.noteAnalysisAttempt(signature);

  const app = mountDirectionHub(props());
  await waitFor(() => /reprise automatique s’est arrêtée/i.test(textOf(app.container)), { label: 'message de garde-fou', timeout: 8000 });
  assert.match(textOf(app.container), /après 2 tentatives/);
  assert.equal(app.container.querySelector('[data-testid="import-preview"]'), null, 'aucun aperçu ne doit être inventé');
  app.unmount();
});

await test('Le journal de diagnostic enregistre les étapes sans donnée d’élève', async () => {
  const app = await mountAndOpen();
  await pickAndWaitPreview(app.container, fx.templateWorkbook());
  const journal = textOf(app.container.querySelector('[data-testid="import-diagnostics"]'));
  assert.match(journal, /fichier choisi/);
  assert.match(journal, /octets lus/);
  assert.match(journal, /aperçu prêt/);
  assert.match(journal, /eleves\.xlsx/);
  assert.doesNotMatch(journal, /Aminata|Traoré|75000000/, 'aucune donnée d’élève ne doit être journalisée');
  app.unmount();
});

// ── 5. Analyse pure (module studentImport) ─────────────────────────────────

await test('Normalise les dates, téléphones et noms', async () => {
  assert.equal(studentImport.normalizeBirthDate('12/04/2013'), '2013-04-12');
  assert.equal(studentImport.normalizeBirthDate('2013-04-12'), '2013-04-12');
  assert.equal(studentImport.normalizeBirthDate(41376), '2013-04-12');
  assert.equal(studentImport.normalizeBirthDate(20130412), '2013-04-12');
  assert.equal(studentImport.normalizeBirthDate(''), '');
  assert.throws(() => studentImport.normalizeBirthDate('32/13/2013'), /Date de naissance invalide/);
  // Règle de production conservée : la mise en forme du téléphone n'est pas modifiée.
  assert.equal(studentImport.normalizePhone('75 00 00 00'), '75 00 00 00');
  assert.equal(studentImport.normalizePhone('+223 75-00-00-00'), '+223 75-00-00-00');
  assert.equal(studentImport.normalizePhone('0750000001'), '0750000001', 'le zéro initial est préservé');
  assert.equal(studentImport.studentDuplicateKey({ firstName: ' Aminata ', lastName: 'TRAORE', className: '6e A' }),
    studentImport.studentDuplicateKey({ firstName: 'aminata', lastName: 'Traoré', className: '6ème A' }));
});

await test('Refuse une colonne unique « Nom et prénom » avec un message actionnable', async () => {
  assert.throws(
    () => studentImport.parseStudentGrid([['Nom et prénom', 'Classe'], ['Traoré Aminata', '6ème A']]),
    /Séparez-la en deux colonnes/,
  );
});

await test('Signale les lignes incomplètes sans bloquer les autres', async () => {
  const parsed = studentImport.parseStudentGrid([
    ['Prénom', 'Nom', 'Classe'],
    ['Aminata', 'Traoré', '6ème A'],
    ['Moussa', '', '6ème A'],
    ['', 'Diarra', ''],
  ]);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.invalid.length, 2);
  assert.equal(parsed.invalid[0].lineNumber, 3);
  assert.match(parsed.invalid[1].reason, /Prénom, Classe manquants/);
});

await test('Détecte le format par les octets, pas par l’extension', async () => {
  const xlsx = new Uint8Array(await fx.templateWorkbook().arrayBuffer());
  assert.equal(studentImport.detectFileKind(xlsx, 'eleves.csv'), 'xlsx');
  assert.equal(studentImport.detectFileKind(new TextEncoder().encode('a;b'), 'eleves.xlsx'), 'csv');
  const xls = new Uint8Array(await fx.legacyXls().arrayBuffer());
  assert.equal(studentImport.detectFileKind(xls, 'eleves.xlsx'), 'xls');
});

// ── Résumé ─────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(60));
const failed = results.filter(([flag]) => flag === '❌');
console.log(`${results.length - failed.length}/${results.length} tests réussis`);
console.log('process.exit(' + (failures ? 1 : 0) + ')');
if (failures) {
  console.log('\nÉchecs :');
  for (const [, label] of failed) console.log(' - ' + label);
  process.exit(1);
}
