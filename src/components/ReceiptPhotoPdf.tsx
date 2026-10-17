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

  useEffect(() => {
    if (!open) {
      setLogo('');
      setReceipt('');
      setCropDraft(null);
      setError('');
      setBusy(false);
    }
  }, [open]);

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
    if (!receipt) {
      setError('Ajoute d’abord la photo du reçu à convertir.');
      return;
    }
    setBusy(true);
    setError('');
    const w = window.open('', '_blank');
    if (!w) {
      setBusy(false);
      setError('Autorise les fenêtres pop-up dans ton navigateur, puis réessaie.');
      return;
    }
    const safeSchool = schoolName.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
    const safeStudent = studentName.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
    w.document.open();
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reçu - ${safeStudent}</title><style>
      @page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;margin:0}
      header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #667eea;padding:0 0 14px;margin-bottom:18px}
      header img{width:90px;height:75px;object-fit:contain}h1{font-size:20px;margin:0 0 6px}p{margin:4px 0;font-size:12px;color:#555}
      .note{font-size:12px;background:#f4f6ff;border:1px solid #dce2ff;border-radius:8px;padding:10px;margin-bottom:14px}
      .receipt{display:block;width:100%;max-height:235mm;object-fit:contain}
      @media print{.toolbar{display:none}}
      .toolbar{padding:10px 0;margin-bottom:12px}button{padding:10px 14px;border:0;border-radius:8px;background:#4f46e5;color:white;font-weight:bold}
    </style></head><body><div class="toolbar"><button onclick="window.print()">Imprimer / Enregistrer en PDF</button><p>Dans la fenêtre d’impression, choisis « Enregistrer au format PDF ».</p></div>
    <header>${logo ? '<img src="' + logo + '" alt="Logo de l’école">' : ''}<div><h1>${safeSchool}</h1><p>Copie numérique du reçu</p><p>Élève : <strong>${safeStudent}</strong></p><p>Préparé le ${new Date().toLocaleDateString('fr-FR')}</p></div></header>
    <div class="note">Cette page contient la photo du reçu fournie. Vérifie que la photo est nette et que toutes les informations sont lisibles avant de transmettre le PDF.</div>
    <img class="receipt" src="${receipt}" alt="Photo du reçu à convertir">
    <script>window.addEventListener('load',()=>{const imgs=[...document.images];Promise.all(imgs.map(i=>i.decode().catch(()=>{}))).then(()=>setTimeout(()=>window.print(),350));</script>
    </body></html>`);
    w.document.close();
    setBusy(false);
    if (parentPhone.trim()) {
      const phone = parentPhone.replace(/\D/g, '');
      // Keep the PDF creation separate from WhatsApp attachment: browsers do not permit a website to attach a local file automatically.
      window.setTimeout(() => {
        const go = window.confirm('Le PDF est prêt dans la fenêtre d’impression. Après l’avoir enregistré, ouvrir WhatsApp pour l’envoyer au parent ?');
        if (go) window.open(`https://wa.me/${phone}?text=${encodeURIComponent('Bonjour, veuillez trouver ci-joint le reçu de paiement de ' + studentName + '.')}`, '_blank');
      }, 500);
    }
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
            <input className="block w-full text-xs" type="file" accept="image/*" capture="environment" onChange={e => { void handleImage('logo', e.target.files?.[0]); e.currentTarget.value = ''; }}/>
            {logo && <img src={logo} alt="Aperçu du logo" className="mt-3 h-20 w-full object-contain"/>}
          </label>
          <label className="block cursor-pointer rounded-xl border border-dashed border-slate-300 p-3 hover:border-indigo-400">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"><Camera size={17}/> Photo du reçu (obligatoire)</span>
            <input className="block w-full text-xs" type="file" accept="image/*" capture="environment" onChange={e => { void handleImage('receipt', e.target.files?.[0]); e.currentTarget.value = ''; }}/>
            {receipt && <img src={receipt} alt="Aperçu du reçu" className="mt-3 h-28 w-full rounded-lg border object-contain"/>}
          </label>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">Le document PDF reprend la photo du reçu avec l’en-tête de l’école. Cette version ne reconnaît pas automatiquement l’écriture et ne modifie pas le reçu original.</p>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={!receipt || busy} onClick={createPdf} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
          <FileText size={18}/><Printer size={17}/>{busy ? 'Préparation…' : 'Créer le PDF'}
        </button>
        {parentPhone && <p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><MessageCircle size={14}/> Parent : {parentPhone}. Après l’enregistrement du PDF, WhatsApp s’ouvrira pour faciliter l’envoi.</p>}
      </div>
      {cropDraft && <ImageCropper
        image={cropDraft.image}
        aspectRatio={cropDraft.kind === 'logo' ? 1 : 0.72}
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
