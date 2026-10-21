import { useMemo, useState } from 'react';
import { FileSpreadsheet, Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface ImportedStudentRow {
  firstName: string;
  lastName: string;
  className: string;
  parentName: string;
  parentPhone: string;
  birthDate?: string;
  birthPlace?: string;
  matricule: string;
  sexe: 'M' | 'F';
}

interface Props {
  open: boolean;
  classNames: string[];
  onClose: () => void;
  onImport: (rows: ImportedStudentRow[]) => Promise<void>;
}

const normalize = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase('fr')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

function pick(row: Record<string, unknown>, aliases: string[]) {
  const keys = Object.keys(row);
  const found = keys.find(key => aliases.includes(normalize(key)));
  return found ? String(row[found] ?? '').trim() : '';
}

function dateValue(value: unknown, xlsx: typeof import('xlsx')): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    const parsed = xlsx.SSF.parse_date_code(value);
    if (parsed) return [parsed.y, String(parsed.m).padStart(2, '0'), String(parsed.d).padStart(2, '0')].join('-');
  }
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^\d{4,5}(\.\d+)?$/.test(raw)) { const parsed = xlsx.SSF.parse_date_code(Number(raw)); if (parsed) return [parsed.y, String(parsed.m).padStart(2, '0'), String(parsed.d).padStart(2, '0')].join('-'); }
  const dmy = raw.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return raw;
}

