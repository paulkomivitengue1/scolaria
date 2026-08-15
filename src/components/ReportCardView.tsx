import { useCallback, useEffect, useState } from 'react';
import {
  ClipboardList, Plus, Trash2, Check, Eye, Pencil,
  Loader2, History, Printer, ArrowLeft,
} from 'lucide-react';
import type { Student, GradePeriod, ReportCard, GradeRow } from '../types';
import {
  gradeAverage, gradeAppreciation, gradeColor, DEFAULT_SUBJECTS,
} from '../types';
import {
  loadReportCards, createReportCard, updateReportCard, deleteReportCard,
  saveGrade, deleteGrade,
} from '../lib/db';

interface Props {
  students: Student[];
  gradePeriods: GradePeriod[];
  schoolId: string;
  schoolName: string;
  academicYear: string;
}

type Mode = 'list' | 'edit' | 'bulletin' | 'history';

export function ReportCardView({ students, gradePeriods, schoolId, schoolName, academicYear }: Props) {
  const [mode, setMode] = useState<Mode>('list');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(gradePeriods[0]?.index ?? 1);
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [currentCard, setCurrentCard] = useState<ReportCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [appreciation, setAppreciation] = useState('');
  const [cardStatus, setCardStatus] = useState<'draft' | 'finalized'>('draft');
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);

  // ── Load report cards for a student ─────────────────
  const loadCards = useCallback(async (studentId: string) => {
    setLoading(true);
    try {
      const cards = await loadReportCards(schoolId, studentId);
      setReportCards(cards);
    } catch (err) {
      console.error('Failed to load report cards:', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  // ── Open grade editor for a student + period ────────
  const openEditor = async (student: Student, periodIndex: number) => {
    setSelectedStudent(student);
    setSelectedPeriod(periodIndex);
    await loadCards(student.id);
    // Find existing card for this period
    const existing = reportCards.find(c => c.periodIndex === periodIndex && c.academicYear === academicYear);
    if (existing) {
      setCurrentCard(existing);
      setGrades(existing.grades);
      setAppreciation(existing.appreciation);
      setCardStatus(existing.status);
    } else {
      // Create a new draft card
      try {
        const periodLabel = gradePeriods.find(p => p.index === periodIndex)?.label ?? `Période ${periodIndex}`;
        const cardId = await createReportCard(schoolId, student.id, periodIndex, periodLabel, academicYear);
        const newCard: ReportCard = {
          id: cardId, studentId: student.id, periodIndex, periodLabel: periodLabel,
          academicYear, status: 'draft', appreciation: '', grades: [], updatedAt: new Date().toISOString(),
        };
        setCurrentCard(newCard);
        setGrades([]);
        setAppreciation('');
        setCardStatus('draft');
        setReportCards(prev => [...prev, newCard]);
      } catch (err) {
        console.error('Failed to create report card:', err);
        return;
      }
    }
    setMode('edit');
  };

  // ── Auto-save grades ────────────────────────────────
  const scheduleAutoSave = useCallback(() => {
    if (saveTimer) clearTimeout(saveTimer);
    setSaveIndicator(false);
    const timer = setTimeout(() => {
      if (currentCard) {
        // Save appreciation + status
        updateReportCard(currentCard.id, { appreciation, status: cardStatus }).catch(console.error);
        setSaveIndicator(true);
        setTimeout(() => setSaveIndicator(false), 1500);
      }
    }, 800);
    setSaveTimer(timer);
  }, [saveTimer, currentCard, appreciation, cardStatus]);

  useEffect(() => {
    if (mode === 'edit' && currentCard) {
      scheduleAutoSave();
    }
  }, [appreciation, cardStatus, mode, currentCard, scheduleAutoSave]);

  // ── Grade management ────────────────────────────────
  const addGrade = async () => {
    if (!currentCard) return;
    const newGrade: GradeRow = {
      id: '', subject: '', score: 0, maxScore: 20, coefficient: 1,
    };
    const updated = [...grades, newGrade];
    setGrades(updated);
    // Save to DB immediately (creates the row)
    try {
      const id = await saveGrade(currentCard.id, { subject: '', score: 0, maxScore: 20, coefficient: 1 });
      setGrades(prev => prev.map((g, i) => i === prev.length - 1 ? { ...g, id } : g));
    } catch (err) {
      console.error('Failed to add grade:', err);
    }
  };

  const updateGrade = (index: number, field: keyof GradeRow, value: string | number) => {
    const updated = grades.map((g, i) => i === index ? { ...g, [field]: value } : g);
    setGrades(updated);
    const grade = updated[index];
    if (grade.id && currentCard) {
      saveGrade(currentCard.id, { id: grade.id, subject: grade.subject, score: grade.score, maxScore: grade.maxScore, coefficient: grade.coefficient }).catch(console.error);
    }
  };

  const removeGrade = async (index: number) => {
    const grade = grades[index];
    if (grade.id) {
      try { await deleteGrade(grade.id); } catch (err) { console.error(err); }
    }
    setGrades(prev => prev.filter((_, i) => i !== index));
  };

  const finalizeCard = async () => {
    if (!currentCard) return;
    const newStatus = cardStatus === 'draft' ? 'finalized' : 'draft';
    setCardStatus(newStatus);
    try {
      await updateReportCard(currentCard.id, { status: newStatus, appreciation });
      setCurrentCard({ ...currentCard, status: newStatus, appreciation });
    } catch (err) { console.error(err); }
  };

  const deleteCard = async () => {
    if (!currentCard || !selectedStudent) return;
    if (!confirm('Supprimer ce bulletin ? Cette action est irréversible.')) return;
    try {
      await deleteReportCard(currentCard.id);
      setReportCards(prev => prev.filter(c => c.id !== currentCard.id));
      setMode('list');
    } catch (err) { console.error(err); }
  };

  // ── History ─────────────────────────────────────────
  const openHistory = async (student: Student) => {
    setHistoryStudent(student);
    await loadCards(student.id);
    setMode('history');
  };

  // ── Bulletin preview ────────────────────────────────
  const openBulletin = () => {
    setMode('bulletin');
  };

  const avg = gradeAverage(grades);

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2.5xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-card">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-indigo-50 text-indigo-400"><ClipboardList className="h-8 w-8" /></span>
        <h3 className="mt-4 font-display text-lg font-700 text-ink">Aucun élève inscrit</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500">Ajoutez d'abord des élèves depuis le cahier pour pouvoir générer leurs bulletins.</p>
      </div>
    );
  }

  // ════════════════════════════════════════════════════
  // LIST MODE — pick student + period
  // ════════════════════════════════════════════════════
  if (mode === 'list') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-indigo-700"><ClipboardList className="h-3 w-3" />Bulletins scolaires</div>
            <h1 className="font-display text-2xl font-700 tracking-tight text-ink sm:text-3xl">Bulletins de notes</h1>
            <p className="mt-1 text-sm text-slate-500">Sélectionnez un élève, puis une période pour saisir les notes et générer le bulletin.</p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
          <label className="mb-1 block text-[11px] font-700 uppercase tracking-wide text-indigo-600">Période</label>
          <div className="flex flex-wrap gap-2">
            {gradePeriods.map(p => (
              <button key={p.index} onClick={() => setSelectedPeriod(p.index)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-700 transition ${selectedPeriod === p.index ? 'bg-indigo-700 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-indigo-600" /></div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {students.map(s => {
              const ini = `${s.firstName[0] ?? ''}${s.lastName[0] ?? ''}`;
              const _card = reportCards.find(c => c.periodIndex === selectedPeriod && c.studentId === s.id);
              void _card;
              return (
                <div key={s.id} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:shadow-cardLg">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 text-sm font-700 text-indigo-700">{ini}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-600 text-ink">{s.firstName} {s.lastName}</div>
                      <div className="text-[11px] text-slate-400">{s.className}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => openEditor(s, selectedPeriod)} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-700 px-3 text-sm font-700 text-white transition hover:bg-indigo-800 active:scale-95">
                      <Pencil className="h-3.5 w-3.5" /> Saisir les notes
                    </button>
                    <button onClick={() => openHistory(s)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 active:scale-95" title="Historique">
                      <History className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════
  // EDIT MODE — grade entry
  // ════════════════════════════════════════════════════
  if (mode === 'edit' && selectedStudent) {
    const periodLabel = gradePeriods.find(p => p.index === selectedPeriod)?.label ?? `Période ${selectedPeriod}`;
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMode('list')} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 active:scale-95"><ArrowLeft className="h-4 w-4" /></button>
            <div>
              <h1 className="font-display text-xl font-700 text-ink sm:text-2xl">{selectedStudent.firstName} {selectedStudent.lastName}</h1>
              <p className="text-sm text-slate-500">{periodLabel} · {selectedStudent.className} · {academicYear}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saveIndicator && <span className="inline-flex items-center gap-1 text-xs font-700 text-emerald-600"><Check className="h-3.5 w-3.5" strokeWidth={3} /> Enregistré</span>}
            <button onClick={openBulletin} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-600 text-slate-600 transition hover:bg-slate-50 active:scale-95"><Eye className="h-4 w-4" /> Aperçu bulletin</button>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-700 ${cardStatus === 'finalized' ? 'bg-emerald-100 text-emerald-700' : 'bg-gold-100 text-gold-700'}`}>
            {cardStatus === 'finalized' ? <><Check className="h-3.5 w-3.5" /> Finalisé</> : <><Pencil className="h-3.5 w-3.5" /> Brouillon</>}
          </span>
          <button onClick={finalizeCard} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-600 text-slate-600 transition hover:bg-slate-100 active:scale-95">
            {cardStatus === 'draft' ? 'Marquer comme finalisé' : 'Rouvrir en brouillon'}
          </button>
          <button onClick={deleteCard} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-600 text-red-600 transition hover:bg-red-50 active:scale-95"><Trash2 className="h-3.5 w-3.5" /> Supprimer</button>
        </div>

        {/* Grades table */}
        <div className="overflow-hidden rounded-2.5xl border border-slate-200 bg-white shadow-card">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="font-display text-sm font-700 text-ink">Notes par matière</h3>
          </div>
          {/* Desktop header */}
          <div className="hidden grid-cols-[1fr_80px_80px_80px_40px] gap-2 border-b border-slate-100 px-4 py-2 text-[11px] font-700 uppercase tracking-wider text-slate-500 sm:grid">
            <span>Matière</span><span className="text-center">Note</span><span className="text-center">Sur</span><span className="text-center">Coef.</span><span></span>
          </div>
          <div className="divide-y divide-slate-100">
            {grades.map((g, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[1fr_80px_80px_80px_40px] sm:items-center">
                {/* Subject with autocomplete on mobile/desktop */}
                <div className="relative">
                  <input
                    type="text"
                    list="subjects-list"
                    value={g.subject}
                    onChange={e => updateGrade(i, 'subject', e.target.value)}
                    placeholder="Matière…"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-600 text-ink outline-none transition focus:border-indigo-400 focus:ring-2"
                  />
                  <datalist id="subjects-list">
                    {DEFAULT_SUBJECTS.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div className="flex items-center gap-2 sm:justify-center">
                  <span className="text-xs font-600 text-slate-400 sm:hidden">Note:</span>
                  <input type="number" min={0} step={0.5} value={g.score || ''} onChange={e => updateGrade(i, 'score', parseFloat(e.target.value) || 0)} placeholder="0" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-right text-sm font-700 text-ink outline-none transition focus:border-indigo-400 focus:ring-2 sm:w-16" />
                </div>
                <div className="flex items-center gap-2 sm:justify-center">
                  <span className="text-xs font-600 text-slate-400 sm:hidden">Sur:</span>
                  <input type="number" min={1} step={1} value={g.maxScore || ''} onChange={e => updateGrade(i, 'maxScore', parseFloat(e.target.value) || 20)} placeholder="20" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-right text-sm font-600 text-ink outline-none transition focus:border-indigo-400 focus:ring-2 sm:w-16" />
                </div>
                <div className="flex items-center gap-2 sm:justify-center">
                  <span className="text-xs font-600 text-slate-400 sm:hidden">Coef.:</span>
                  <input type="number" min={1} step={0.5} value={g.coefficient || ''} onChange={e => updateGrade(i, 'coefficient', parseFloat(e.target.value) || 1)} placeholder="1" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-right text-sm font-600 text-ink outline-none transition focus:border-indigo-400 focus:ring-2 sm:w-16" />
                </div>
                <button onClick={() => removeGrade(i)} className="hidden h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 sm:grid"><Trash2 className="h-4 w-4" /></button>
                <button onClick={() => removeGrade(i)} className="mt-1 inline-flex items-center gap-1 text-xs font-600 text-red-500 sm:hidden"><Trash2 className="h-3.5 w-3.5" /> Supprimer</button>
              </div>
            ))}
            {grades.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-slate-400">Aucune matière. Cliquez sur « Ajouter une matière » pour commencer.</div>
            )}
          </div>
          <div className="border-t border-slate-200 px-4 py-3">
            <button onClick={addGrade} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-sm font-600 text-indigo-700 transition hover:bg-indigo-100 active:scale-95"><Plus className="h-4 w-4" /> Ajouter une matière</button>
          </div>
        </div>

        {/* Average preview */}
        {grades.length > 0 && grades.some(g => g.subject && g.maxScore > 0) && (
          <div className="flex items-center justify-between rounded-2xl bg-indigo-50 px-5 py-4">
            <div>
              <div className="text-xs font-600 text-indigo-600">Moyenne générale (sur 20)</div>
              <div className={`font-display text-3xl font-800 ${gradeColor(avg)}`}>{avg.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-600 text-slate-400">Appréciation</div>
              <div className={`font-display text-lg font-700 ${gradeColor(avg)}`}>{gradeAppreciation(avg)}</div>
            </div>
          </div>
        )}

        {/* Appreciation */}
        <div className="overflow-hidden rounded-2.5xl border border-slate-200 bg-white shadow-card">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="font-display text-sm font-700 text-ink">Appréciation générale</h3>
          </div>
          <div className="p-4">
            <textarea value={appreciation} onChange={e => setAppreciation(e.target.value)} placeholder="Saisissez l'appréciation du conseil de classe…" rows={3} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-indigo-400 focus:ring-2" />
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════
  // BULLETIN MODE — printable preview
  // ════════════════════════════════════════════════════
  if (mode === 'bulletin' && selectedStudent) {
    const periodLabel = gradePeriods.find(p => p.index === selectedPeriod)?.label ?? `Période ${selectedPeriod}`;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 print:hidden">
          <button onClick={() => setMode('edit')} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 active:scale-95"><ArrowLeft className="h-4 w-4" /></button>
          <div className="flex-1">
            <h1 className="font-display text-xl font-700 text-ink">Aperçu du bulletin</h1>
            <p className="text-sm text-slate-500">{selectedStudent.firstName} {selectedStudent.lastName} · {periodLabel}</p>
          </div>
          <button onClick={() => window.print()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-700 px-4 text-sm font-700 text-white transition hover:bg-indigo-800 active:scale-95"><Printer className="h-4 w-4" /> Imprimer / PDF</button>
        </div>

        {/* Printable bulletin */}
        <div id="bulletin-print" className="mx-auto max-w-2xl rounded-2.5xl border border-slate-200 bg-white p-6 shadow-card sm:p-8 print:border-0 print:shadow-none print:p-0">
          {/* Header */}
          <div className="border-b-2 border-indigo-700 pb-4 text-center">
            <h2 className="font-display text-xl font-800 text-indigo-900 sm:text-2xl">{schoolName || 'École'}</h2>
            <p className="mt-1 text-sm text-slate-500">Bulletin de notes · Année scolaire {academicYear}</p>
            <p className="mt-0.5 text-sm font-600 text-slate-700">{periodLabel}</p>
          </div>

          {/* Student info */}
          <div className="mt-4 flex flex-wrap justify-between gap-4 text-sm">
            <div>
              <span className="text-slate-400">Élève : </span>
              <span className="font-700 text-ink">{selectedStudent.firstName} {selectedStudent.lastName}</span>
            </div>
            <div>
              <span className="text-slate-400">Classe : </span>
              <span className="font-700 text-ink">{selectedStudent.className}</span>
            </div>
          </div>

          {/* Grades table */}
          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300 bg-slate-50">
                <th className="px-3 py-2 text-left text-xs font-700 uppercase tracking-wider text-slate-600">Matière</th>
                <th className="px-3 py-2 text-center text-xs font-700 uppercase tracking-wider text-slate-600">Note</th>
                <th className="px-3 py-2 text-center text-xs font-700 uppercase tracking-wider text-slate-600">Sur</th>
                <th className="px-3 py-2 text-center text-xs font-700 uppercase tracking-wider text-slate-600">Coef.</th>
                <th className="px-3 py-2 text-center text-xs font-700 uppercase tracking-wider text-slate-600">Moy/20</th>
              </tr>
            </thead>
            <tbody>
              {grades.filter(g => g.subject).map((g, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-600 text-ink">{g.subject}</td>
                  <td className="px-3 py-2 text-center font-700 text-ink">{g.score.toFixed(2)}</td>
                  <td className="px-3 py-2 text-center text-slate-500">{g.maxScore.toFixed(0)}</td>
                  <td className="px-3 py-2 text-center text-slate-500">{g.coefficient.toFixed(1)}</td>
                  <td className="px-3 py-2 text-center font-700 text-indigo-700">{((g.score / g.maxScore) * 20).toFixed(2)}</td>
                </tr>
              ))}
              {grades.filter(g => g.subject).length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Aucune note saisie</td></tr>
              )}
            </tbody>
          </table>

          {/* Average + appreciation */}
          {grades.filter(g => g.subject).length > 0 && (
            <>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-indigo-50 px-5 py-3">
                <span className="text-sm font-600 text-indigo-700">Moyenne générale</span>
                <span className={`font-display text-2xl font-800 ${gradeColor(avg)}`}>{avg.toFixed(2)}<span className="text-sm font-600 text-slate-400"> / 20</span></span>
              </div>
              <div className="mt-2 flex items-center justify-between px-1">
                <span className="text-xs font-600 text-slate-400">Appréciation</span>
                <span className={`text-sm font-700 ${gradeColor(avg)}`}>{gradeAppreciation(avg)}</span>
              </div>
            </>
          )}

          {appreciation && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-700 uppercase tracking-wider text-slate-500">Appréciation du conseil de classe</div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink">{appreciation}</p>
            </div>
          )}

          {/* Signature */}
          <div className="mt-8 flex justify-between text-xs text-slate-400">
            <div className="text-center">
              <div className="border-t border-slate-300 pt-1">Le directeur / La directrice</div>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-300 pt-1">Le secrétaire</div>
            </div>
          </div>

          <div className="mt-4 text-center text-[10px] text-slate-300">
            Édité le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} · {schoolName || 'École'}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════
  // HISTORY MODE — past report cards for a student
  // ════════════════════════════════════════════════════
  if (mode === 'history' && historyStudent) {
    const cards = reportCards;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setMode('list')} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 active:scale-95"><ArrowLeft className="h-4 w-4" /></button>
          <div>
            <h1 className="font-display text-xl font-700 text-ink">Historique — {historyStudent.firstName} {historyStudent.lastName}</h1>
            <p className="text-sm text-slate-500">{historyStudent.className} · Tous les bulletins</p>
          </div>
        </div>

        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2.5xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-card">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400"><History className="h-7 w-7" /></span>
            <h3 className="mt-3 font-display text-base font-700 text-ink">Aucun bulletin enregistré</h3>
            <p className="mt-1 text-sm text-slate-500">Les bulletins créés pour cet élève apparaîtront ici.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.sort((a, b) => a.periodIndex - b.periodIndex).map(card => {
              const avg = gradeAverage(card.grades);
              return (
                <div key={card.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:shadow-cardLg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-base font-700 text-ink">{card.periodLabel}</span>
                        <span className="text-xs text-slate-400">· {card.academicYear}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-700 ${card.status === 'finalized' ? 'bg-emerald-100 text-emerald-700' : 'bg-gold-100 text-gold-700'}`}>
                          {card.status === 'finalized' ? 'Finalisé' : 'Brouillon'}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{card.grades.length} matière{card.grades.length !== 1 ? 's' : ''} · Moyenne: <span className={`font-700 ${gradeColor(avg)}`}>{avg.toFixed(2)}/20</span></div>
                      {card.appreciation && <div className="mt-1 truncate text-xs text-slate-400">« {card.appreciation} »</div>}
                    </div>
                    <button onClick={() => { setSelectedStudent(historyStudent); setSelectedPeriod(card.periodIndex); setCurrentCard(card); setGrades(card.grades); setAppreciation(card.appreciation); setCardStatus(card.status); setMode('edit'); }} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-600 text-slate-600 transition hover:bg-slate-50 active:scale-95"><Pencil className="h-3.5 w-3.5" /> Ouvrir</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
}
