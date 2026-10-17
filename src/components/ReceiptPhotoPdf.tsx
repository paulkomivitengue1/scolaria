import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImageCropper } from './ImageCropper';
import { Camera, FileText, Printer, X, ImagePlus, MessageCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  schoolName: string;
  parentPhone: string;
  studentName: string;
  defaultAmount?: number;
  feeLabel?: string;
}

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Choisis un fichier image.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Image illisible.'));
    reader.onerror = () => reject(new Error('Impossible de lire cette image.'));
    reader.readAsDataURL(file);
  });
}

export function ReceiptPhotoPdf({ open, onClose, schoolName, parentPhone, studentName, defaultAmount = 0, feeLabel = 'Scolarité' }: Props) {
  const [logo, setLogo] = useState('');
  const [receipt, setReceipt] = useState('');
  const [cropDraft, setCropDraft] = useState<{ image: string; kind: 'logo' | 'receipt' } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pdfPrepared, setPdfPrepared] = useState(false);
  const [mode, setMode] = useState<'photo' | 'custom'>('photo');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('Scolarité');
  const [method, setMethod] = useState('Espèces');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [paperFormat, setPaperFormat] = useState<'A4' | 'A5' | '80x150' | 'custom'>('A5');
  const [paperWidth, setPaperWidth] = useState('80');
  const [paperHeight, setPaperHeight] = useState('150');

  useEffect(() => {
    if (open) {
      setAmount(defaultAmount > 0 ? String(defaultAmount) : '');
      setPurpose(feeLabel || 'Scolarité');
      return;
    }
    setLogo('');
    setReceipt('');
    setPdfPrepared(false);
    setCropDraft(null);
    setError('');
    setBusy(false);
    setMode('photo');
    setAmount('');
    setPurpose('Scolarité');
    setMethod('Espèces');
    setReference('');
    setNote('');
    setPaperFormat('A5');
  }, [open, defaultAmount, feeLabel]);

  useEffect(() => {
    const onPdfMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || !event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'gestilys-receipt-pdf-ready') {
        setBusy(false);
        setPdfPrepared(true);
        setError('');
      } else if (event.data.type === 'gestilys-receipt-pdf-error') {
        setBusy(false);
        setPdfPrepared(false);
        setError("Le document n’a pas pu charger ses images. Réessaie.");
      }
    };
    window.addEventListener('message', onPdfMessage);
    return () => window.removeEventListener('message', onPdfMessage);
  }, []);

  if (!open) return null;

  const handleImage = async (kind: 'logo' | 'receipt', file?: File) => {
    if (!file) return;
    setError('');
    try {
      const image = await readImage(file);
      setCropDraft({ image, kind });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de lecture.');
    }
  };

  const createPdf = () => {
    if (mode === 'photo' && !receipt) {
      setError('Choisis une photo du reçu dans la galerie ou prends-en une.');
      return;
    }
    if (mode === 'custom' && (!amount.trim() || !Number.isFinite(Number(amount)) || Number(amount) <= 0)) {
      setError('Saisis un montant valide pour le reçu.');
      return;
    }
    const width = Math.min(300, Math.max(40, Number(paperWidth) || 80));
    const height = Math.min(500, Math.max(40, Number(paperHeight) || 150));
    const pageSize = paperFormat === 'A4' ? 'A4 portrait' : paperFormat === 'A5' ? 'A5 portrait' : paperFormat === '80x150' ? '80mm 150mm' : `${width}mm ${height}mm`;
    const escapeHtml = (value: string) => value.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] || ch));
    const safeSchool = escapeHtml(schoolName);
    const safeStudent = escapeHtml(studentName);
    const safePurpose = escapeHtml(purpose);
    const safeMethod = escapeHtml(method);
    const safeAmount = Number(amount || 0).toLocaleString('fr-FR');
    const safeReference = escapeHtml(reference || '—');
    const safeNote = escapeHtml(note || '');
    const logoMarkup = logo ? '<img src="' + logo + '" alt="Logo de l’école">' : '';
    const bodyContent = mode === 'photo'
      ? `<img class="receipt" src="${receipt}" alt="Photo du reçu à convertir">
         <header>${logoMarkup}<div><h1>${safeSchool}</h1><p>Copie numérique du reçu</p><p>Élève : <strong>${safeStudent}</strong></p><p>Préparé le ${new Date().toLocaleDateString('fr-FR')}</p></div></header>
         <div class="note">Vérifie que toutes les informations du reçu sont lisibles avant de transmettre le PDF.</div>`
      : `<header>${logoMarkup}<div><h1>${safeSchool}</h1><p>REÇU DE PAIEMENT</p><p>Élève : <strong>${safeStudent}</strong></p><p>Émis le ${new Date().toLocaleDateString('fr-FR')}</p></div></header>
         <section class="custom-receipt"><div class="receipt-title">REÇU DE PAIEMENT</div><div class="amount">${safeAmount} FCFA</div>
         <div class="line"><span>Motif</span><strong>${safePurpose}</strong></div><div class="line"><span>Mode de paiement</span><strong>${safeMethod}</strong></div>
         <div class="line"><span>Référence</span><strong>${safeReference}</strong></div><div class="line"><span>Parent / responsable</span><strong>${escapeHtml(parentPhone || '—')}</strong></div>
         ${safeNote ? '<p class="custom-note">' + safeNote + '</p>' : ''}<p class="signature">Signature / cachet de l’établissement</p></section>`;
    setBusy(true);
    setPdfPrepared(false);
    setError('');
    const w = window.open('', '_blank');
    if (!w) {
      setBusy(false);
      setError('Autorise les fenêtres pop-up dans ton navigateur, puis réessaie.');
      return;
    }
    w.document.open();
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reçu - ${safeStudent}</title><style>
      @page{size:${pageSize};margin:8mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;margin:0;display:flex;flex-direction:column}
      header{display:flex;align-items:center;gap:12px;border-bottom:2px solid #667eea;padding:0 0 10px;margin-bottom:14px}
      header img{width:64px;height:55px;object-fit:contain}h1{font-size:18px;margin:0 0 5px}p{margin:4px 0;font-size:11px;color:#555}
      .note{font-size:10px;background:#f4f6ff;border:1px solid #dce2ff;border-radius:6px;padding:7px;margin-bottom:8px}
      .receipt{display:block;width:100%;max-height:205mm;object-fit:contain;margin:0 auto 10px;object-position:top center;order:-1}
      .custom-receipt{border:1.5px solid #cbd5e1;border-radius:8px;padding:14px;margin-top:10px}.receipt-title{text-align:center;font-size:15px;font-weight:800;letter-spacing:1px}.amount{text-align:center;font-size:25px;font-weight:800;margin:16px 0;color:#3730a3}
      .line{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #e2e8f0;padding:9px 0;font-size:11px}.line span{color:#64748b}.line strong{text-align:right;overflow-wrap:anywhere}.custom-note{margin-top:14px;padding:8px;background:#f8fafc}.signature{margin-top:35px;text-align:right;font-size:10px;color:#475569}
      @media print{.toolbar{display:none}}
      .toolbar{padding:10px 0;margin-bottom:12px}button{padding:11px 16px;border:0;border-radius:9px;background:#2563eb !important;color:#fff !important;font-weight:700;cursor:pointer;box-shadow:0 3px 10px rgba(37,99,235,.25)}button:hover{background:#1d4ed8 !important}
    </style></head><body><div class="toolbar"><button onclick="window.print()">Imprimer / Enregistrer en PDF</button><p>Choisis « Enregistrer au format PDF » ou imprime directement.</p></div>
    ${bodyContent}
    <script>window.addEventListener('load',()=>{const imgs=[...document.images];Promise.all(imgs.map(i=>i.decode())).then(()=>{if(window.opener)window.opener.postMessage({type:'gestilys-receipt-pdf-ready'},window.location.origin);setTimeout(()=>window.print(),350)}).catch(()=>{if(window.opener)window.opener.postMessage({type:'gestilys-receipt-pdf-error'},window.location.origin)});});</script>
    </body></html>`);
    w.document.close();
  };

  return createPortal(
    <div className="fixed inset-0 z-[2147482000] flex items-center justify-center bg-slate-950/85 p-3">
      <div className="relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 text-slate-900 shadow-2xl">
        <button onClick={onClose} className="absolute right-3 top-3 rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Fermer"><X size={20}/></button>
        <div className="mb-4 pr-8">
          <h2 className="text-lg font-bold text-slate-900">Reçus personnalisables</h2>
          <p className="mt-1 text-sm text-slate-500">Élève : {studentName}. Convertis une photo ou crée un reçu adapté au format souhaité.</p>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <button type="button" onClick={() => { setMode('photo'); setError(''); setPdfPrepared(false); }} className={`min-h-10 rounded-lg px-3 py-2 text-sm font-700 ${mode === 'photo' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>Photo → PDF</button>
          <button type="button" onClick={() => { setMode('custom'); setError(''); setPdfPrepared(false); }} className={`min-h-10 rounded-lg px-3 py-2 text-sm font-700 ${mode === 'custom' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>Créer un reçu</button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block cursor-pointer rounded-xl border border-dashed border-slate-300 p-3 hover:border-indigo-400">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"><ImagePlus size={17}/> Logo de l’école (facultatif)</span>
            <input className="block w-full text-xs" type="file" accept="image/*" onChange={e => { void handleImage('logo', e.target.files?.[0]); e.currentTarget.value = ''; }}/>
            {logo && <img src={logo} alt="Aperçu du logo" className="mt-3 h-20 w-full object-contain"/>}
          </label>
          {mode === 'photo' && <label className="block cursor-pointer rounded-xl border border-dashed border-slate-300 p-3 hover:border-indigo-400">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"><Camera size={17}/> Photo du reçu (galerie ou appareil)</span>
            <input className="block w-full text-xs" type="file" accept="image/*" onChange={e => { void handleImage('receipt', e.target.files?.[0]); e.currentTarget.value = ''; }}/>
            {receipt && <img src={receipt} alt="Aperçu du reçu" className="mt-3 h-28 w-full rounded-lg border object-contain"/>}
          </label>}
        </div>
        {mode === 'custom' && <div className="mt-3 space-y-3 rounded-xl border border-slate-200 p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs font-700 text-slate-700">Montant (FCFA)<input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ex. 15000" className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-600"/></label>
            <label className="block text-xs font-700 text-slate-700">Motif du paiement<input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Scolarité, cantine…" className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-600"/></label>
            <label className="block text-xs font-700 text-slate-700">Mode de paiement<select value={method} onChange={e => setMethod(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option>Espèces</option><option>Orange Money</option><option>Moov Money</option><option>Wave</option><option>Virement</option><option>Chèque</option><option>Autre</option></select></label>
            <label className="block text-xs font-700 text-slate-700">Référence du reçu<input value={reference} onChange={e => setReference(e.target.value)} placeholder="Numéro facultatif" className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"/></label>
          </div>
          <label className="block text-xs font-700 text-slate-700">Format du papier<select value={paperFormat} onChange={e => setPaperFormat(e.target.value as 'A4' | 'A5' | '80x150' | 'custom')} className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="A4">A4 — feuille classique</option><option value="A5">A5 — demi-feuille</option><option value="80x150">Ticket 80 × 150 mm</option><option value="custom">Format personnalisé</option></select></label>
          {paperFormat === 'custom' && <div className="grid grid-cols-2 gap-3"><label className="text-xs font-700 text-slate-700">Largeur (mm)<input type="number" min="40" max="300" value={paperWidth} onChange={e => setPaperWidth(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"/></label><label className="text-xs font-700 text-slate-700">Hauteur (mm)<input type="number" min="40" max="500" value={paperHeight} onChange={e => setPaperHeight(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"/></label></div>}
          <label className="block text-xs font-700 text-slate-700">Note facultative<textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Précision à afficher sur le reçu…" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"/></label>
        </div>}
        {mode === 'photo' && <p className="mt-3 text-xs leading-relaxed text-slate-500">La photo sera placée en premier dans le PDF. Tu peux choisir la forme du cadrage avant de créer le document.</p>}
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={(mode === 'photo' && !receipt) || (mode === 'custom' && !amount.trim()) || busy} onClick={createPdf} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
          <FileText size={18}/><Printer size={17}/>{busy ? 'Préparation…' : mode === 'photo' ? 'Créer le PDF depuis la photo' : 'Créer le reçu personnalisé'}
        </button>
        {pdfPrepared && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Le PDF est ouvert dans la fenêtre d’impression. Choisis « Enregistrer en PDF », puis reviens ici pour préparer l’envoi.</p>}
        {parentPhone && <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
          <p className="flex items-center gap-1 text-xs text-slate-600"><MessageCircle size={14}/> Destinataire : {parentPhone}</p>
          <button type="button" disabled={!pdfPrepared} onClick={() => { const phone = parentPhone.replace(/\D/g, ''); window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent('Bonjour, veuillez trouver ci-joint le reçu de ' + studentName + '.'), '_blank', 'noopener,noreferrer'); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><MessageCircle size={17}/> Ouvrir WhatsApp et joindre le PDF</button>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">Pour joindre le PDF : enregistre-le depuis la fenêtre d’impression, ouvre WhatsApp, touche le trombone puis Document et sélectionne le PDF. Le navigateur ne permet pas de joindre silencieusement un fichier local à WhatsApp.</p>
        </div>}
      </div>
      {cropDraft && <ImageCropper
        image={cropDraft.image}
        aspectRatio={cropDraft.kind === 'logo' ? 1 : 0.72}
        allowFreeform={cropDraft.kind === 'receipt'}
        title={cropDraft.kind === 'logo' ? 'le logo' : 'le reçu'}
        onCancel={() => setCropDraft(null)}
        onApply={image => {
          if (cropDraft.kind === 'logo') setLogo(image);
          else setReceipt(image);
          setCropDraft(null);
        }}
      />}
    </div>, document.body);
}
