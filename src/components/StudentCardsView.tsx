import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CreditCard, Printer, Upload, Users, UserRound } from 'lucide-react';
import type { Student } from '../types';
import { ImageCropper } from './ImageCropper';
import { DEFAULT_STUDENT_CARD_FIELDS, loadStudentCardFields, saveStudentCardFields, loadStudentCardPhotos, saveStudentCardPhoto, type StudentCardFields } from '../lib/db';

type Mode = 'individual' | 'class';

export function StudentCardsView({ students, schoolId, schoolName, schoolLogo, onSchoolLogoChange }: { students: Student[]; schoolId: string; schoolName: string; schoolLogo: string; onSchoolLogoChange: (logoData: string) => Promise<void> }) {
  const [mode, setMode] = useState<Mode>('class');
  const [largePreview, setLargePreview] = useState(false);
  const [className, setClassName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [localSchoolLogo, setLocalSchoolLogo] = useState(schoolLogo);
  const [schoolStamp, setSchoolStamp] = useState('');
  useEffect(() => { setLocalSchoolLogo(schoolLogo); }, [schoolLogo]);
  useEffect(() => { try { setSchoolStamp(localStorage.getItem('gestilys-school-stamp-' + schoolId) || ''); } catch { setSchoolStamp(''); } }, [schoolId]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    loadStudentCardPhotos(schoolId)
      .then(savedPhotos => { if (alive) setPhotos(savedPhotos); })
      .catch(() => { if (alive) window.alert('Impossible de charger les photos enregistrées. Vérifiez la connexion puis rechargez la page.'); });
    return () => { alive = false; };
  }, [schoolId]);
  const [cropDraft, setCropDraft] = useState<{ image: string; target: 'logo' | string } | null>(null);
  const [accent, setAccent] = useState('#273c75');
  const [cardFormat, setCardFormat] = useState('mali-officiel');
  const [schoolMotto, setSchoolMotto] = useState('');
  const [cardConfigLoaded, setCardConfigLoaded] = useState(false);
  const [cardFields, setCardFields] = useState<StudentCardFields>(DEFAULT_STUDENT_CARD_FIELDS);
  const [fieldsSaving, setFieldsSaving] = useState(false);
  useEffect(() => { let alive = true; loadStudentCardFields(schoolId).then(fields => { if (alive) setCardFields(fields); }).catch(() => { if (alive) window.alert('Impossible de charger les options de carte.'); }); return () => { alive = false; }; }, [schoolId]);
  const toggleCardField = async (key: keyof StudentCardFields) => {
    const previous = cardFields;
    const next = { ...previous, [key]: !previous[key] };
    setCardFields(next);
    setFieldsSaving(true);
    try { await saveStudentCardFields(schoolId, next); }
    catch { setCardFields(previous); window.alert('Les options de carte n’ont pas été enregistrées. Réessayez.'); }
    finally { setFieldsSaving(false); }
  };
  const logoGalleryRef = useRef<HTMLInputElement>(null);
  const logoCameraRef = useRef<HTMLInputElement>(null);
  const photoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [academicYear, setAcademicYear] = useState(() => {
    const now = new Date();
    const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return start + '-' + (start + 1);
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gestilys-card-design-' + schoolId);
      if (saved) {
        const config = JSON.parse(saved);
        setCardFormat(config.format || 'mali-officiel');
        setAccent(config.accent || '#273c75');
        setSchoolMotto(config.schoolMotto || '');
      }
    } catch { /* Optional local card design settings */ }
    finally { setCardConfigLoaded(true); }
  }, [schoolId]);
  useEffect(() => {
    if (!cardConfigLoaded) return;
    try { localStorage.setItem('gestilys-card-design-' + schoolId, JSON.stringify({ format: cardFormat, accent, schoolMotto })); }
    catch { /* Settings remain usable for this session */ }
  }, [schoolId, cardConfigLoaded, cardFormat, accent, schoolMotto]);

  const classes = useMemo(() => [...new Set(students.map(s => s.className).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')), [students]);
  const eligibleStudents = useMemo(() => mode === 'individual'
    ? students.filter(s => !className || s.className === className)
    : students.filter(s => s.className === className), [students, mode, className]);
  const selectedStudents = useMemo(() => mode === 'individual'
    ? eligibleStudents.filter(s => s.id === studentId)
    : eligibleStudents, [eligibleStudents, mode, studentId]);

  const readImage = async (file: File, onRead: (data: string) => void) => {
    if (!file.type.startsWith('image/')) {
      window.alert('Choisissez un fichier image (JPG, PNG ou WebP).');
      return;
    }
    // Resize before keeping the image in React state: phone camera originals can be huge.
    let objectUrl = '';
    try {
      let source: CanvasImageSource;
      let width: number;
      let height: number;
      if (typeof createImageBitmap === 'function') {
        const bitmap = await createImageBitmap(file);
        source = bitmap;
        width = bitmap.width;
        height = bitmap.height;
      } else {
        // Compatibility fallback for older mobile browsers.
        objectUrl = URL.createObjectURL(file);
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Image load failed'));
          img.src = objectUrl;
        });
        source = image;
        width = image.naturalWidth;
        height = image.naturalHeight;
      }
      const maxSide = 1000;
      const scale = Math.min(1, maxSide / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        if ('close' in source && typeof source.close === 'function') source.close();
        window.alert('Impossible de préparer cette image. Essayez une autre photo.');
        return;
      }
      // JPEG compression keeps memory use low on mobile devices.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      if ('close' in source && typeof source.close === 'function') source.close();
      const data = await new Promise<string>((resolve, reject) => {
        canvas.toBlob(blob => {
          if (!blob) {
            reject(new Error('Image compression failed'));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Image read failed'));
          reader.onerror = () => reject(new Error('Image read failed'));
          reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.82);
      });
      onRead(data);
    } catch {
      window.alert('Cette photo n’a pas pu être traitée. Essayez une image JPG ou PNG moins volumineuse.');
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  };

  const printCards = () => {
    if (!selectedStudents.length) {
      window.alert(mode === 'individual' ? 'Sélectionnez un élève.' : 'Sélectionnez une classe.');
      return;
    }
    const previousTitle = document.title;
    document.title = schoolName?.trim() || 'Carte scolaire';
    window.addEventListener('afterprint', () => { document.title = previousTitle; }, { once: true });
    window.print();
  };

  return (
<div className={`student-cards-view animate-fadeIn ${largePreview ? "student-cards-zoom" : ""}`}>
      <style>{".student-cards-view.student-cards-zoom .student-cards-print { grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 20px; } .student-cards-view.student-cards-zoom .student-id-card { height: 320px; max-width: 520px; border-radius: 16px; } .student-cards-view.student-cards-zoom .student-id-card .student-card-header img, .student-cards-view.student-cards-zoom .student-id-card .student-card-logo-fallback { width: 48px; height: 48px; } .student-cards-view.student-cards-zoom .student-id-card .student-card-header p:first-child { font-size: 17px; } .student-cards-view.student-cards-zoom .student-id-card .student-card-header p:last-child { font-size: 12px; } .student-cards-view.student-cards-zoom .student-id-card .student-card-main { gap: 14px; margin-top: 12px; } .student-cards-view.student-cards-zoom .student-id-card .student-card-photo-column { width: 112px; } .student-cards-view.student-cards-zoom .student-id-card .student-photo-frame { width: 100px !important; height: 130px !important; min-width: 100px !important; min-height: 130px !important; max-width: 100px !important; max-height: 130px !important; flex: 0 0 100px !important; } .student-cards-view.student-cards-zoom .student-id-card .student-card-info-column > p:first-child, .student-cards-view.student-cards-zoom .student-id-card .student-card-info-column > p:nth-child(3) { font-size: 13px; } .student-cards-view.student-cards-zoom .student-id-card .student-card-info-column > p:nth-child(2), .student-cards-view.student-cards-zoom .student-id-card .student-card-info-column > p:nth-child(4) { font-size: 21px; } .student-cards-view.student-cards-zoom .student-id-card .student-card-info-column > .grid p:first-child { font-size: 12px; } .student-cards-view.student-cards-zoom .student-id-card .student-card-info-column > .grid p:last-child { font-size: 15px; } .student-cards-view.student-cards-zoom .student-id-card > div.relative { padding: 18px; }"}</style>
      <style>{`
        /* Keep photo and crop layer inside the photo column; text always stays in its own foreground column. */
        .student-id-card { isolation: isolate; }
        .student-id-card .student-card-photo-column { position: relative; z-index: 1 !important; overflow: hidden; }
        .student-id-card .student-photo-frame { position: relative !important; z-index: 1 !important; }
        .student-id-card .student-card-info-column { position: relative; z-index: 2 !important; min-width: 0; overflow-wrap: anywhere; }
        .student-id-card .student-card-main { position: relative; z-index: 1; }
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          body * { visibility: hidden !important; }
          .student-cards-print, .student-cards-print * { visibility: visible !important; }
          .student-cards-print { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; display: grid !important; grid-template-columns: repeat(2, 85.6mm) !important; gap: 6mm !important; align-items:start !important; }
          .student-id-card { width: 85.6mm !important; height: 54mm !important; min-height:54mm !important; max-width:none !important; margin: 0 !important; box-shadow: none !important; overflow:hidden !important; break-inside: avoid !important; page-break-inside: avoid !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .student-id-card > div.relative { padding: 1.5mm !important; }
          .student-id-card .student-card-details { gap: 0 !important; }
          .student-id-card .student-card-details > p { margin-top: 0.35mm !important; line-height: 1.15 !important; white-space: normal !important; overflow: visible !important; text-overflow: clip !important; }
          .student-id-card .student-card-header { padding-bottom: 0.7mm !important; gap: 1mm !important; }
          .student-id-card .student-card-header img, .student-id-card .student-card-header .student-card-logo-fallback { width: 6mm !important; height: 6mm !important; }
          /* Explicit print columns avoid depending on DOM child-order selectors. */
          .student-id-card .student-card-main { display: grid !important; grid-template-columns: 18mm minmax(0, 1fr) !important; column-gap: 2mm !important; align-items: start !important; margin-top: 1mm !important; min-height: 0 !important; height: 31mm !important; flex: 0 0 31mm !important; width: 100% !important; overflow: hidden !important; }
          .student-id-card .student-card-photo-column { display: flex !important; flex-direction: column !important; align-items: center !important; grid-column: 1 !important; grid-row: 1 !important; width: 18mm !important; min-width: 18mm !important; max-width: 18mm !important; flex: none !important; margin: 0 !important; }
          .student-id-card .student-card-info-column { display: block !important; grid-column: 2 !important; grid-row: 1 !important; width: 100% !important; min-width: 0 !important; max-width: 100% !important; flex: none !important; overflow: hidden !important; overflow-wrap: anywhere !important; }
          .student-id-card .student-card-main .student-card-details { min-height: 0 !important; min-width: 0 !important; overflow: visible !important; }
          .student-id-card .student-card-main p { margin: 0 !important; padding: 0 !important; line-height: 1.05 !important; white-space: normal !important; overflow-wrap: anywhere !important; }
          .student-id-card .student-card-info-column > p:nth-child(odd) { font-size: 6.5pt !important; line-height: 1.05 !important; }
          .student-id-card .student-card-info-column > p:nth-child(even) { font-size: 8pt !important; line-height: 1.05 !important; font-weight: 700 !important; }
          .student-id-card .student-card-info-column > .grid { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 0.35mm 1.5mm !important; margin-top: 0.6mm !important; }
          .student-id-card .student-card-info-column > .grid > div { min-width: 0 !important; overflow: visible !important; overflow-wrap: anywhere !important; }
          .student-id-card .student-card-info-column > .grid p:first-child { font-size: 6pt !important; line-height: 1 !important; white-space: nowrap !important; }
          .student-id-card .student-card-info-column > .grid p:last-child { font-size: 7pt !important; line-height: 1.05 !important; font-weight: 600 !important; overflow-wrap: anywhere !important; }
          .student-id-card .student-card-main .student-card-birth-value { display: block !important; visibility: visible !important; font-size: 7pt !important; line-height: 1.05 !important; overflow-wrap: anywhere !important; white-space: normal !important; }
          .student-id-card .student-card-main .student-photo-frame { margin: 0 !important; }
          .student-id-card img:not(.student-photo-frame) { max-width:100% !important; }
          .student-id-card .student-photo-frame { width:18mm !important; height:23mm !important; min-width:18mm !important; min-height:23mm !important; max-width:18mm !important; max-height:23mm !important; flex:0 0 18mm !important; object-fit:cover !important; object-position:center 20% !important; }
          .student-card-photo-upload { display: none !important; }
          .student-cards-print-empty { display: none !important; }
        }
      `}</style>

      {cropDraft && <ImageCropper image={cropDraft.image} aspectRatio={cropDraft.target === 'logo' ? 1 : 18 / 23} allowFreeform={cropDraft.target !== 'logo'} title={cropDraft.target === 'logo' ? 'le logo' : cropDraft.target === 'stamp' ? 'le cachet' : 'la photo de l’élève'} onCancel={() => setCropDraft(null)} onApply={image => { const target = cropDraft.target; setCropDraft(null); if (target === 'logo') { setLocalSchoolLogo(image); void onSchoolLogoChange(image).catch(() => window.alert('Le logo recadré n’a pas pu être enregistré. Réessayez.')); } else if (target === 'stamp') { try { localStorage.setItem('gestilys-school-stamp-' + schoolId, image); setSchoolStamp(image); } catch { window.alert('Image du cachet trop volumineuse. Choisissez une image plus légère.'); } } else { void saveStudentCardPhoto(schoolId, target, image).then(() => setPhotos(prev => ({ ...prev, [target]: image }))).catch(() => window.alert('La photo n’a pas pu être enregistrée. Vérifiez la connexion puis réessayez.')); } }} />}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wider text-royal-700"><CreditCard className="h-3 w-3" /> Scolarité</div>
          <h1 className="font-display text-2xl font-700 tracking-tight text-ink sm:text-3xl">Cartes scolaires</h1>
          <p className="mt-1 text-sm text-slate-500">Créez une carte individuelle ou les cartes d'une classe, puis imprimez ou enregistrez en PDF.</p>
        </div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setLargePreview(v => !v)} disabled={!selectedStudents.length} className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-700 text-slate-700 disabled:opacity-40">{largePreview ? "Aperçu normal" : "Aperçu agrandi"}</button><button onClick={printCards} disabled={!selectedStudents.length} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-royal-700 to-royal-900 px-4 text-sm font-700 text-white shadow-card disabled:cursor-not-allowed disabled:opacity-40"><Printer className="h-4 w-4" /> Enregistrer en PDF / Imprimer</button></div>
      </div>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-3 font-700 text-ink">Aucun élève enregistré</h2>
          <p className="mt-1 text-sm text-slate-500">Ajoutez d'abord des élèves dans le cahier de caisse.</p>
        </div>
      ) : (
        <>
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
            <h2 className="mb-4 font-display text-base font-700 text-ink">1. Préparer les cartes</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-700 text-slate-500">Type de génération</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setMode('individual')} className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-700 ${mode === 'individual' ? 'border-royal-500 bg-royal-50 text-royal-700' : 'border-slate-200 text-slate-600'}`}><UserRound className="h-4 w-4" /> Individuelle</button>
                  <button onClick={() => { setMode('class'); setStudentId(''); }} className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-700 ${mode === 'class' ? 'border-royal-500 bg-royal-50 text-royal-700' : 'border-slate-200 text-slate-600'}`}><Users className="h-4 w-4" /> Par classe</button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-700 text-slate-500">Classe</label>
                <select value={className} onChange={e => { setClassName(e.target.value); setStudentId(''); }} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                  <option value="">{mode === 'individual' ? 'Toutes les classes' : 'Choisir une classe…'}</option>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {mode === 'individual' && (
                <div>
                  <label className="mb-1.5 block text-xs font-700 text-slate-500">Élève</label>
                  <select value={studentId} onChange={e => setStudentId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                    <option value="">Sélectionner un élève…</option>
                    {eligibleStudents.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} — {s.className}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-700 text-slate-500">Année scolaire</label>
                <input value={academicYear} onChange={e => setAcademicYear(e.target.value)} maxLength={9} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" placeholder="2026-2027" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-700 text-slate-500">Modèle de carte (5 formats)</label>
                <select value={cardFormat} onChange={e => setCardFormat(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                  <option value="mali-officiel">1. Institutionnel malien</option>
                  <option value="tricolore">2. Tricolore du Mali</option>
                  <option value="bandeau">3. Bandeau moderne</option>
                  <option value="elegant">4. Élégant doré</option>
                  <option value="minimal">5. Sobre et compact</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-700 text-slate-500">Devise de l'école</label>
                <input value={schoolMotto} onChange={e => setSchoolMotto(e.target.value)} maxLength={80} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" placeholder="Ex. Travail – Discipline – Réussite" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-700 text-slate-500">Logo de l'école (facultatif)</label>
                <div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => logoGalleryRef.current?.click()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-600 text-slate-600 hover:bg-slate-50"><Upload className="h-4 w-4" /> Galerie / fichiers</button>
                    <button type="button" onClick={() => logoCameraRef.current?.click()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-600 text-slate-600 hover:bg-slate-50"><Camera className="h-4 w-4" /> Prendre une photo</button>
                  </div>
                  <input ref={logoGalleryRef} type="file" accept="image/*" className="hidden" onChange={e => { const input = e.currentTarget; const f = input.files?.[0]; if (f) void readImage(f, data => setCropDraft({ image: data, target: 'logo' })); input.value = ''; }} />
                  <input ref={logoCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const input = e.currentTarget; const f = input.files?.[0]; if (f) void readImage(f, data => setCropDraft({ image: data, target: 'logo' })); input.value = ''; }} />
                </div>
              </div>
              <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-3">
                <label className="block text-xs font-700 text-slate-700">Cachet de l’école (photo ou image)
                  <input type="file" accept="image/*" className="mt-2 block w-full text-xs" onChange={e => {
                    const file = e.currentTarget.files?.[0]; e.currentTarget.value = '';
                    if (!file || !file.type.startsWith('image/')) return;
                    const reader = new FileReader();
                    reader.onload = () => { if (typeof reader.result === 'string') setCropDraft({ image: reader.result, target: 'stamp' }); };
                    reader.onerror = () => window.alert('Impossible de lire cette image. Choisissez une autre photo.');
                    reader.readAsDataURL(file);
                  }}/>
                </label>
                {schoolStamp && <img src={schoolStamp} alt="Aperçu du cachet" className="mt-2 h-14 w-full object-contain"/>}
                <p className="mt-1 text-[10px] text-slate-500">Sur cet appareil, réutilisé sur les reçus et bulletins de cette école.</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className="text-xs font-700 text-slate-600">Informations sur la carte</label>
                  <span className="text-[10px] text-slate-400">{fieldsSaving ? 'Enregistrement…' : 'Enregistré automatiquement'}</span>
                </div>
                {([
                  ['matricule', 'Matricule'],
                  ['sexe', 'Sexe'],
                  ['parentName', 'Nom du parent'],
                  ['birthDate', 'Date de naissance'],
                  ['birthPlace', 'Lieu de naissance'],
                ] as [keyof StudentCardFields, string][]).map(([key, label]) => (
                  <label key={key} className="flex min-h-9 items-center justify-between gap-3 border-t border-slate-100 py-1.5 text-xs text-slate-600">
                    <span>{label}</span>
                    <input type="checkbox" checked={cardFields[key]} onChange={() => void toggleCardField(key)} className="h-4 w-4 accent-blue-700" />
                  </label>
                ))}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-700 text-slate-500">Couleur principale</label>
                <div className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 px-3"><input aria-label="Couleur de la carte" type="color" value={accent} onChange={e => setAccent(e.target.value)} className="h-7 w-10 cursor-pointer border-0 bg-transparent" /><span className="text-sm text-slate-600">{accent.toUpperCase()}</span></div>
              </div>
            </div>
            <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">Le logo est enregistré automatiquement pour votre école. Les photos des élèves sont enregistrées dans le compte de l’école et restent disponibles après reconnexion.</p>
          </section>

          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-700 text-ink">2. Aperçu des cartes</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-700 text-slate-600">{selectedStudents.length} carte{selectedStudents.length !== 1 ? 's' : ''}</span>
          </div>

          {mode === 'class' && className && eligibleStudents.length > 0 && (
            <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">Ajoutez les photos des élèves ci-dessous si vous en avez. Sans photo, la carte affiche les initiales.</div>
          )}

          <div className="student-cards-print grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {selectedStudents.map(s => (
              <div key={s.id} className="student-card-wrapper">
                <article className={`student-id-card card-format-${cardFormat} relative flex h-[205px] w-full max-w-[325px] overflow-hidden border border-slate-200 shadow-card`} style={{ borderTop: cardFormat === 'tricolore' ? '5px solid #16834a' : cardFormat === 'bandeau' ? `8px solid ${accent}` : `5px solid ${accent}`, borderLeft: cardFormat === 'elegant' ? '3px solid #d4a72c' : undefined, borderRadius: cardFormat === 'minimal' ? '4px' : '12px', background: cardFormat === 'elegant' ? '#fffdf5' : '#ffffff' }}>
                  <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 flex h-[6px] overflow-hidden">{cardFormat === 'tricolore' ? <><span className="w-1/3 bg-[#16834a]" /><span className="w-1/3 bg-[#f5cf3d]" /><span className="w-1/3 bg-[#c93232]" /></> : <span className="h-full w-full" style={{ background: accent, opacity: cardFormat === 'minimal' ? 0.03 : cardFormat === 'elegant' ? 0.07 : 0.1 }} />}</div>
                  
                  <div className="relative z-10 flex min-w-0 flex-1 flex-col p-3">
                    <div className={`student-card-header flex items-center gap-2 border-b pb-1.5 ${cardFormat === 'tricolore' ? 'justify-center text-center' : ''}`} style={{ borderColor: cardFormat === 'elegant' ? '#e7d8a8' : '#e2e8f0', background: cardFormat === 'bandeau' ? accent : cardFormat === 'elegant' ? '#fff8df' : 'transparent', padding: cardFormat === 'bandeau' ? '4px 5px' : '0 0 6px' }}>
                      {localSchoolLogo ? <img src={localSchoolLogo} alt="Logo de l’école" className="h-8 w-8 rounded-md object-contain" style={{ background: '#fff' }} /> : <div className="student-card-logo-fallback grid h-8 w-8 place-items-center rounded-md text-white" style={{ background: cardFormat === 'tricolore' ? '#16834a' : accent }}><GraduationMark /></div>}
                      <div className="student-card-details min-w-0 flex-1">
                        <p className="truncate text-[6px] font-800 uppercase tracking-wide" style={{ color: cardFormat === 'bandeau' ? '#ffffff' : '#334155' }}>RÉPUBLIQUE DU MALI · UN PEUPLE – UN BUT – UNE FOI</p>
                        <p className="truncate text-[10px] font-800 uppercase tracking-wide" style={{ color: cardFormat === 'bandeau' ? '#ffffff' : accent }}>{schoolName || 'Établissement scolaire'}</p>
                        {schoolMotto.trim() && <p className="truncate text-[7px] font-700 italic" style={{ color: cardFormat === 'bandeau' ? '#ffffff' : '#475569' }}>{schoolMotto}</p>}
                        <p className="text-[7px] font-700 uppercase tracking-widest" style={{ color: cardFormat === 'bandeau' ? '#ffffff' : '#64748b' }}>CARTE SCOLAIRE</p>
                      </div>
                    </div>
                    <div className="student-card-main mt-2 flex min-h-0 flex-1 gap-2">
                      <div className="student-card-photo-column relative z-10 flex w-[52px] shrink-0 flex-col items-center">
                        {photos[s.id] ? <img src={photos[s.id]} alt={'Photo de ' + s.firstName} className="student-photo-frame block h-[62px] w-[48px] shrink-0 rounded-md object-cover" style={{ width: 48, height: 62, minWidth: 48, minHeight: 62, maxWidth: 48, maxHeight: 62, flex: "0 0 48px", objectFit: "cover", objectPosition: "center 20%", display: "block", position: "relative", zIndex: 1 }} /> : <div className="student-photo-frame grid h-[62px] w-[48px] shrink-0 place-items-center rounded-md bg-slate-100 text-lg font-800" style={{ color: accent }}>{(s.firstName[0] || '') + (s.lastName[0] || '')}</div>}
                        
                      </div>
                      <div className="student-card-details student-card-info-column min-w-0 flex-1 space-y-1">
                        <p className="break-words text-[9px] text-slate-500">Prénom</p><p className="break-words text-[12px] font-800 leading-tight text-slate-900">{s.firstName}</p>
                        <p className="break-words text-[9px] text-slate-500">Nom</p><p className="break-words text-[12px] font-800 leading-tight text-slate-900">{s.lastName}</p>
                        <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1">
                          <div><p className="text-[8px] text-slate-500">Classe</p><p className="break-words text-[10px] font-700 text-slate-800">{s.className}</p></div>
                          {cardFields.sexe && <div><p className="text-[8px] text-slate-500">Sexe</p><p className="text-[10px] font-700 text-slate-800">{s.sexe === 'F' ? 'F' : 'M'}</p></div>}
                          {cardFields.birthDate && <div><p className="text-[8px] text-slate-500">Né(e) le</p><p className="student-card-birth-value break-words text-[9px] font-600 text-slate-800">{s.birthDate ? new Date(s.birthDate + 'T00:00:00').toLocaleDateString('fr-FR') : 'Non renseignée'}</p></div>}
                          {cardFields.birthPlace && <div><p className="text-[8px] text-slate-500">À</p><p className="student-card-birth-value break-words text-[9px] font-600 text-slate-800">{s.birthPlace?.trim() || 'Non renseigné'}</p></div>}
                        </div>
                      </div>
                    </div>
                    {(cardFields.matricule || academicYear) && <div className="mt-1 flex items-center justify-between gap-2 border-t border-slate-100 pt-1">
                      {cardFields.matricule && <span className="truncate text-[8px] text-slate-500">Matricule : {s.matricule || '—'}</span>}
                      <span className="shrink-0 text-[8px] font-700" style={{ color: accent }}>{academicYear || 'Année scolaire'}</span>
                    </div>}
                    {cardFields.parentName && <p className="mt-1 text-[8px] leading-tight text-slate-600">Parent : {s.parentName || '—'}</p>}
                    {schoolStamp && <div className="mt-auto flex justify-end pt-1"><img src={schoolStamp} alt="Cachet de l’école" className="h-4 w-6 object-contain opacity-80 print:h-[4mm] print:w-[6mm]" /></div>}
                  </div>
                </article>
                <div className="student-card-photo-upload mt-2">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => photoInputRefs.current['gallery-' + s.id]?.click()} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-600 text-slate-600 hover:bg-slate-50"><Upload className="h-3.5 w-3.5" /> Galerie / fichiers</button>
                    <button type="button" onClick={() => photoInputRefs.current['camera-' + s.id]?.click()} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-600 text-slate-600 hover:bg-slate-50"><Camera className="h-3.5 w-3.5" /> Prendre une photo</button>
                  </div>
                  <input ref={node => { photoInputRefs.current['gallery-' + s.id] = node; }} type="file" accept="image/*" className="hidden" onChange={e => { const input = e.currentTarget; const f = input.files?.[0]; if (f) void readImage(f, data => setCropDraft({ image: data, target: s.id })); input.value = ''; }} />
                  <input ref={node => { photoInputRefs.current['camera-' + s.id] = node; }} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const input = e.currentTarget; const f = input.files?.[0]; if (f) void readImage(f, data => setCropDraft({ image: data, target: s.id })); input.value = ''; }} />
                </div>
              </div>
            ))}
          </div>
          {!selectedStudents.length && <div className="student-cards-print-empty rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Choisissez une classe ou un élève pour afficher les cartes.</div>}
        </>
      )}
    </div>
  );
}

function GraduationMark() {
  return <span className="text-sm font-900">S</span>;
}
