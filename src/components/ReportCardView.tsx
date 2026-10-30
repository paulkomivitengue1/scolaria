import { useCallback, useEffect, useState } from 'react';
import {
  ClipboardList, Plus, Trash2, Check, Eye, Pencil,
  Loader2, History, Printer, ArrowLeft,
} from 'lucide-react';
import type { Student, GradePeriod, ReportCard, GradeRow } from '../types';
import { ImageCropper } from './ImageCropper';
import {
  gradeAverage, gradeAppreciation, gradeColor, DEFAULT_SUBJECTS,
} from '../types';
import {
  loadReportCards, createReportCard, updateReportCard, deleteReportCard,
  saveGrade, deleteGrade, loadStudentCardPhotos,
} from '../lib/db';

interface Props {
  students: Student[];
  gradePeriods: GradePeriod[];
  schoolId: string;
  schoolName: string;
  academicYear: string;
  schoolLogo: string;
}

type Mode = 'list' | 'edit' | 'bulletin' | 'history';
type LyceeScore = { classScore: string; compositionScore: string; rank: string };

export function ReportCardView({ students, gradePeriods, schoolId, schoolName, academicYear, schoolLogo }: Props) {
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
  const [bulletinFormat, setBulletinFormat] = useState('classique');
  const [customBulletinColor, setCustomBulletinColor] = useState('#1d4ed8');
  const [formatSaved, setFormatSaved] = useState(false);
  const [showStudentPhoto, setShowStudentPhoto] = useState(false);
  const [showParentName, setShowParentName] = useState(false);
  const [schoolMotto, setSchoolMotto] = useState('');
  const [studentPhotos, setStudentPhotos] = useState<Record<string, string>>({});
  const [schoolStamp, setSchoolStamp] = useState('');
  const [stampCropDraft, setStampCropDraft] = useState<string | null>(null);
  const [showRank, setShowRank] = useState(false);
  const [showLyceeRank, setShowLyceeRank] = useState(true);
  const [showLyceeMention, setShowLyceeMention] = useState(true);
  const [lyceeScores, setLyceeScores] = useState<Record<string, LyceeScore>>({});
  const [classStats, setClassStats] = useState<{ count: number; highest: number | null; lowest: number | null; rank: number | null }>({ count: 0, highest: null, lowest: null, rank: null });
  useEffect(() => { try { setSchoolStamp(localStorage.getItem('gestilys-school-stamp-' + schoolId) || ''); } catch { setSchoolStamp(''); } }, [schoolId]);

  useEffect(() => {
    if (!selectedStudent) { setLyceeScores({}); return; }
    try {
      const key = 'gestilys-lycee-scores-' + schoolId + '-' + selectedStudent.id + '-' + selectedPeriod;
      const saved = localStorage.getItem(key);
      setLyceeScores(saved ? JSON.parse(saved) as Record<string, LyceeScore> : {});
    } catch { setLyceeScores({}); }
  }, [schoolId, selectedStudent?.id, selectedPeriod]);

  const updateLyceeScore = (subject: string, field: keyof LyceeScore, value: string) => {
    if (!selectedStudent) return;
    const current: LyceeScore = lyceeScores[subject] || { classScore: '', compositionScore: '', rank: '' };
    const next: Record<string, LyceeScore> = { ...lyceeScores, [subject]: { ...current, [field]: value } };
    setLyceeScores(next);
    try { localStorage.setItem('gestilys-lycee-scores-' + schoolId + '-' + selectedStudent.id + '-' + selectedPeriod, JSON.stringify(next)); }
    catch { window.alert('Impossible d’enregistrer ces notes sur cet appareil.'); }
  };
  const lyceeAverage = (subject: string) => {
    if (subject === 'Conduite') return Number(lyceeScores[subject]?.classScore || 18);
    const row = lyceeScores[subject];
    return Math.round(((Number(row?.classScore || 0) + Number(row?.compositionScore || 0)) / 3) * 100) / 100;
  };
  const lyceeMention = (average: number) => average >= 18 ? 'Excellent' : average >= 16 ? 'Très Bien' : average >= 14 ? 'Bien' : average >= 12 ? 'Assez Bien' : average >= 10 ? 'Passable' : 'Insuffisant';

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gestilys-bulletin-format-' + schoolId);
      if (saved) {
        const config = JSON.parse(saved);
        setBulletinFormat(config.format || 'classique');
        setCustomBulletinColor(config.color || '#1d4ed8');
        setShowStudentPhoto(config.showStudentPhoto === true);
        setShowParentName(config.showParentName === true);
        setShowRank(config.showRank === true);
        setSchoolMotto(config.schoolMotto || '');
      }
    } catch { /* Optional saved format */ }
  }, [schoolId]);

  useEffect(() => { let alive = true; loadStudentCardPhotos(schoolId).then(data => { if (alive) setStudentPhotos(data); }).catch(err => console.warn('Student card photos unavailable for bulletins:', err)); return () => { alive = false; }; }, [schoolId]);

  // Statistiques de classe issues des bulletins enregistrés.
  useEffect(() => {
    if (mode !== 'bulletin' || !selectedStudent) return;
    let alive = true;
    const classmates = students.filter(student => student.className === selectedStudent.className);
    Promise.all(classmates.map(async student => {
      try {
        const cards = await loadReportCards(schoolId, student.id);
        const card = cards.find(item => item.periodIndex === selectedPeriod && item.academicYear === academicYear);
        return card && card.grades.some(grade => grade.subject.trim()) ? { studentId: student.id, average: gradeAverage(card.grades) } : null;
      } catch { return null; }
    })).then(results => {
      if (!alive) return;
      const ranked = results.filter((item): item is { studentId: string; average: number } => item !== null).sort((a, b) => b.average - a.average);
      const selected = ranked.find(item => item.studentId === selectedStudent.id);
      // Ex-aequo : deux élèves avec la même moyenne partagent le même rang.
      const rank = selected ? 1 + ranked.filter(item => item.average > selected.average).length : null;
      setClassStats({ count: classmates.length, highest: ranked.length ? ranked[0].average : null, lowest: ranked.length ? ranked[ranked.length - 1].average : null, rank });
    });
    return () => { alive = false; };
  }, [mode, selectedStudent, selectedPeriod, academicYear, schoolId, students]);

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
    let cards: ReportCard[] = [];
    try {
      cards = await loadReportCards(schoolId, student.id);
      setReportCards(cards);
    } catch (err) {
      console.error('Failed to load report cards:', err);
      return;
    }
    // Find existing card for this period from freshly loaded data
    const existing = cards.find(c => c.periodIndex === periodIndex && c.academicYear === academicYear);
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

  const lyceeScoredGrades = grades.filter(g => g.subject.trim() && lyceeScores[g.subject]?.classScore !== undefined && lyceeScores[g.subject].classScore !== '' && lyceeScores[g.subject]?.compositionScore !== undefined && lyceeScores[g.subject].compositionScore !== '');
  const lyceeCoefficientTotal = lyceeScoredGrades.reduce((sum, g) => sum + (Number(g.coefficient) || 1), 0);
  const lyceeWeightedTotal = lyceeScoredGrades.reduce((sum, g) => sum + lyceeAverage(g.subject) * (Number(g.coefficient) || 1), 0);
  const avg = bulletinFormat === 'lycee-malien' ? (lyceeCoefficientTotal ? lyceeWeightedTotal / lyceeCoefficientTotal : 0) : gradeAverage(grades);

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

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
          <label className="block text-sm font-800 text-slate-800">Format du bulletin
            <select value={bulletinFormat} onChange={e => { setBulletinFormat(e.target.value); setFormatSaved(false); }} className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-3 py-3 text-base font-700 text-slate-900">
              <option value="classique">1. Classique malien</option><option value="moderne">2. Moderne coloré</option><option value="compact">3. Compact</option><option value="officiel">4. Institutionnel</option><option value="minimal">5. Minimaliste</option><option value="lycee-malien">6. Lycée malien (notes de classe + composition)</option><option value="personnalise">Personnaliser mon format</option>
            </select>
          </label>
          {bulletinFormat === 'lycee-malien' && <p className="mt-2 text-sm font-600 text-indigo-900">Saisis toutes les notes ci-dessous avant d’ouvrir l’aperçu. L’aperçu sera ensuite en lecture seule.</p>}
        </div>
        {/* Grades table */}
        <div className="overflow-hidden rounded-2.5xl border border-slate-200 bg-white shadow-card">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="font-display text-sm font-700 text-ink">Notes par matière</h3>
          </div>
          {/* Desktop header */}
          <div className="hidden grid-cols-[minmax(110px,0.8fr)_70px_70px_65px_36px] gap-2 border-b border-slate-100 px-4 py-2 text-[11px] font-700 uppercase tracking-wider text-slate-500 sm:grid">
            <span>Matière</span><span className="text-center">Note</span><span className="text-center">Sur</span><span className="text-center">Coef.</span><span></span>
          </div>
          <div className="divide-y divide-slate-100">
            {grades.map((g, i) => (
              <div key={i} className="px-4 py-3 sm:grid sm:grid-cols-[minmax(110px,0.8fr)_70px_70px_65px_36px] sm:items-center sm:gap-2">
                {/* Subject — full width on both mobile & desktop */}
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
                {/* Mobile: 3-column compact grid for Note / Sur / Coef */}
                <div className="mt-2 grid grid-cols-3 gap-2 sm:hidden">
                  <div>
                    <label className="mb-0.5 block text-[10px] font-700 uppercase tracking-wide text-slate-400">Note</label>
                    <input type="number" min={0} step={0.5} value={g.score || ''} onChange={e => updateGrade(i, 'score', parseFloat(e.target.value) || 0)} placeholder="0" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-1 text-center text-sm font-700 text-ink outline-none transition focus:border-indigo-400 focus:ring-2" />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[10px] font-700 uppercase tracking-wide text-slate-400">Sur</label>
                    <input type="number" min={1} step={1} value={g.maxScore || ''} onChange={e => updateGrade(i, 'maxScore', parseFloat(e.target.value) || 20)} placeholder="20" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-1 text-center text-sm font-600 text-ink outline-none transition focus:border-indigo-400 focus:ring-2" />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[10px] font-700 uppercase tracking-wide text-slate-400">Coef.</label>
                    <input type="number" min={1} step={0.5} value={g.coefficient || ''} onFocus={e => e.currentTarget.select()} onChange={e => updateGrade(i, 'coefficient', e.target.value === '' ? 1 : parseFloat(e.target.value))} placeholder="1" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-1 text-center text-sm font-600 text-ink outline-none transition focus:border-indigo-400 focus:ring-2" />
                  </div>
                </div>
                {/* Desktop: inline fields (hidden on mobile) */}
                <input type="number" min={0} step={0.5} value={g.score || ''} onChange={e => updateGrade(i, 'score', parseFloat(e.target.value) || 0)} placeholder="0" className="hidden h-9 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm font-700 text-ink outline-none transition focus:border-indigo-400 focus:ring-2 sm:w-16 sm:block" />
                <input type="number" min={1} step={1} value={g.maxScore || ''} onChange={e => updateGrade(i, 'maxScore', parseFloat(e.target.value) || 20)} placeholder="20" className="hidden h-9 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm font-600 text-ink outline-none transition focus:border-indigo-400 focus:ring-2 sm:w-16 sm:block" />
                <input type="number" min={1} step={0.5} value={g.coefficient || ''} onChange={e => updateGrade(i, 'coefficient', parseFloat(e.target.value) || 1)} placeholder="1" className="hidden h-9 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm font-600 text-ink outline-none transition focus:border-indigo-400 focus:ring-2 sm:w-16 sm:block" />
                <button onClick={() => removeGrade(i)} className="hidden h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 sm:grid"><Trash2 className="h-4 w-4" /></button>
                <button onClick={() => removeGrade(i)} className="mt-2 inline-flex items-center gap-1 text-xs font-600 text-red-500 sm:hidden"><Trash2 className="h-3.5 w-3.5" /> Supprimer cette matière</button>
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

        {bulletinFormat === 'lycee-malien' && (
          <section className="min-w-0 rounded-2xl border-2 border-emerald-200 bg-white shadow-sm">
            <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3">
              <h3 className="text-base font-800 text-emerald-950">Notes du bulletin — lycée malien</h3>
              <p className="mt-1 text-sm font-600 text-emerald-900">Les matières viennent du tableau ci-dessus. Fais défiler le tableau horizontalement sur téléphone.</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm font-bold text-emerald-950">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showLyceeRank} onChange={e => setShowLyceeRank(e.target.checked)} className="h-4 w-4 accent-emerald-700" />Afficher les rangs</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showLyceeMention} onChange={e => setShowLyceeMention(e.target.checked)} className="h-4 w-4 accent-emerald-700" />Afficher les mentions</label>
              </div>
            </div>
            <div className="max-w-full overflow-x-auto overscroll-x-contain touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-max min-w-[650px] border-collapse text-sm">
                <thead><tr className="bg-slate-100 text-slate-900">{['N°','Matière','Note de classe /20','Composition /40',...(showLyceeRank?['Rang']:[])].map(label => <th key={label} className="border border-slate-300 px-2 py-3 text-left font-800">{label}</th>)}</tr></thead>
                <tbody>{[...grades.filter(g => g.subject.trim()), { id: '__conduite__', subject: 'Conduite', score: 18, maxScore: 20, coefficient: 1 } as GradeRow].map((g, index) => {
                  const isConduct = g.subject === 'Conduite';
                  return <tr key={g.id || g.subject}>
                    <td className="border border-slate-300 px-2 py-2 text-center font-700">{index + 1}</td>
                    <td className="border border-slate-300 px-2 py-2 font-800 text-slate-900">{g.subject}</td>
                    <td className="border border-slate-300 p-2">{<input aria-label={'Note de classe '+g.subject} type="number" min="0" max="20" step="0.5" value={lyceeScores[g.subject]?.classScore ?? (isConduct ? '18' : '')} onChange={e => updateLyceeScore(g.subject,'classScore',e.target.value)} className="w-full min-w-[100px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-700 text-slate-950" />}</td>
                    <td className="border border-slate-300 p-2">{isConduct ? <span className="px-3 font-700 text-slate-500">—</span> : <input aria-label={'Composition sur 40 '+g.subject} type="number" min="0" max="40" step="0.5" value={lyceeScores[g.subject]?.compositionScore ?? ''} onChange={e => updateLyceeScore(g.subject,'compositionScore',e.target.value)} className="w-full min-w-[100px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-700 text-slate-950" />}</td>
                    {showLyceeRank && <td className="border border-slate-300 p-2">{isConduct ? <span className="px-3 font-700 text-slate-500">—</span> : <input aria-label={'Rang de '+g.subject} type="number" min="1" value={lyceeScores[g.subject]?.rank ?? ''} onChange={e => updateLyceeScore(g.subject,'rank',e.target.value)} className="w-full min-w-[70px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-700 text-slate-950" />}</td>}
                  </tr>;
                })}</tbody>
              </table>
            </div>
            <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-2">
              <label className="text-sm font-800 text-slate-800">Rang général<input type="number" min="1" value={lyceeScores['__summary__']?.rank ?? ''} onChange={e => updateLyceeScore('__summary__','rank',e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-700 text-slate-950" placeholder="Ex. 2" /></label>
              <label className="text-sm font-800 text-slate-800">Moyenne du premier<input type="number" min="0" max="20" step="0.01" value={lyceeScores['__summary__']?.classScore ?? ''} onChange={e => updateLyceeScore('__summary__','classScore',e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-700 text-slate-950" placeholder="Ex. 18,61" /></label>
            </div>
          </section>
        )}
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
    const formatColor = bulletinFormat === 'personnalise' ? customBulletinColor : bulletinFormat === 'moderne' ? '#0f766e' : bulletinFormat === 'officiel' ? '#334155' : bulletinFormat === 'minimal' ? '#64748b' : '#1d4ed8';
    const formatBorder = bulletinFormat === 'officiel' ? '4px solid ' + formatColor : bulletinFormat === 'minimal' ? '1px solid #cbd5e1' : '2px solid ' + formatColor;
    return (
      <div className="space-y-4">
        {stampCropDraft && <ImageCropper image={stampCropDraft} aspectRatio={1} allowFreeform title="le cachet" onCancel={() => setStampCropDraft(null)} onApply={image => {
          try { localStorage.setItem('gestilys-school-stamp-' + schoolId, image); setSchoolStamp(image); }
          catch { window.alert('Image du cachet trop volumineuse. Choisissez une image plus légère.'); }
          setStampCropDraft(null);
        }} />}
        <div className="print:hidden rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm font-700 text-slate-700">Format du bulletin
              <select value={bulletinFormat} onChange={e=>{setBulletinFormat(e.target.value);setFormatSaved(false);}} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base">
                <option value="classique">1. Classique malien</option><option value="moderne">2. Moderne coloré</option><option value="compact">3. Compact</option><option value="officiel">4. Institutionnel</option><option value="minimal">5. Minimaliste</option><option value="lycee-malien">6. Lycée malien (classe + composition)</option><option value="personnalise">Personnaliser mon format</option>
              </select>
            </label>
            <label className="flex-1 text-sm font-700 text-slate-700">Devise de l’école<input type="text" maxLength={80} value={schoolMotto} onChange={e=>{setSchoolMotto(e.target.value);setFormatSaved(false);}} placeholder="Ex. Travail – Discipline – Réussite" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base" /></label>
            {bulletinFormat==='personnalise'&&<><label className="text-sm font-700 text-slate-700">Couleur principale<input type="color" value={customBulletinColor} onChange={e=>{setCustomBulletinColor(e.target.value);setFormatSaved(false);}} className="mt-1 block h-12 w-full rounded-lg border border-slate-300 p-1"/></label><div className="grid grid-cols-1 gap-2 text-xs text-slate-700 sm:grid-cols-3"><label className="flex items-center gap-2"><input type="checkbox" checked={showStudentPhoto} onChange={e=>{setShowStudentPhoto(e.target.checked);setFormatSaved(false);}}/> Photo de l’élève</label><label className="flex items-center gap-2"><input type="checkbox" checked={showParentName} onChange={e=>{setShowParentName(e.target.checked);setFormatSaved(false);}}/> Nom du parent</label><label className="flex items-center gap-2"><input type="checkbox" checked={showRank} onChange={e=>{setShowRank(e.target.checked);setFormatSaved(false);}}/> Afficher le rang</label></div></>}
            <button onClick={()=>{localStorage.setItem('gestilys-bulletin-format-'+schoolId,JSON.stringify({format:bulletinFormat,color:customBulletinColor,showSchoolLogo:true,showStudentPhoto,showParentName,showRank,schoolMotto}));setFormatSaved(true);}} className="rounded-xl bg-indigo-700 px-4 py-3 text-sm font-800 text-white">{formatSaved?'Format enregistré':'Enregistrer le format'}</button>
          </div>
          <label className="mt-3 block rounded-xl border border-dashed border-indigo-200 bg-white p-3 text-sm font-700 text-slate-700">
            Cachet de l’école (photo ou image)
            <input type="file" accept="image/*" className="mt-2 block w-full text-xs" onChange={e => {
              const file = e.currentTarget.files?.[0]; e.currentTarget.value = '';
              if (!file || !file.type.startsWith('image/')) return;
              const reader = new FileReader();
              reader.onload = () => { if (typeof reader.result === 'string') setStampCropDraft(reader.result); };
              reader.onerror = () => window.alert('Impossible de lire cette image. Choisissez une autre photo.');
              reader.readAsDataURL(file);
            }}/>
            {schoolStamp && <img src={schoolStamp} alt="Aperçu du cachet" className="mt-2 h-16 w-full object-contain"/>}
            <span className="mt-1 block text-xs font-normal text-slate-500">Sur cet appareil, le même cachet sera réutilisé sur les reçus et les cartes scolaires.</span>
          </label>
          <p className="mt-2 text-xs text-slate-500">Les modèles modifient aussi la disposition, les espacements et l’en-tête. Le logo provient automatiquement des paramètres de l’école. La personnalisation permet de choisir les éléments affichés.</p>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          <button onClick={() => setMode('edit')} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 active:scale-95"><ArrowLeft className="h-4 w-4" /></button>
          <div className="flex-1">
            <h1 className="font-display text-xl font-700 text-ink">Aperçu du bulletin</h1>
            <p className="text-sm text-slate-500">{selectedStudent.firstName} {selectedStudent.lastName} · {periodLabel}</p>
          </div>
          <button onClick={() => window.print()} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-indigo-700 px-4 text-sm font-700 text-white shadow-sm transition hover:bg-indigo-800 active:scale-95"><Printer className="h-4 w-4" /> Imprimer / PDF</button>
        </div>

        {/* Printable bulletin */}
        <div id="bulletin-print" className={`mx-auto max-w-2xl bg-white shadow-card print:shadow-none print:p-0 ${bulletinFormat==='compact'?'p-3 sm:p-4':bulletinFormat==='minimal'?'p-5 sm:p-6':'rounded-2.5xl p-6 sm:p-8'}`} style={{border:formatBorder,borderRadius:bulletinFormat==='officiel'?'0':bulletinFormat==='minimal'?'4px':'18px',fontFamily:bulletinFormat==='officiel'?'Georgia,serif':'inherit'}}>
          {/* Header */}
          <div className={`pb-4 ${bulletinFormat==='moderne'?'text-left':'text-center'} ${bulletinFormat==='officiel'?'uppercase tracking-wide':''}`} style={{borderBottom:bulletinFormat==='officiel'?'double 5px '+formatColor:'3px solid '+formatColor,background:bulletinFormat==='moderne'?'#f0fdfa':bulletinFormat==='officiel'?'#f8fafc':bulletinFormat==='minimal'?'#ffffff':'transparent',padding:bulletinFormat==='moderne'?'14px':bulletinFormat==='compact'?'4px 0':'8px 0',borderRadius:bulletinFormat==='officiel'?'0':bulletinFormat==='minimal'?'0':'8px'}}>
            <div className={`flex items-center justify-center gap-3 ${bulletinFormat==='moderne'?'flex-row text-left':'flex-col text-center'}`}>
              {schoolLogo ? <img src={schoolLogo} alt="Logo de l’école" className="h-12 w-12 shrink-0 object-contain print:h-10 print:w-10" /> : <div className="print:hidden rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">Ajoutez le logo dans Paramètres.</div>}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-800 uppercase tracking-widest text-slate-700">RÉPUBLIQUE DU MALI</p>
                <p className="text-[10px] font-700 text-slate-600">Un Peuple – Un But – Une Foi</p>
                <h2 className="font-display text-xl font-800 sm:text-2xl" style={{color:formatColor}}>{schoolName || 'École'}</h2>
                {schoolMotto.trim() && <p className="text-xs font-700 italic text-slate-600">{schoolMotto}</p>}
                <p className="mt-1 text-sm text-slate-600">Bulletin de notes · Année scolaire {academicYear}</p>
                <p className="mt-0.5 text-sm font-600 text-slate-700">{periodLabel}</p>
              </div>
            </div>
          </div>

          {/* Student info */}
          <div className={`mt-4 flex flex-wrap justify-between gap-4 text-sm ${bulletinFormat==='compact'?'text-xs':''}`}>
            {showStudentPhoto && studentPhotos[selectedStudent.id] && <img src={studentPhotos[selectedStudent.id]} alt="Photo de l’élève" className="h-20 w-16 rounded-md border border-slate-200 object-cover" />}
            <div>
              <span className="text-slate-400">Élève : </span>
              <span className="font-700 text-ink">{selectedStudent.firstName} {selectedStudent.lastName}</span>
            </div>
            {showParentName && <div><span className="text-slate-400">Parent : </span><span className="font-700 text-ink">{selectedStudent.parentName || '—'}</span></div>}
            <div>
              <span className="text-slate-400">Classe : </span>
              <span className="font-700 text-ink">{selectedStudent.className}</span>
            </div>
          </div>

          {/* Grades table */}
          {bulletinFormat === 'lycee-malien' ? (() => {
            const subjectRows = [...grades.filter(g => g.subject.trim()), { id: '__conduite__', subject: 'Conduite', score: 18, maxScore: 20, coefficient: 1 } as GradeRow];
            const scoredRows = subjectRows.filter(g => g.subject === 'Conduite' || (lyceeScores[g.subject]?.classScore !== undefined && lyceeScores[g.subject].classScore !== '' && lyceeScores[g.subject]?.compositionScore !== undefined && lyceeScores[g.subject].compositionScore !== ''));
            const totalCoefficient = scoredRows.reduce((sum, g) => sum + (Number(g.coefficient) || 1), 0);
            const totalPoints = scoredRows.reduce((sum, g) => sum + lyceeAverage(g.subject) * (Number(g.coefficient) || 1), 0);
            const totalMax = totalCoefficient * 20;
            return <div className="mt-4">
              <div className="mb-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div className="rounded border border-slate-300 p-2"><b>Classe :</b> {selectedStudent.className}</div>
                <div className="rounded border border-slate-300 p-2"><b>Matières :</b> {subjectRows.length}</div>
                <div className="rounded border border-slate-300 p-2"><b>Effectif :</b> {classStats.count || students.filter(s => s.className === selectedStudent.className).length}</div>
                <div className="rounded border border-slate-300 p-2"><b>Rang :</b> {classStats.rank ? classStats.rank + 'e' : '—'}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] table-fixed border-collapse text-xs sm:text-sm">
                  <thead><tr className="bg-slate-100 text-slate-900">{['N°','Matières','Note classe /20','Compo /40',...(showLyceeRank?['Rang']:[]),'Moy. générale','Coef.','Moy. coef.',...(showLyceeMention?['Mention']:[])].map(label => <th key={label} className="border border-slate-500 px-1 py-2 text-center font-bold">{label}</th>)}</tr></thead>
                  <tbody>{subjectRows.map((g, index) => {
                    const score = lyceeAverage(g.subject);
                    const coef = Number(g.coefficient) || 1;
                    const points = score * coef;
                    const isConduct = g.subject === 'Conduite';
                    const scoreEntry = lyceeScores[g.subject];
                    const hasCompleteScore = isConduct || (scoreEntry?.classScore !== undefined && scoreEntry.classScore !== '' && scoreEntry?.compositionScore !== undefined && scoreEntry.compositionScore !== '');
                    return <tr key={g.id || g.subject}>
                      <td className="border border-slate-500 px-1 py-1 text-center">{index + 1}</td>
                      <td className="w-[105px] max-w-[105px] break-words border border-slate-500 px-1 py-1 font-semibold">{g.subject}</td>
                      <td className="border border-slate-500 p-1 text-center">{isConduct ? Number(lyceeScores.Conduite?.classScore ?? 18).toFixed(2) : (lyceeScores[g.subject]?.classScore === undefined || lyceeScores[g.subject]?.classScore === '' ? '—' : Number(lyceeScores[g.subject].classScore).toFixed(2))}</td>
                      <td className="border border-slate-500 p-1 text-center">{isConduct ? '—' : (lyceeScores[g.subject]?.compositionScore === undefined || lyceeScores[g.subject]?.compositionScore === '' ? '—' : Number(lyceeScores[g.subject].compositionScore).toFixed(2))}</td>
                      {showLyceeRank && <td className="border border-slate-500 p-1 text-center">{isConduct ? '—' : (lyceeScores[g.subject]?.rank ? lyceeScores[g.subject].rank + 'e' : '—')}</td>}
                      <td className="border border-slate-500 px-1 py-1 text-center font-bold">{hasCompleteScore ? score.toFixed(2) : '—'}</td>
                      <td className="border border-slate-500 px-1 py-1 text-center">{coef}</td>
                      <td className="border border-slate-500 px-1 py-1 text-center font-bold">{hasCompleteScore ? points.toFixed(2) : '—'}</td>
                      {showLyceeMention && <td className="border border-slate-500 px-1 py-1 text-center">{isConduct ? 'Bonne' : hasCompleteScore ? lyceeMention(score) : '—'}</td>}
                    </tr>;
                  })}</tbody>
                  <tfoot><tr className="bg-slate-100 font-bold"><td colSpan={5 + (showLyceeRank ? 1 : 0)} className="border border-slate-500 px-2 py-2 text-right">TOTAL</td><td className="border border-slate-500 px-1 py-2 text-center">{totalCoefficient}</td><td className="border border-slate-500 px-1 py-2 text-center">{totalPoints.toFixed(2)}</td>{showLyceeMention && <td className="border border-slate-500 px-1 py-2 text-center">Maximum : {totalMax}</td>}</tr></tfoot>
                </table>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><b>Moyenne :</b> {(totalCoefficient ? totalPoints / totalCoefficient : 0).toFixed(2)} / 20</div>
                <div><b>Rang :</b> {lyceeScores['__summary__']?.rank ? lyceeScores['__summary__'].rank + 'e / ' + (classStats.count || students.filter(s => s.className === selectedStudent.className).length) + ' élèves classés' : 'À renseigner'}</div>
                <div><b>Moyenne du premier :</b> {lyceeScores['__summary__']?.classScore ? Number(lyceeScores['__summary__'].classScore).toFixed(2) : 'À renseigner'}</div>
                <div className="text-right"><b>{schoolName || 'École'}, le</b> {new Date().toLocaleDateString('fr-FR')}</div>
              </div>
              <p className="mt-3 text-xs italic text-slate-600"></p>
            </div>;
          })() : <table className={`mt-4 w-full border-collapse ${bulletinFormat==='compact'?'text-xs':'text-sm'}`} style={{border:bulletinFormat==='minimal'?'none':undefined}}>
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
          </table>}

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
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-2 text-center"><div className="text-[10px] font-700 uppercase text-blue-700">Total des points</div><div className="mt-1 text-sm font-800 text-blue-950">{grades.filter(g => g.subject.trim()).reduce((sum, g) => sum + g.score * g.coefficient, 0).toFixed(2)}</div></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center"><div className="text-[10px] font-700 uppercase text-slate-600">Effectif classe</div><div className="mt-1 text-sm font-800 text-slate-900">{classStats.count || students.filter(student => student.className === selectedStudent.className).length}</div></div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-center"><div className="text-[10px] font-700 uppercase text-emerald-700">Moyenne la plus forte</div><div className="mt-1 text-sm font-800 text-emerald-950">{classStats.highest === null ? "—" : classStats.highest.toFixed(2) + "/20"}</div></div>
                <div className="rounded-lg border border-rose-100 bg-rose-50 p-2 text-center"><div className="text-[10px] font-700 uppercase text-rose-700">Moyenne la plus faible</div><div className="mt-1 text-sm font-800 text-rose-950">{classStats.lowest === null ? "—" : classStats.lowest.toFixed(2) + "/20"}</div></div>
              </div>
              {showRank && <div className="mt-2 text-right text-xs font-700 text-slate-700">Rang : {classStats.rank ? classStats.rank + " / " + classStats.count : "non disponible"}</div>}
            </>
          )}

          {appreciation && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-700 uppercase tracking-wider text-slate-500">Appréciation du conseil de classe</div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink">{appreciation}</p>
            </div>
          )}

          {/* Signature et cachet de l’établissement */}
          <div className="mt-8 flex flex-wrap items-end justify-between gap-4 text-xs text-slate-500">
            <div className="min-w-[120px] text-center">
              <div className="border-t border-slate-300 pt-1">Le directeur / La directrice</div>
            </div>
            <div className="flex min-w-[110px] flex-col items-center gap-1 text-center">
              {schoolStamp ? <img src={schoolStamp} alt="Cachet de l’établissement" className="h-8 w-10 object-contain print:h-6 print:w-8" /> : <div className="h-8 w-10 rounded border border-dashed border-slate-300 print:hidden" />}
              <span>Cachet de l’école</span>
            </div>
            <div className="min-w-[100px] text-center">
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
