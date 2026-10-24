import { useCallback, useEffect, useState } from 'react';
import {
  Activity, ArrowDownLeft, ArrowUpRight, CalendarCheck, Check, ClipboardList, FileSpreadsheet,
  MessageCircle, Plus, RefreshCw, ShieldCheck, Trash2, Wallet, Lock, Download, Users,
} from 'lucide-react';
import { getSupabase } from '../lib/supabase';
import { formatFCFA, studentCollected, studentExpected } from '../types';
import type { Expense, SalaryPayment, Student, Teacher } from '../types';

type Tab = 'overview' | 'cash' | 'attendance' | 'messages' | 'team' | 'import';
type OperationKind = 'cash' | 'attendance' | 'task' | 'announcement';
interface Operation {
  id: string;
  school_id: string;
  kind: OperationKind;
  title: string;
  amount: number;
  occurred_on: string;
  details: Record<string, any>;
  created_at: string;
}
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
interface Props {
  schoolId: string;
  schoolName: string;
  students: Student[];
  classNames: string[];
  teachers: Teacher[];
  expenses: Expense[];
  salaryPayments: SalaryPayment[];
  premium: boolean;
  onImportStudents: (rows: ImportedStudentRow[]) => Promise<number>;
  onNavigate: (view: 'inscriptions' | 'paiements' | 'enseignants' | 'depenses' | 'parametres') => void;
}
const TABS: { id: Tab; label: string; description: string; icon: typeof Activity }[] = [
  { id: 'overview', label: 'Pilotage', description: 'Chiffres clés de la direction', icon: Activity },
  { id: 'cash', label: 'Caisse', description: 'Mouvements complémentaires', icon: Wallet },
  { id: 'attendance', label: 'Présences', description: 'Registre quotidien des élèves', icon: CalendarCheck },
  { id: 'messages', label: 'Parents', description: 'Messages WhatsApp préparés', icon: MessageCircle },
  { id: 'team', label: 'Équipe', description: 'Tâches et suivi interne', icon: ClipboardList },
  { id: 'import', label: 'Import élèves', description: 'Importer un fichier Excel ou CSV', icon: FileSpreadsheet },
];
const today = () => new Date().toISOString().slice(0, 10);
const inputClass = 'mt-1 h-11 w-full rounded-xl border border-blue-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';
const buttonClass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 py-3 text-base font-extrabold leading-tight text-white shadow-sm transition hover:bg-blue-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:bg-blue-800 disabled:text-white disabled:opacity-100';
const panelClass = 'min-w-0 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5';

function normalizeHeader(value: string) {
  return value.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}