export function BulkStudentImportModal({ open, classNames, onClose, onImport }: Props) {
  const [rows, setRows] = useState<ImportedStudentRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const validRows = useMemo(() => rows.filter(r => r.firstName.trim() && r.lastName.trim() && r.className.trim()), [rows]);

  if (!open) return null;

  const readFile = async (file?: File) => {
    if (!file) return;
    setError('');
    setFileName(file.name);
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error('Le fichier ne contient aucune feuille.');
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true });
      if (!data.length) throw new Error('Aucun élève trouvé. La première ligne doit contenir les titres des colonnes.');
      const parsed = data.map(r => {
        const fullName = pick(r, ['nomcomplet', 'eleve', 'nomdeleve', 'studentname']);
        const firstName = pick(r, ['prenom', 'prenoms', 'firstname', 'givenname']) || (fullName ? fullName.split(/\s+/).slice(0, -1).join(' ') : '');
        const lastName = pick(r, ['nom', 'lastname', 'surname', 'nomdefamille']) || (fullName ? fullName.split(/\s+/).slice(-1)[0] : '');
        const rawSex = normalize(pick(r, ['sexe', 'sex', 'genre']));
        const className = pick(r, ['classe', 'class', 'niveau', 'section']);
        return {
          firstName, lastName, className,
          parentName: pick(r, ['nomparent', 'parent', 'nomdututeur', 'tuteur', 'responsable']),
          parentPhone: pick(r, ['telephoneparent', 'numeroparent', 'telparent', 'telephone', 'phone', 'contact']),
          birthDate: dateValue(pick(r, ['datenaissance', 'naissance', 'birthdate', 'dateofbirth']), XLSX),
          birthPlace: pick(r, ['lieunaissance', 'lieudenaissance', 'birthplace']),
          matricule: pick(r, ['matricule', 'matriculation', 'numeroeleve', 'identifiant']),
          sexe: (['f', 'feminin', 'femme', 'female'].includes(rawSex) ? 'F' : 'M') as 'M' | 'F',
        } satisfies ImportedStudentRow;
      }).filter(r => r.firstName || r.lastName || r.className);
      if (!parsed.length) throw new Error('Aucune ligne d’élève exploitable trouvée.');
      setRows(parsed);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : 'Impossible de lire ce fichier.');
    }
  };

  const updateRow = (index: number, key: keyof ImportedStudentRow, value: string) => {
    setRows(old => old.map((row, i) => i === index ? { ...row, [key]: value } : row));
  };

  const submit = async () => {
    if (!validRows.length) { setError('Ajoute au moins un élève avec prénom, nom et classe.'); return; }
    setBusy(true); setError('');
    try { await onImport(validRows); setRows([]); setFileName(''); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'L’import a échoué. Vérifie le fichier puis réessaie.'); }
    finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
    <section className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
      <header className="flex items-center justify-between bg-gradient-to-r from-royal-800 to-blue-700 px-5 py-4 text-white">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><FileSpreadsheet className="h-6 w-6"/></span><div><h2 className="text-lg font-extrabold">Importer une liste d’élèves</h2><p className="text-sm text-blue-100">Excel, CSV · jusqu’à 100 élèves par lot</p></div></div>
        <button onClick={onClose} disabled={busy} aria-label="Fermer" className="rounded-xl p-2 hover:bg-white/15"><X className="h-5 w-5"/></button>
      </header>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 px-4 py-6 text-center transition hover:border-blue-400 hover:bg-blue-100">
          <Upload className="h-7 w-7 text-blue-700"/><span className="font-bold text-blue-950">Choisir un fichier Excel ou CSV</span><span className="text-xs text-blue-800">La première ligne doit contenir les titres des colonnes. Seule la première feuille Excel sera lue.</span>
          <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={e => void readFile(e.target.files?.[0])}/>
        </label>
        {fileName && <p className="text-sm font-semibold text-slate-700">{fileName} · {rows.length} ligne(s) reconnue(s)</p>}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><strong>À savoir :</strong> prénom, nom et classe sont nécessaires. Le numéro du parent, le sexe, la matricule et les dates peuvent être complétés ou corrigés dans le tableau avant l’import ou depuis la fiche de l’élève après.</div>
        {rows.length > 0 && <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr>{['Prénom','Nom','Classe','Téléphone parent','Sexe','Matricule','État'].map(h=><th key={h} className="px-3 py-2">{h}</th>)}</tr></thead><tbody>{rows.slice(0, 12).map((r,i)=><tr key={i} className="border-t border-slate-100"><td className="px-2 py-2"><input value={r.firstName} onChange={e=>updateRow(i,'firstName',e.target.value)} className="w-32 rounded-lg border border-slate-200 px-2 py-1.5 text-slate-900"/></td><td className="px-2 py-2"><input value={r.lastName} onChange={e=>updateRow(i,'lastName',e.target.value)} className="w-32 rounded-lg border border-slate-200 px-2 py-1.5 text-slate-900"/></td><td className="px-2 py-2"><select value={r.className} onChange={e=>updateRow(i,'className',e.target.value)} className="w-40 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-900"><option value="">Choisir…</option>{classNames.map(c=><option key={c} value={c}>{c}</option>)}{r.className && !classNames.includes(r.className) && <option value={r.className}>{r.className} (fichier)</option>}</select></td><td className="px-2 py-2"><input value={r.parentPhone} onChange={e=>updateRow(i,'parentPhone',e.target.value)} className="w-36 rounded-lg border border-slate-200 px-2 py-1.5 text-slate-900"/></td><td className="px-2 py-2"><select value={r.sexe} onChange={e=>updateRow(i,'sexe',e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-900"><option value="M">M</option><option value="F">F</option></select></td><td className="px-2 py-2"><input value={r.matricule} onChange={e=>updateRow(i,'matricule',e.target.value)} className="w-32 rounded-lg border border-slate-200 px-2 py-1.5 text-slate-900"/></td><td className="px-3 py-2">{r.firstName.trim() && r.lastName.trim() && r.className.trim() ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-4 w-4"/> Prêt</span> : <span className="inline-flex items-center gap-1 text-red-700"><AlertCircle className="h-4 w-4"/> À corriger</span>}</td></tr>)}</tbody></table></div>}
        {rows.length > 12 && <p className="text-xs text-slate-600">Aperçu des 12 premières lignes ; les {rows.length} élèves seront importés si leurs champs obligatoires sont renseignés.</p>}
        {rows.length > 0 && <p className="text-sm font-semibold text-slate-700">{validRows.length} élève(s) prêt(s) sur {rows.length}</p>}
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
      </div>
      <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row sm:justify-between"><button onClick={onClose} disabled={busy} className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700">Annuler</button><button onClick={submit} disabled={busy || validRows.length===0} className="rounded-xl bg-blue-700 px-5 py-3 font-extrabold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Importation…' : `Importer ${validRows.length} élève(s)`}</button></footer>
    </section>
  </div>;
}
