import { useState } from 'react';
import { Upload, FileSpreadsheet, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export interface ImportedStudentRow {
  firstName: string;
  lastName: string;
  className: string;
  parentName: string;
  parentPhone: string;
  birthDate: string;
  birthPlace: string;
  matricule: string;
  sexe: 'M' | 'F';
}

interface Props {
  open: boolean;
  classNames: string[];
  onClose: () => void;
  onImport: (rows: ImportedStudentRow[]) => Promise<void>;
}

const normalize = (value: unknown) => String(value ?? '').trim();
const key = (value: unknown) => normalize(value).toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

function getCell(row: Record<string, unknown>, aliases: string[]) {
  const entries = Object.entries(row);
  const found = entries.find(([name]) => aliases.includes(key(name)));
  return found ? normalize(found[1]) : '';
}

export function BulkStudentImport({ open, classNames, onClose, onImport }: Props) {
  const [rows, setRows] = useState<ImportedStudentRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const readFile = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error('Le fichier ne contient aucune feuille.');
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
      if (!raw.length) throw new Error('Aucune ligne d’élève trouvée. La première ligne doit contenir les titres des colonnes.');
      const mapped = raw.map((r) => {
        const sex = getCell(r, ['sexe', 'sex', 'genre']).toLocaleLowerCase();
        const birthDate = getCell(r, ['datedenaissance', 'naissance', 'birthdate']);
        return {
          firstName: getCell(r, ['prenom', 'prenoms', 'firstname', 'givenname']),
          lastName: getCell(r, ['nom', 'nomdefamille', 'lastname', 'surname']),
          className: getCell(r, ['classe', 'class', 'niveau']) || classNames[0] || '',
          parentName: getCell(r, ['nomparent', 'parent', 'nomdututeur', 'tuteur', 'responsable']),
          parentPhone: getCell(r, ['telephoneparent', 'telephone', 'tel', 'whatsapp', 'numeroparent', 'parentphone']),
          birthDate,
          birthPlace: getCell(r, ['lieudenaissance', 'lieunaissance', 'birthplace']),
          matricule: getCell(r, ['matricule', 'matriculenational', 'numeroeleve', 'codeeleve']),
          sexe: (['f', 'fille', 'feminin', 'féminin'].includes(sex) ? 'F' : 'M') as 'M' | 'F',
        };
      }).filter(r => r.firstName || r.lastName);
      if (!mapped.length) throw new Error('Aucun nom ou prénom reconnu. Vérifiez les titres des colonnes.');
      const missing = mapped.filter(r => !r.firstName || !r.lastName || !r.className).length;
      setRows(mapped);
      setFileName(file.name);
      if (missing) setError(missing + ' ligne(s) n’ont pas de prénom, de nom ou de classe. Corrigez le fichier Excel puis importez-le à nouveau.');
    } catch (e) {
      setRows([]);
      setFileName('');
      setError(e instanceof Error ? e.message : 'Impossible de lire ce fichier.');
    }
  };

  const submit = async () => {
    const invalid = rows.filter(r => !r.firstName || !r.lastName || !r.className);
    if (invalid.length) { setError('Certaines lignes sont incomplètes : prénom, nom et classe sont obligatoires.'); return; }
    setBusy(true);
    try { await onImport(rows); setRows([]); setFileName(''); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Une erreur est survenue pendant l’importation.'); }
    finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
    <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-800 px-5 py-4 text-white">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><FileSpreadsheet className="h-6 w-6 text-amber-300" /></span><div><h2 className="font-extrabold">Importer une liste d’élèves</h2><p className="text-xs text-blue-100">Excel (.xlsx, .xls) ou CSV · aperçu avant enregistrement</p></div></div>
        <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-2 hover:bg-white/15"><X className="h-5 w-5" /></button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-7 text-center transition hover:border-blue-500 hover:bg-blue-100">
          <Upload className="h-8 w-8 text-blue-700" /><span className="font-bold text-blue-950">Choisir le fichier Excel</span><span className="text-xs text-blue-800">La première ligne doit contenir les titres : Prénom, Nom, Classe, etc.</span>
          <input type="file" accept=".xlsx,.xls,.csv,.ods" className="sr-only" onChange={e => void readFile(e.target.files?.[0])} />
        </label>
        {fileName && <p className="text-sm font-semibold text-slate-700">Fichier : {fileName} · {rows.length} ligne(s) reconnue(s)</p>}
        {error && <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
        {rows.length > 0 && <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-blue-800 text-white"><tr>{['Prénom','Nom','Classe','Parent','Téléphone','Matricule','Sexe'].map(x => <th key={x} className="px-3 py-2">{x}</th>)}</tr></thead><tbody>{rows.slice(0, 8).map((r, i) => <tr key={i} className={i % 2 ? 'bg-blue-50/60' : 'bg-white'}>{[r.firstName,r.lastName,r.className,r.parentName,r.parentPhone,r.matricule,r.sexe].map((v,j)=><td key={j} className="max-w-36 truncate border-t border-slate-100 px-3 py-2 text-slate-800">{v || '—'}</td>)}</tr>)}</tbody></table>{rows.length > 8 && <p className="bg-slate-50 px-3 py-2 text-xs text-slate-600">Aperçu des 8 premières lignes sur {rows.length}. Toutes les lignes seront importées.</p>}</div>}
        <p className="text-xs leading-5 text-slate-600">Les colonnes absentes (téléphone du parent, sexe, date ou lieu de naissance, matricule) restent modifiables ensuite. Les prénoms, noms et classes sont obligatoires. Vérifiez les données avant de confirmer.</p>
      </div>
      <div className="flex gap-2 border-t border-slate-200 bg-white p-4"><button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-700">Annuler</button><button onClick={() => void submit()} disabled={!rows.length || busy || !!rows.some(r => !r.firstName || !r.lastName || !r.className)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-800 to-blue-700 px-4 py-3 font-extrabold text-white disabled:opacity-40">{busy ? 'Importation…' : <><CheckCircle2 className="h-4 w-4" /> Importer {rows.length} élève(s)</>}</button></div>
    </div>
  </div>;
}