function normalizeClassName(value: string) {
  return value.trim().toLocaleLowerCase('fr')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/(\d+)(?:ere|er|eme|e|ieme|ie)?/g, '$1')
    .replace(/[^a-z0-9]/g, '');
}
function normalizeDate(value: string): string {
  const text = value.trim();
  if (!text) return '';
  const european = text.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (european) return european[3] + '-' + european[2].padStart(2, '0') + '-' + european[1].padStart(2, '0');
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  throw new Error('Date de naissance invalide : « ' + text + ' ». Utilisez JJ/MM/AAAA ou AAAA-MM-JJ.');
}
function splitCsvLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') { value += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === separator && !quoted) { result.push(value.trim()); value = ''; }
    else value += char;
  }
  result.push(value.trim());
  return result;
}
function parseStudentGrid(grid: unknown[][]): ImportedStudentRow[] {
  const headerIndex = grid.slice(0, 15).findIndex(row => {
    const headers = row.map(value => normalizeHeader(String(value ?? '')));
    return headers.some(value => ['prenom','prenoms','firstname','prenomdeleleve'].includes(value))
      && headers.some(value => ['nom','nomdefamille','lastname','nomdeleleve'].includes(value))
      && headers.some(value => ['classe','class','niveau','classedeleleve'].includes(value));
  });
  if (headerIndex < 0) throw new Error('Colonnes obligatoires manquantes : Prénom, Nom et Classe. Vérifiez la ligne des titres du fichier Excel.');
  const headers = grid[headerIndex].map(value => normalizeHeader(String(value ?? '')));
  const find = (aliases: string[]) => headers.findIndex(h => aliases.includes(h));
  const idx = {
    first: find(['prenom','prenoms','firstname','prenomdeleleve']),
    last: find(['nom','nomdefamille','lastname','nomdeleleve']),
    cls: find(['classe','class','niveau','classedeleleve']),
    parent: find(['parent','nomparent','nomduparent','nomdututeur','tuteur','nomdupere','nomdelamere','responsablelegal']),
    phone: find(['telephoneparent','telephoneduparent','telephone','tel','telephonepere','contactparent','phone','telephonepereoumere','numeroparent','numerodutelephone']),
    birthDate: find(['datenaissance','naissance','birthdate','datedenaissance']),
    birthPlace: find(['lieunaissance','lieudenaissance','birthplace','lieudenaissanceeleve']),
    sex: find(['sexe','genre']),
  };
  const rows = grid.slice(headerIndex + 1).map((cells, offset) => {
    const get = (index: number) => index >= 0 ? String(cells[index] ?? '').trim() : '';
    const firstName = get(idx.first), lastName = get(idx.last), className = get(idx.cls);
    return { firstName, lastName, className, parentName: get(idx.parent), parentPhone: get(idx.phone), birthDate: normalizeDate(get(idx.birthDate)), birthPlace: get(idx.birthPlace), sexe: /^f|feminin|féminin$/i.test(get(idx.sex)) ? 'F' as const : 'M' as const, rowIndex: headerIndex + offset + 1 };
  }).filter(row => row.firstName || row.lastName || row.className);
  if (rows.length > 5000) throw new Error('Ce fichier contient plus de 5 000 lignes. Séparez les élèves en plusieurs fichiers pour éviter de saturer la mémoire du téléphone.');
  const invalid = rows.find(row => !row.firstName || !row.lastName || !row.className);
  if (invalid) throw new Error('Ligne ' + (invalid.rowIndex + 1) + ' : Prénom, Nom et Classe doivent être renseignés.');
  const seen = new Set<string>();
  for (const row of rows) {
    const key = [row.firstName, row.lastName, row.className].join('|').toLocaleLowerCase('fr');
    if (seen.has(key)) throw new Error('Doublon dans le fichier : ' + row.firstName + ' ' + row.lastName + ' (' + row.className + ').');
    seen.add(key);
  }
  if (!rows.length) throw new Error('Aucun élève trouvé sous les titres Prénom, Nom et Classe.');
  return rows.map(row => ({ firstName: row.firstName, lastName: row.lastName, className: row.className, parentName: row.parentName, parentPhone: row.parentPhone, birthDate: row.birthDate, birthPlace: row.birthPlace, sexe: row.sexe }));
}
function parseStudentCsv(text: string): ImportedStudentRow[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) throw new Error('Le fichier doit contenir une ligne d’en-têtes et au moins un élève.');
  const separator = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
  const headers = splitCsvLine(lines[0], separator).map(normalizeHeader);
  const find = (aliases: string[]) => headers.findIndex(h => aliases.includes(h));
  const idx = {
    first: find(['prenom','prenoms','firstname']),
    last: find(['nom','nomdefamille','lastname']),
    cls: find(['classe','class','niveau']),
    parent: find(['parent','nomparent','nomduparent','nomdututeur','tuteur']),
    phone: find(['telephoneparent','telephoneduparent','telephone','tel','telephonepere','contactparent','phone']),
    birthDate: find(['datenaissance','naissance','birthdate']),
    birthPlace: find(['lieunaissance','lieudenaissance','birthplace']),
    sex: find(['sexe','genre']),
  };
  if (idx.first < 0 || idx.last < 0 || idx.cls < 0) {
    throw new Error('Colonnes obligatoires manquantes : Prénom, Nom et Classe. Les colonnes Parent et Téléphone sont recommandées.');
  }
  const rows = lines.slice(1).map((line, rowIndex) => {
    const cells = splitCsvLine(line, separator);
    const get = (index: number) => index >= 0 ? (cells[index] || '').trim() : '';
    const firstName = get(idx.first), lastName = get(idx.last), className = get(idx.cls);
    return { firstName, lastName, className, parentName: get(idx.parent), parentPhone: get(idx.phone), birthDate: normalizeDate(get(idx.birthDate)), birthPlace: get(idx.birthPlace), sexe: /^f|feminin|féminin$/i.test(get(idx.sex)) ? 'F' as const : 'M' as const, rowIndex };
  }).filter(row => row.firstName || row.lastName || row.className);
  const invalid = rows.find(row => !row.firstName || !row.lastName || !row.className);
  if (invalid) throw new Error('Ligne ' + (invalid.rowIndex + 2) + ' : Prénom, Nom et Classe doivent être renseignés.');
  const seen = new Set<string>();
  for (const row of rows) {
    const key = [row.firstName, row.lastName, row.className].join('|').toLocaleLowerCase('fr');
    if (seen.has(key)) throw new Error('Doublon dans le fichier : ' + row.firstName + ' ' + row.lastName + ' (' + row.className + ').');
    seen.add(key);
  }
  return rows.map(row => ({ firstName: row.firstName, lastName: row.lastName, className: row.className, parentName: row.parentName, parentPhone: row.parentPhone, birthDate: row.birthDate, birthPlace: row.birthPlace, sexe: row.sexe }));
}
function csvEscape(value: unknown) {
  const text = String(value ?? '');
  return '"' + text.replace(/"/g, '""') + '"';
}
function saveCsv(filename: string, rows: unknown[][]) {
  const blob = new Blob(['\uFEFF' + rows.map(row => row.map(csvEscape).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}

async function saveExcelTemplate(filename: string, rows: unknown[][]) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows as any[][]);
  sheet['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 26 }, { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, sheet, 'Élèves');
  XLSX.writeFile(workbook, filename);
}

export function DirectionHub({ schoolId, schoolName, students, classNames, teachers, expenses, salaryPayments, premium, onImportStudents, onNavigate }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [cashTitle, setCashTitle] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [cashDirection, setCashDirection] = useState<'income' | 'expense'>('income');
  const [cashDate, setCashDate] = useState(today());
  const [cashCategory, setCashCategory] = useState('Autre');
  const [attendanceStudent, setAttendanceStudent] = useState('');
  const [attendancePersonType, setAttendancePersonType] = useState<'student' | 'teacher'>('student');
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'absent' | 'late'>('present');
  const [attendanceDate, setAttendanceDate] = useState(today());
  const [taskTitle, setTaskTitle] = useState('');
  const [taskOwner, setTaskOwner] = useState('Direction');
  const [taskDue, setTaskDue] = useState(today());
  const [taskStatus, setTaskStatus] = useState<'à faire' | 'en cours' | 'terminée'>('à faire');
  const [payrollTeacherId, setPayrollTeacherId] = useState('');
  const [payrollAdjustmentType, setPayrollAdjustmentType] = useState<'advance' | 'deduction'>('advance');
  const [payrollAmount, setPayrollAmount] = useState('');
  const [payrollDate, setPayrollDate] = useState(today());
  const [payrollNote, setPayrollNote] = useState('');
  const [messageStudent, setMessageStudent] = useState('');
  const [messageText, setMessageText] = useState('Bonjour, nous vous contactons au sujet de la scolarité de votre enfant. Merci de prendre contact avec l’administration de l’école.');
  const [importPreview, setImportPreview] = useState<ImportedStudentRow[]>([]);
  const [importName, setImportName] = useState('');
  const [importBusy, setImportBusy] = useState(false);

  const loadOperations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await getSupabase().from('school_operations')
        .select('id,school_id,kind,title,amount,occurred_on,details,created_at')
        .eq('school_id', schoolId).order('occurred_on', { ascending: false }).limit(500);
      if (error) throw error;
      setOperations((data || []) as Operation[]);
    } catch (error) {
      console.error('Chargement du suivi de direction impossible :', error);
      setNotice('Le suivi complémentaire n’a pas pu être chargé. Actualisez la page ou réessayez plus tard.');
    } finally { setLoading(false); }
  }, [schoolId]);

  useEffect(() => { void loadOperations(); }, [loadOperations]);

  const createOperation = async (kind: OperationKind, title: string, amount: number, date: string, details: Record<string, any>) => {
    setSaving(true); setNotice('');
    try {
      const { data, error } = await getSupabase().from('school_operations').insert({
        school_id: schoolId, kind, title: title.trim(), amount, occurred_on: date || today(), details,
      }).select('id,school_id,kind,title,amount,occurred_on,details,created_at').single();
      if (error) throw error;
      setOperations(prev => [data as Operation, ...prev]);
      return true;
    } catch (error) {
      console.error('Enregistrement direction impossible :', error);
      setNotice(error instanceof Error ? error.message : 'Enregistrement impossible. Vérifiez la connexion et les droits d’accès.');
      return false;
    } finally { setSaving(false); }
  };
  const deleteOperation = async (operation: Operation) => {
    if (!window.confirm('Supprimer cet élément du suivi de direction ?')) return;
    const { error } = await getSupabase().from('school_operations').delete().eq('id', operation.id).eq('school_id', schoolId);
    if (error) { setNotice('Suppression impossible : ' + error.message); return; }
    setOperations(prev => prev.filter(item => item.id !== operation.id));
  };
  const cashRows = operations.filter(op => op.kind === 'cash');
  const attendanceRows = operations.filter(op => op.kind === 'attendance');
  const taskRows = operations.filter(op => op.kind === 'task' && op.details.recordType !== 'payroll_adjustment');
  const payrollRows = operations.filter(op => op.kind === 'task' && op.details.recordType === 'payroll_adjustment');
  const messageRows = operations.filter(op => op.kind === 'announcement');
  const cashIncome = cashRows.filter(op => op.details.direction === 'income').reduce((sum, op) => sum + Number(op.amount || 0), 0);
  const cashExpense = cashRows.filter(op => op.details.direction === 'expense').reduce((sum, op) => sum + Number(op.amount || 0), 0);
  const collected = students.reduce((sum, student) => sum + studentCollected(student), 0);
  const expected = students.reduce((sum, student) => sum + studentExpected(student), 0);
  const outstanding = Math.max(0, expected - collected);
  const openTasks = taskRows.filter(op => op.details.status !== 'terminée').length;
  const presentToday = attendanceRows.filter(op => op.occurred_on === today() && op.details.status === 'present').length;
  const currentStudent = students.find(student => student.id === messageStudent);
  const selectedAttendanceStudent = students.find(student => student.id === attendanceStudent);
  const selectedAttendanceTeacher = teachers.find(teacher => teacher.id === attendanceStudent);
  const selectedAttendancePerson = attendancePersonType === 'student' ? selectedAttendanceStudent : selectedAttendanceTeacher;
  const selectedPayrollTeacher = teachers.find(teacher => teacher.id === payrollTeacherId);
  const whatsappUrl = currentStudent?.parentPhone
    ? 'https://wa.me/' + (() => { const digits = currentStudent.parentPhone.replace(/\D/g, ''); return digits.length === 8 ? '223' + digits : digits; })() + '?text=' + encodeURIComponent(messageText)
    : '';

  const handleImportFile = async (file?: File) => {
    if (!file) return;
    setNotice('');
    setImportPreview([]);
    if (file.size > 10 * 1024 * 1024) {
      setImportName(file.name);
      setNotice('Ce fichier dépasse 10 Mo et risque de saturer la mémoire du téléphone. Ouvrez-le dans Excel et enregistrez uniquement la feuille des élèves dans un nouveau fichier .xlsx ou .csv, puis réessayez.');
      return;
    }
    if (!/\.(csv|xlsx|xls)$/i.test(file.name) && file.type !== 'text/csv' && !file.type.includes('spreadsheet')) {
      setImportPreview([]);
      setImportName(file.name);
      setNotice('Choisissez un fichier Excel (.xlsx ou .xls) ou CSV (.csv).');
      return;
    }
    try {
      setImportName(file.name);
      setNotice('Lecture du fichier ' + file.name + '…');
      let text = '';
      let parsedRows: ImportedStudentRow[] | null = null;
      if (/\.(xlsx|xls)$/i.test(file.name) || file.type.includes('spreadsheet') || file.type.includes('excel')) {
        // Load the large spreadsheet parser only when the user chooses an Excel file.
        // This keeps the normal app lighter on low-memory Android phones.
        const XLSX = await import('xlsx');
        const buffer = await file.arrayBuffer();
        // Restrict the worksheet size and skip expensive Excel formatting/features.
        const workbook = XLSX.read(buffer, { type: 'array', dense: true, sheetRows: 5006, cellDates: false, cellFormula: false, cellHTML: false, cellStyles: false, bookVBA: false, WTF: false });
        if (!workbook.SheetNames.length) throw new Error('Le classeur Excel ne contient aucune feuille.');
        const sheetErrors: string[] = [];
        // Read cells as rows directly; avoid converting a whole sheet to a second giant CSV string.
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet || !sheet['!ref']) continue;
          try {
            const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '', blankrows: false }) as unknown[][];
            parsedRows = parseStudentGrid(grid);
            break;
          } catch (sheetError) {
            sheetErrors.push(sheetError instanceof Error ? sheetError.message : 'Feuille illisible.');
          }
        }
        if (!parsedRows) throw new Error(sheetErrors[0] || 'Aucune feuille Excel ne contient un tableau avec Prénom, Nom et Classe.');
      } else {
        text = await file.text();
      }
      const rows = parsedRows || parseStudentCsv(text);
      if (!rows.length) throw new Error('Aucun élève valide trouvé dans ce fichier. Vérifiez les en-têtes Prénom, Nom et Classe.');
      const classByNormalizedName = new Map(classNames.map(name => [normalizeClassName(name), name]));
      const unknownClasses = [...new Set(rows.map(row => row.className).filter(name => !classByNormalizedName.has(normalizeClassName(name))))];
      if (unknownClasses.length) throw new Error('Classe(s) inconnue(s) : ' + unknownClasses.join(', ') + '. Créez ces classes dans Paramètres avant l’import.');
      // Store the exact class label configured by the school, even if the Excel file uses "6e" instead of "6ème".
      const normalizedRows = rows.map(row => ({ ...row, className: classByNormalizedName.get(normalizeClassName(row.className)) || row.className }));
      setImportPreview(normalizedRows);
      setImportName(file.name);
      setNotice(rows.length + ' ligne(s) prête(s) à être vérifiée(s). Rien n’a encore été ajouté.');
    } catch (error) {
      setImportPreview([]);
      setNotice(error instanceof Error ? error.message : 'Fichier illisible.');
    }
  };
  const runImport = async () => {
    if (!importPreview.length) return;
    setImportBusy(true); setNotice('');
    try {
      const count = await onImportStudents(importPreview);
      setNotice(count + (navigator.onLine ? ' élève(s) importé(s) dans la base. Vérifiez les fiches et les classes après import.' : ' élève(s) conservé(s) sur cet appareil. Ils seront synchronisés automatiquement au retour d’Internet. Gardez cet appareil et ne videz pas les données du navigateur.'));
      setImportPreview([]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Import interrompu. Vérifiez les élèves enregistrés avant de recommencer.');
    } finally { setImportBusy(false); }
  };

  const pageTitle = TABS.find(item => item.id === tab)!;
  const visibleTabs = TABS.map(item => ({ ...item, locked: !premium && ['cash', 'attendance', 'team'].includes(item.id) }));
  const handleTab = (next: Tab, locked: boolean) => {
    if (locked) { setNotice('Cette rubrique est incluse dans les formules Premium et Élite. Consultez les tarifs pour faire évoluer votre abonnement.'); return; }
    setNotice(''); setTab(next);
  };

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 p-5 text-white shadow-lg sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-300/15 px-3 py-1 text-xs font-extrabold text-amber-200"><ShieldCheck className="h-4 w-4" /> ESPACE DE DIRECTION</div><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Pilotez votre école</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">Finance, présence, communication avec les familles et suivi de l’équipe réunis dans un espace clair pour la direction de {schoolName}.</p></div>
          <button type="button" onClick={() => void loadOperations()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/20"><RefreshCw className="h-4 w-4" /> Actualiser</button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Élèves inscrits', value: students.length.toLocaleString('fr-FR'), tone: 'border-blue-300/30 bg-blue-500/20' },
            { label: 'Scolarité encaissée', value: formatFCFA(collected), tone: 'border-emerald-300/30 bg-emerald-500/20' },
            { label: 'Reste à payer estimé', value: formatFCFA(outstanding), tone: 'border-amber-300/30 bg-amber-500/20' },
            { label: 'Tâches ouvertes', value: String(openTasks), tone: 'border-pink-300/30 bg-pink-500/20' },
          ].map(metric => <div key={metric.label} className={'rounded-2xl border p-3 ' + metric.tone}><p className="text-xs font-bold text-white/90">{metric.label}</p><p className="mt-2 break-words text-lg font-black text-white sm:text-xl">{metric.value}</p></div>)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {visibleTabs.map(item => {
          const Icon = item.icon;
          return <button type="button" key={item.id} onClick={() => handleTab(item.id, item.locked)} className={'relative min-h-28 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ' + (tab === item.id ? 'border-blue-700 bg-blue-50 ring-2 ring-blue-100' : 'border-blue-100 bg-white hover:border-blue-300')}>
            <div className={'mb-3 flex h-9 w-9 items-center justify-center rounded-xl ' + (tab === item.id ? 'bg-blue-800 text-white' : 'bg-amber-100 text-blue-900')}><Icon className="h-5 w-5" /></div>
            <p className="text-sm font-extrabold text-slate-950">{item.label}</p><p className="mt-1 text-xs leading-4 text-slate-700">{item.description}</p>
            {item.locked && <Lock className="absolute right-3 top-3 h-4 w-4 text-amber-600" />}
          </button>;
        })}
      </div>

      {notice && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-950">{notice}</div>}
      {loading && <div className="rounded-xl border border-blue-100 bg-white p-4 text-sm font-semibold text-blue-900">Chargement du suivi de direction…</div>}

      {!loading && tab === 'overview' && <div className="grid gap-4 lg:grid-cols-2">
        <div className={panelClass}><h2 className="text-lg font-black text-blue-950">Situation financière</h2><p className="mt-1 text-sm text-slate-700">Résumé calculé à partir des frais et règlements actuellement enregistrés.</p><div className="mt-4 space-y-3">
          {[['Frais attendus', expected, 'bg-blue-600'], ['Frais encaissés', collected, 'bg-emerald-600'], ['Reste à recouvrer', outstanding, 'bg-amber-500']].map(([label, value, color]) => <div key={String(label)}><div className="flex justify-between gap-3 text-sm"><span className="font-bold text-slate-800">{label}</span><strong className="text-slate-950">{formatFCFA(Number(value))}</strong></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className={'h-full rounded-full ' + color} style={{ width: (expected ? Math.min(100, Number(value) / expected * 100) : 0) + '%' }} /></div></div>)}
        </div><div className="mt-4 flex flex-wrap gap-2"><button type="button" className={buttonClass} onClick={() => onNavigate('paiements')}>Suivi des paiements</button><button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-extrabold text-amber-950" onClick={() => onNavigate('depenses')}>Dépenses</button></div></div>
        <div className={panelClass}><h2 className="text-lg font-black text-blue-950">Suivi de l’établissement</h2><div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-blue-50 p-3"><p className="text-sm font-bold text-blue-900">Enseignants</p><p className="mt-1 text-2xl font-black text-blue-950">{teachers.length}</p><button className="mt-2 text-sm font-extrabold text-blue-800 underline" onClick={() => onNavigate('enseignants')}>Gérer l’équipe</button></div>
          <div className="rounded-xl bg-amber-50 p-3"><p className="text-sm font-bold text-amber-900">Salaires enregistrés</p><p className="mt-1 text-xl font-black text-amber-950">{formatFCFA(salaryPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0))}</p><p className="mt-1 text-xs font-semibold text-amber-900">Consultez l’historique dans Enseignants & Salaires.</p></div>
          <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs font-bold text-emerald-900">Dépenses</p><p className="mt-1 text-xl font-black text-emerald-950">{formatFCFA(expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</p><p className="mt-1 text-xs font-semibold text-emerald-900">Total des dépenses enregistrées.</p></div>
          <div className="rounded-xl bg-pink-50 p-3"><p className="text-xs font-bold text-pink-900">Présences aujourd’hui</p><p className="mt-1 text-2xl font-black text-pink-950">{presentToday}</p><button className="mt-2 text-sm font-extrabold text-pink-800 underline" onClick={() => handleTab('attendance', !premium)}>Ouvrir le registre</button></div>
        </div></div>
      </div>}

      {!loading && tab === 'overview' && <div className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black text-blue-950">Effectifs par classe</h2><p className="mt-1 text-sm font-semibold text-slate-700">Répartition calculée à partir des fiches élèves enregistrées.</p></div><button type="button" className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-extrabold text-blue-950" onClick={() => saveCsv('effectifs-gestilys.csv', [['Classe','Effectif'], ...Array.from(new Set([...classNames, ...students.map(student => student.className)])).sort((a,b) => a.localeCompare(b,'fr')).map(name => [name, students.filter(student => student.className === name).length])])}><Download className="h-4 w-4" />Exporter les effectifs</button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from(new Set([...classNames, ...students.map(student => student.className).filter(Boolean)])).sort((a,b) => a.localeCompare(b,'fr')).map(className => {
          const count = students.filter(student => student.className === className).length;
          const percent = students.length ? Math.round(count / students.length * 100) : 0;
          return <div key={className} className="rounded-xl border border-blue-100 bg-blue-50/70 p-3"><div className="flex items-start justify-between gap-2"><p className="text-sm font-extrabold text-blue-950">{className}</p><span className="rounded-full bg-white px-2 py-1 text-xs font-black text-blue-900">{count}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-700 to-amber-400" style={{ width: percent + '%' }} /></div><p className="mt-1 text-xs font-semibold text-slate-700">{percent}% des élèves enregistrés</p></div>;
        })}</div>
        <button type="button" className={buttonClass + ' mt-4'} onClick={() => onNavigate('inscriptions')}><Users className="h-4 w-4" />Gérer les inscriptions</button>
      </div>}

      {!loading && tab === 'cash' && <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <form className={panelClass} onSubmit={async event => { event.preventDefault(); const amount = Number(cashAmount); if (!cashTitle.trim() || !Number.isFinite(amount) || amount <= 0) { setNotice('Indiquez un libellé et un montant supérieur à zéro.'); return; } const ok = await createOperation('cash', cashTitle, amount, cashDate, { direction: cashDirection, category: cashCategory }); if (ok) { setCashTitle(''); setCashAmount(''); } }}>
          <h2 className="text-lg font-black text-blue-950">Ajouter un mouvement</h2><p className="mt-1 text-sm text-slate-700">Pour les entrées/sorties complémentaires qui ne sont pas déjà enregistrées dans Paiements ou Dépenses, afin d’éviter les doublons.</p>
          <label className="mt-4 block text-sm font-bold text-slate-900">Type<select className={inputClass} value={cashDirection} onChange={e => setCashDirection(e.target.value as 'income'|'expense')}><option value="income">Entrée de caisse</option><option value="expense">Sortie de caisse</option></select></label>
          <label className="mt-3 block text-sm font-bold text-slate-900">Libellé<input className={inputClass} value={cashTitle} onChange={e => setCashTitle(e.target.value)} maxLength={180} required placeholder="Ex. achat de fournitures" /></label>
          <div className="mt-3 grid grid-cols-2 gap-3"><label className="text-sm font-bold text-slate-900">Montant (FCFA)<input className={inputClass} value={cashAmount} onChange={e => setCashAmount(e.target.value)} type="number" min="1" step="1" required /></label><label className="text-sm font-bold text-slate-900">Date<input className={inputClass} value={cashDate} onChange={e => setCashDate(e.target.value)} type="date" required /></label></div>
          <label className="mt-3 block text-sm font-bold text-slate-900">Catégorie<select className={inputClass} value={cashCategory} onChange={e => setCashCategory(e.target.value)}>{['Autre','Cantine','Transport','Fournitures','Événement','Réparation','Don','Divers'].map(value => <option key={value}>{value}</option>)}</select></label>
          <button className={buttonClass + ' mt-4 w-full'} disabled={saving}><Plus className="h-4 w-4" />Enregistrer le mouvement</button>
        </form>
        <div className={panelClass}><h2 className="text-lg font-black text-blue-950">Journal complémentaire</h2><div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs font-bold text-emerald-900">Entrées</p><p className="mt-1 font-black text-emerald-950">{formatFCFA(cashIncome)}</p></div><div className="rounded-xl border border-red-200 bg-red-50 p-3"><p className="text-xs font-bold text-red-900">Sorties</p><p className="mt-1 font-black text-red-950">{formatFCFA(cashExpense)}</p></div></div>
          <div className="mt-3 space-y-2">{cashRows.map(row => <div key={row.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3"><div className="flex min-w-0 gap-2"><span className={'mt-0.5 rounded-lg p-2 ' + (row.details.direction === 'income' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800')}>{row.details.direction === 'income' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}</span><div><p className="break-words text-sm font-extrabold text-slate-950">{row.title}</p><p className="text-xs font-semibold text-slate-700">{row.occurred_on} · {row.details.category || 'Autre'}</p><p className={'mt-1 text-sm font-black ' + (row.details.direction === 'income' ? 'text-emerald-800' : 'text-red-800')}>{row.details.direction === 'income' ? '+' : '−'}{formatFCFA(row.amount)}</p></div></div><button aria-label="Supprimer le mouvement" className="rounded-lg p-2 text-red-700 hover:bg-red-50" onClick={() => void deleteOperation(row)}><Trash2 className="h-4 w-4" /></button></div>)}{!cashRows.length && <p className="rounded-xl bg-blue-50 p-4 text-sm font-semibold text-blue-950">Aucun mouvement complémentaire enregistré.</p>}</div>
        </div>
      </div>}

      {!loading && tab === 'attendance' && <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
        <form className={panelClass} onSubmit={async event => {
          event.preventDefault();
          const person = selectedAttendancePerson;
          if (!person) { setNotice('Choisissez un élève ou un membre du personnel.'); return; }
          const title = person.firstName + ' ' + person.lastName;
          const personId = attendancePersonType === 'student' ? selectedAttendanceStudent?.id : selectedAttendanceTeacher?.id;
          if (!personId) { setNotice('La personne sélectionnée est introuvable.'); return; }
          const existing = attendanceRows.find(row => row.occurred_on === attendanceDate
            && (row.details.personType || 'student') === attendancePersonType
            && (attendancePersonType === 'student' ? row.details.studentId : row.details.teacherId) === personId);
          const details = {
            personType: attendancePersonType,
            studentId: attendancePersonType === 'student' ? personId : null,
            teacherId: attendancePersonType === 'teacher' ? personId : null,
            personName: title,
            studentName: attendancePersonType === 'student' ? title : null,
            className: attendancePersonType === 'student' ? selectedAttendanceStudent?.className || '' : 'Personnel',
            status: attendanceStatus,
          };
          setSaving(true); setNotice('');
          try {
            if (existing) {
              const { data, error } = await getSupabase().from('school_operations').update({ title, details })
                .eq('id', existing.id).eq('school_id', schoolId)
                .select('id,school_id,kind,title,amount,occurred_on,details,created_at').single();
              if (error) throw error;
              setOperations(prev => prev.map(row => row.id === existing.id ? data as Operation : row));
            } else {
              const saved = await createOperation('attendance', title, 0, attendanceDate, details);
              if (!saved) return;
            }
            setNotice('Présence enregistrée pour ' + title + '.');
          } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Enregistrement impossible.');
          } finally { setSaving(false); }
        }}>
          <h2 className="text-lg font-black text-blue-950">Faire l’appel</h2>
          <p className="mt-1 text-sm text-slate-700">Le registre peut suivre les élèves et les membres du personnel.</p>
          <label className="mt-4 block text-sm font-bold text-slate-900">Date<input className={inputClass} type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} required /></label>
          <label className="mt-3 block text-sm font-bold text-slate-900">Personne<select className={inputClass} value={attendancePersonType} onChange={e => { setAttendancePersonType(e.target.value as 'student'|'teacher'); setAttendanceStudent(''); }}><option value="student">Élève</option><option value="teacher">Membre du personnel</option></select></label>
          <label className="mt-3 block text-sm font-bold text-slate-900">{attendancePersonType === 'student' ? 'Élève' : 'Membre du personnel'}<select className={inputClass} value={attendanceStudent} onChange={e => setAttendanceStudent(e.target.value)} required><option value="">Sélectionner une personne</option>{attendancePersonType === 'student'
            ? students.slice().sort((a,b) => a.lastName.localeCompare(b.lastName,'fr')).map(student => <option key={student.id} value={student.id}>{student.firstName} {student.lastName} — {student.className}</option>)
            : teachers.slice().sort((a,b) => a.lastName.localeCompare(b.lastName,'fr')).map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.firstName} {teacher.lastName}</option>)}</select></label>
          <label className="mt-3 block text-sm font-bold text-slate-900">Statut<select className={inputClass} value={attendanceStatus} onChange={e => setAttendanceStatus(e.target.value as 'present'|'absent'|'late')}><option value="present">Présent</option><option value="absent">Absent</option><option value="late">En retard</option></select></label>
          <button className={buttonClass + ' mt-4 w-full'} disabled={saving || (attendancePersonType === 'student' ? !students.length : !teachers.length)}><Check className="h-4 w-4" />Enregistrer l’appel</button>
        </form>
        <div className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-black text-blue-950">Registre des présences</h2><p className="mt-1 text-sm font-semibold text-slate-700">{attendanceRows.filter(row => row.occurred_on === attendanceDate).length} personne(s) suivie(s) le {attendanceDate}</p></div><button type="button" className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-sm font-bold text-blue-900" onClick={() => saveCsv('presences-gestilys.csv', [['Date','Personne','Type','Classe','Statut'], ...attendanceRows.map(row => [row.occurred_on,row.details.personName || row.details.studentName || row.title,row.details.personType === 'teacher' ? 'Personnel' : 'Élève',row.details.className,row.details.status])])}><Download className="h-4 w-4" />Exporter</button></div>
          <div className="mt-3 space-y-2">{attendanceRows.filter(row => row.occurred_on === attendanceDate).map(row => <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl bg-blue-50 p-3"><div><p className="text-sm font-extrabold text-slate-950">{row.details.personName || row.details.studentName || row.title}</p><p className="text-xs font-semibold text-slate-700">{row.details.personType === 'teacher' ? 'Personnel' : row.details.className || 'Classe non indiquée'}</p></div><span className={'rounded-full px-3 py-1 text-xs font-extrabold ' + (row.details.status === 'present' ? 'bg-emerald-100 text-emerald-900' : row.details.status === 'absent' ? 'bg-red-100 text-red-900' : 'bg-amber-100 text-amber-950')}>{row.details.status === 'present' ? 'Présent' : row.details.status === 'absent' ? 'Absent' : 'En retard'}</span></div>)}{!attendanceRows.some(row => row.occurred_on === attendanceDate) && <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">Aucun appel enregistré pour cette date.</p>}</div>
        </div>
      </div>}
      {!loading && tab === 'messages' && <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <div className={panelClass}><h2 className="text-lg font-black text-blue-950">Préparer un message parent</h2><p className="mt-1 text-sm text-slate-700">Le message est ouvert dans WhatsApp pour que vous puissiez le relire et l’envoyer vous-même.</p>
          <label className="mt-4 block text-sm font-bold text-slate-900">Élève<select className={inputClass} value={messageStudent} onChange={e => setMessageStudent(e.target.value)}><option value="">Message général / sans élève</option>{students.map(student => <option key={student.id} value={student.id}>{student.firstName} {student.lastName} — {student.className}</option>)}</select></label>
          <label className="mt-3 block text-sm font-bold text-slate-900">Message<textarea className="mt-1 min-h-36 w-full rounded-xl border border-blue-200 bg-white p-3 text-sm font-medium text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" maxLength={1200} value={messageText} onChange={e => setMessageText(e.target.value)} /></label>
          {currentStudent && <p className="mt-2 text-sm font-bold text-slate-800">Parent : {currentStudent.parentName || 'non renseigné'} · Téléphone : {currentStudent.parentPhone || 'non renseigné'}</p>}
          {whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noreferrer" className={buttonClass + ' mt-4 w-full'}><MessageCircle className="h-4 w-4" />Relire et envoyer sur WhatsApp</a> : <button type="button" disabled className={buttonClass + ' mt-4 w-full'}>Sélectionnez un élève avec téléphone</button>}
          <button type="button" className="mt-3 w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-extrabold text-blue-950" onClick={() => setMessageText('Bonjour aux familles, nous vous informons que [précisez ici l’annonce de l’école]. Merci de votre attention. — ' + schoolName)}>Utiliser un modèle d’annonce générale</button>
        </div>
        <div className={panelClass}><h2 className="text-lg font-black text-blue-950">Historique des annonces</h2><div className="mt-3 space-y-2">{messageRows.map(row => <div key={row.id} className="rounded-xl border border-slate-200 p-3"><p className="text-sm font-extrabold text-slate-950">{row.title}</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{row.details.message}</p><p className="mt-2 text-xs font-bold text-slate-600">{row.occurred_on}</p></div>)}{!messageRows.length && <p className="rounded-xl bg-blue-50 p-4 text-sm font-semibold text-blue-950">Les annonces enregistrées apparaîtront ici.</p>}</div>
          <button type="button" className={buttonClass + ' mt-4'} disabled={!messageText.trim() || saving} onClick={async () => { const ok = await createOperation('announcement', messageStudent ? 'Message parent : ' + (currentStudent?.firstName || '') + ' ' + (currentStudent?.lastName || '') : 'Annonce aux familles', 0, today(), { message: messageText, studentId: messageStudent || null, phone: currentStudent?.parentPhone || null }); if (ok) setNotice('Message conservé dans l’historique. Ouvrez ensuite WhatsApp pour l’envoyer.'); }}><Plus className="h-4 w-4" />Enregistrer dans l’historique</button>
        </div>
      </div>}

      {!loading && tab === 'team' && <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
          <form className={panelClass} onSubmit={async event => { event.preventDefault(); if (!taskTitle.trim()) return; const ok = await createOperation('task', taskTitle, 0, taskDue, { owner: taskOwner, status: taskStatus }); if (ok) setTaskTitle(''); }}>
            <h2 className="text-lg font-black text-blue-950">Ajouter une tâche</h2><p className="mt-1 text-sm text-slate-700">Suivez les actions administratives à réaliser par la direction ou l’équipe.</p>
            <label className="mt-4 block text-sm font-bold text-slate-900">Tâche<input className={inputClass} value={taskTitle} onChange={e => setTaskTitle(e.target.value)} maxLength={180} required placeholder="Ex. vérifier les absences de la semaine" /></label>
            <label className="mt-3 block text-sm font-bold text-slate-900">Responsable<select className={inputClass} value={taskOwner} onChange={e => setTaskOwner(e.target.value)}>{['Direction','Comptabilité','Secrétariat',...teachers.map(t => t.firstName + ' ' + t.lastName)].map((value,index) => <option key={value + index}>{value}</option>)}</select></label>
            <label className="mt-3 block text-sm font-bold text-slate-900">Échéance<input className={inputClass} type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} required /></label>
            <label className="mt-3 block text-sm font-bold text-slate-900">État<select className={inputClass} value={taskStatus} onChange={e => setTaskStatus(e.target.value as 'à faire'|'en cours'|'terminée')}><option>à faire</option><option>en cours</option><option>terminée</option></select></label>
            <button className={buttonClass + ' mt-4 w-full'} disabled={saving}><Plus className="h-4 w-4" />Ajouter à la liste</button>
          </form>
          <div className={panelClass}><div className="flex items-center justify-between gap-2"><h2 className="text-lg font-black text-blue-950">Plan d’action</h2><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold text-blue-950">{taskRows.length} tâche(s)</span></div><div className="mt-3 space-y-2">{taskRows.map(row => <div key={row.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3"><div className="min-w-0"><p className="break-words text-sm font-extrabold text-slate-950">{row.title}</p><p className="mt-1 text-xs font-bold text-slate-700">Responsable : {row.details.owner || 'Direction'} · Échéance : {row.occurred_on}</p><select aria-label={'État de la tâche ' + row.title} className="mt-2 h-9 rounded-lg border border-blue-200 bg-white px-2 text-xs font-bold text-slate-900" value={row.details.status || 'à faire'} onChange={async e => { const status = e.target.value as 'à faire'|'en cours'|'terminée'; const { data, error } = await getSupabase().from('school_operations').update({ details: { ...row.details, status } }).eq('id', row.id).eq('school_id', schoolId).select('id,school_id,kind,title,amount,occurred_on,details,created_at').single(); if (error) setNotice(error.message); else setOperations(prev => prev.map(item => item.id === row.id ? data as Operation : item)); }}><option>à faire</option><option>en cours</option><option>terminée</option></select></div><button type="button" className="rounded-lg p-2 text-red-700 hover:bg-red-50" aria-label="Supprimer la tâche" onClick={() => void deleteOperation(row)}><Trash2 className="h-4 w-4" /></button></div>)}{!taskRows.length && <p className="rounded-xl bg-blue-50 p-4 text-sm font-semibold text-blue-950">Aucune tâche. Ajoutez une action pour commencer le suivi.</p>}</div></div>
        </div>
        <div className={panelClass}>
          <h2 className="text-lg font-black text-blue-950">Avances et retenues sur salaire</h2>
          <p className="mt-1 text-sm leading-6 text-slate-700">Enregistrez une avance versée ou une retenue décidée par l’établissement. Ce registre est distinct du paiement mensuel et ne modifie pas automatiquement le salaire déjà enregistré.</p>
          <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={async event => {
            event.preventDefault();
            const amount = Number(payrollAmount);
            if (!selectedPayrollTeacher || !Number.isFinite(amount) || amount <= 0) { setNotice('Choisissez un enseignant et un montant supérieur à zéro.'); return; }
            const isAdvance = payrollAdjustmentType === 'advance';
            const title = (isAdvance ? 'Avance de salaire — ' : 'Retenue sur salaire — ') + selectedPayrollTeacher.firstName + ' ' + selectedPayrollTeacher.lastName;
            const ok = await createOperation('task', title, amount, payrollDate, { recordType: 'payroll_adjustment', adjustmentType: payrollAdjustmentType, teacherId: selectedPayrollTeacher.id, teacherName: selectedPayrollTeacher.firstName + ' ' + selectedPayrollTeacher.lastName, note: payrollNote.trim(), status: 'enregistré' });
            if (ok) { setPayrollAmount(''); setPayrollNote(''); }
          }}>
            <label className="text-sm font-bold text-slate-900">Enseignant<select className={inputClass} value={payrollTeacherId} onChange={e => setPayrollTeacherId(e.target.value)} required><option value="">Sélectionner</option>{teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.firstName} {teacher.lastName}</option>)}</select></label>
            <label className="text-sm font-bold text-slate-900">Opération<select className={inputClass} value={payrollAdjustmentType} onChange={e => setPayrollAdjustmentType(e.target.value as 'advance'|'deduction')}><option value="advance">Avance versée</option><option value="deduction">Retenue</option></select></label>
            <label className="text-sm font-bold text-slate-900">Montant (FCFA)<input className={inputClass} type="number" min="1" step="1" value={payrollAmount} onChange={e => setPayrollAmount(e.target.value)} required /></label>
            <label className="text-sm font-bold text-slate-900">Date<input className={inputClass} type="date" value={payrollDate} onChange={e => setPayrollDate(e.target.value)} required /></label>
            <label className="text-sm font-bold text-slate-900">Motif (facultatif)<input className={inputClass} maxLength={180} value={payrollNote} onChange={e => setPayrollNote(e.target.value)} placeholder="Ex. avance exceptionnelle" /></label>
            <button className={buttonClass + ' sm:col-span-2 lg:col-span-5'} disabled={saving || !teachers.length}><Plus className="h-4 w-4" />Enregistrer l’opération</button>
          </form>
          <div className="mt-4 grid gap-2 md:grid-cols-2">{payrollRows.map(row => <div key={row.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><p className="text-sm font-extrabold text-slate-950">{row.details.teacherName || row.title}</p><p className="mt-1 text-xs font-semibold text-slate-700">{row.occurred_on} · {row.details.adjustmentType === 'advance' ? 'Avance versée' : 'Retenue'}{row.details.note ? ' · ' + row.details.note : ''}</p><p className={'mt-1 text-sm font-black ' + (row.details.adjustmentType === 'advance' ? 'text-amber-800' : 'text-red-800')}>{formatFCFA(row.amount)}</p></div><button type="button" className="rounded-lg p-2 text-red-700 hover:bg-red-50" aria-label="Supprimer cette opération salariale" onClick={() => void deleteOperation(row)}><Trash2 className="h-4 w-4" /></button></div>)}{!payrollRows.length && <p className="rounded-xl bg-blue-50 p-4 text-sm font-semibold text-blue-950">Aucune avance ou retenue enregistrée.</p>}</div>
        </div>
      </div>}
      {!loading && tab === 'import' && <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <div className={panelClass}><h2 className="text-lg font-black text-blue-950">Importer les élèves en lot</h2><p className="mt-1 text-sm leading-6 text-slate-700">Choisissez directement un fichier Excel (.xlsx, .xls) ou CSV (.csv). Préparez les colonnes <strong>Prénom, Nom, Classe</strong>. Vous pouvez aussi ajouter Parent, Téléphone, Date naissance, Lieu naissance et Sexe.</p>
          <label className="mt-4 block text-sm font-bold text-slate-900">Fichier Excel ou CSV<input type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" className="mt-2 block min-h-14 w-full max-w-full rounded-xl border border-blue-300 bg-blue-50 p-3 text-base font-semibold text-slate-900 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-800 file:px-3 file:py-2 file:font-bold file:text-white" onChange={e => { const input = e.currentTarget; const file = input.files?.[0]; if (file) void handleImportFile(file); input.value = ''; }} /></label>
          <button type="button" className="mt-3 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-extrabold text-blue-950" onClick={() => void saveExcelTemplate('modele-import-eleves-gestilys.xlsx', [['Prénom','Nom','Classe','Parent','Téléphone parent','Date naissance','Lieu naissance','Sexe'],['Aminata','Traoré',classNames[0] || '','Mamadou Traoré','75000000','2013-04-12','Bamako','F']]).catch(error => setNotice(error instanceof Error ? error.message : 'Impossible de créer le modèle Excel.'))}><Download className="h-4 w-4" />Télécharger un modèle Excel</button>
          {importName && <p className="mt-3 break-all text-sm font-bold text-blue-950">Fichier sélectionné : {importName}</p>}
        </div>
        <div className={panelClass}><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-black text-blue-950">Aperçu avant import</h2><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold text-blue-950">{importPreview.length} ligne(s)</span></div><p className="mt-1 text-sm text-slate-700">Contrôlez l’aperçu avant d’ajouter des élèves. Les frais seront calculés selon la configuration de l’école.</p>
          <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-slate-200"><table className="w-full min-w-[540px] text-left text-xs"><thead className="sticky top-0 bg-blue-100 text-blue-950"><tr>{['Prénom','Nom','Classe','Parent','Téléphone'].map(header => <th key={header} className="p-2 font-extrabold">{header}</th>)}</tr></thead><tbody>{importPreview.slice(0,100).map((row,index) => <tr key={index} className="border-t border-slate-100"><td className="p-2 font-semibold text-slate-900">{row.firstName}</td><td className="p-2 font-semibold text-slate-900">{row.lastName}</td><td className="p-2 font-semibold text-slate-900">{row.className}</td><td className="p-2 text-slate-800">{row.parentName}</td><td className="p-2 text-slate-800">{row.parentPhone}</td></tr>)}</tbody></table></div>
          {importPreview.length > 100 && <p className="mt-2 text-xs font-bold text-slate-700">Les 100 premières lignes sont affichées ; l’import prendra en compte les {importPreview.length} lignes valides.</p>}
          <button type="button" className={buttonClass + ' mt-4 w-full'} disabled={!importPreview.length || importBusy} onClick={() => void runImport()}><FileSpreadsheet className="h-4 w-4" />{importBusy ? 'Import en cours…' : 'Confirmer l’import de ' + importPreview.length + ' élève(s)'}</button>
        </div>
      </div>}

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold leading-5 text-blue-950"><strong>Important :</strong> les totaux sont calculés à partir des données réellement enregistrées. Les mouvements complémentaires de caisse sont séparés des paiements et dépenses pour éviter de compter deux fois une même opération. {pageTitle.description}</div>
    </section>
  );
}
