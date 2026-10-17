import { useEffect, useState } from 'react';
import { ImageCropper } from './ImageCropper';
import { Camera, FileText, Printer, X, ImagePlus, MessageCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  schoolName: string;
  parentPhone: string;
  studentName: string;
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

export function ReceiptPhotoPdf({ open, onClose, schoolName, parentPhone, studentName }: Props) {
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
    if (!open) {
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
    }
  }, [open]);

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
        setError("La photo du reçu n’a pas pu être chargée dans le document. Réessaie.");
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
      .toolbar{padding:10px 0;margin-bottom:12px}button{padding:10px 14px;border:0;border-radius:8px;background:#4f46e5;color:white;font-weight:bold}
    </style></head><body><div class="toolbar"><button onclick="window.print()">Imprimer / Enregistrer en PDF</button><p>Choisis « Enregistrer au format PDF » ou imprime directement.</p></div>
    ${bodyContent}
    <script>window.addEventListener('load',()=>{const imgs=[...document.images];Promise.all(imgs.map(i=>i.decode())).then(()=>{if(window.opener)window.opener.postMessage({type:'gestilys-receipt-pdf-ready'},window.location.origin);setTimeout(()=>window.print(),350)}).catch(()=>{if(window.opener)window.opener.postMessage({type:'gestilys-receipt-pdf-error'},window.location.origin)});});</script>
    </body></html>`);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-3">
      <div className="relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 text-slate-900 shadow-2xl">
        <button onClick={onClose} className="absolute right-3 top-3 rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Fermer"><X size={20}/></button>
        <div className="mb-4 pr-8">
          <h2 className="text-lg font-bold text-slate-900">Photo du reçu → PDF</h2>
          <p className="mt-1 text-sm text-slate-500">Élève : {studentName}. Prends les photos avec l’appareil ou choisis-les dans ta galerie.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block cursor-pointer rounded-xl border border-dashed border-slate-300 p-3 hover:border-indigo-400">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"><ImagePlus size={17}/> Logo de l’école (facultatif)</span>
            <input className="block w-full text-xs" type="file" accept="image/*" onChange={e => { void handleImage('logo', e.target.files?.[0]); e.currentTarget.value = ''; }}/>
            {logo && <img src={logo} alt="Aperçu du logo" className="mt-3 h-20 w-full object-contain"/>}
          </label>
          <label className="block cursor-pointer rounded-xl border border-dashed border-slate-300 p-3 hover:border-indigo-400">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"><Camera size={17}/> Photo du reçu (obligatoire)</span>
            <input className="block w-full text-xs" type="file" accept="image/*" onChange={e => { void handleImage('receipt', e.target.files?.[0]); e.currentTarget.value = ''; }}/>
            {receipt && <img src={receipt} alt="Aperçu du reçu" className="mt-3 h-28 w-full rounded-lg border object-contain"/>}
          </label>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">Le document PDF reprend la photo du reçu avec l’en-tête de l’école. Cette version ne reconnaît pas automatiquement l’écriture et ne modifie pas le reçu original.</p>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={!receipt || busy} onClick={createPdf} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
          <FileText size={18}/><Printer size={17}/>{busy ? 'Préparation…' : 'Créer le PDF'}
        </button>
        {pdfPrepared && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Le PDF est ouvert dans la fenêtre d’impression. Choisis « Enregistrer en PDF », puis reviens ici pour préparer l’envoi.</p>}
        {parentPhone && <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
          <p className="flex items-center gap-1 text-xs text-slate-600"><MessageCircle size={14}/> Destinataire : {parentPhone}</p>
          <button type="button" disabled={!pdfPrepared} onClick={() => { const phone = parentPhone.replace(/\D/g, ''); window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent('Bonjour, veuillez trouver ci-joint le reçu de paiement de ' + studentName + '.'), '_blank', 'noopener,noreferrer'); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><MessageCircle size={17}/> Ouvrir WhatsApp pour joindre le PDF</button>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">WhatsApp ne peut pas joindre automatiquement un fichier créé par le navigateur : enregistre d’abord le PDF, puis joins-le dans la conversation.</p>
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
    </div>
  );
}
