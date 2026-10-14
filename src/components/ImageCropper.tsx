import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, RotateCcw, X } from 'lucide-react';

type Props = { image: string; aspectRatio: number; title: string; onCancel: () => void; onApply: (image: string) => void };

export function ImageCropper({ image, aspectRatio, title, onCancel, onApply }: Props) {
  const [zoom, setZoom] = useState(1);
  const [horizontal, setHorizontal] = useState(50);
  const [vertical, setVertical] = useState(50);
  const [busy, setBusy] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState(320);
  const frameHeight = frameWidth / aspectRatio;

  // Keep the crop calculations aligned with the actual preview size on mobile.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      const width = frame.getBoundingClientRect().width;
      if (width > 0) setFrameWidth(previous => Math.abs(previous - width) > 0.5 ? width : previous);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [aspectRatio]);
  const apply = async () => {
    setBusy(true);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const node = new Image(); node.onload = () => resolve(node); node.onerror = () => reject(new Error('Image illisible')); node.src = image;
      });
      const scale = Math.max(frameWidth / img.naturalWidth, frameHeight / img.naturalHeight) * zoom;
      const drawnWidth = img.naturalWidth * scale;
      const drawnHeight = img.naturalHeight * scale;
      const left = (frameWidth - drawnWidth) * horizontal / 100;
      const top = (frameHeight - drawnHeight) * vertical / 100;
      const sx = Math.max(0, -left / scale);
      const sy = Math.max(0, -top / scale);
      const sw = Math.min(img.naturalWidth - sx, frameWidth / scale);
      const sh = Math.min(img.naturalHeight - sy, frameHeight / scale);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(900));
      canvas.height = Math.max(1, Math.round(900 / aspectRatio));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas indisponible');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const result = await new Promise<string>((resolve, reject) => canvas.toBlob(blob => {
        if (!blob) return reject(new Error('Compression impossible'));
        const reader = new FileReader(); reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Lecture impossible')); reader.onerror = () => reject(new Error('Lecture impossible')); reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.86));
      onApply(result);
    } catch { window.alert('Impossible de recadrer cette image. Choisissez une autre image.'); }
    finally { setBusy(false); }
  };
  const [naturalSize, setNaturalSize] = useState({ width: 320, height: 320 / aspectRatio });
  useEffect(() => {
    const img = new Image(); img.onload = () => setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight }); img.src = image;
  }, [image]);
  const scale = Math.max(frameWidth / naturalSize.width, frameHeight / naturalSize.height) * zoom;
  const width = naturalSize.width * scale;
  const height = naturalSize.height * scale;
  return createPortal(<div className="fixed inset-0 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6" style={{ zIndex: 2147483647 }} role="dialog" aria-modal="true" aria-label={title}>
    <div className="max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-800 text-slate-900">Recadrer {title.toLowerCase()}</h2><p className="text-sm text-slate-500">Ajustez le zoom et le cadrage avant d’enregistrer.</p></div><button type="button" onClick={onCancel} aria-label="Fermer" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200"><X className="h-5 w-5" /></button></div>
      <div ref={frameRef} className="mx-auto overflow-hidden rounded-xl bg-slate-100" style={{ width: 'min(100%, 320px)', aspectRatio: String(aspectRatio), position: 'relative' }}>
        <img src={image} alt="Aperçu à recadrer" draggable={false} style={{ position: 'absolute', width, height, maxWidth: 'none', objectFit: 'fill', left: (frameWidth - width) * horizontal / 100, top: (frameHeight - height) * vertical / 100 }} />
      </div>
      <div className="mt-5 space-y-4">
        <label className="block text-sm font-600 text-slate-700">Zoom <span className="float-right text-slate-500">{zoom.toFixed(1)}×</span><input className="mt-2 w-full accent-indigo-600" type="range" min="1" max="3" step="0.1" value={zoom} onChange={e => setZoom(Number(e.target.value))} /></label>
        <label className="block text-sm font-600 text-slate-700">Déplacement horizontal<input className="mt-2 w-full accent-indigo-600" type="range" min="0" max="100" value={horizontal} onChange={e => setHorizontal(Number(e.target.value))} /></label>
        <label className="block text-sm font-600 text-slate-700">Déplacement vertical<input className="mt-2 w-full accent-indigo-600" type="range" min="0" max="100" value={vertical} onChange={e => setVertical(Number(e.target.value))} /></label>
      </div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between"><button type="button" onClick={() => { setZoom(1); setHorizontal(50); setVertical(50); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-700"><RotateCcw className="h-4 w-4" /> Réinitialiser</button><div className="flex gap-2"><button type="button" onClick={onCancel} className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-700">Annuler</button><button type="button" disabled={busy} onClick={() => void apply()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-royal-700 px-4 text-sm font-700 text-white disabled:opacity-50"><Check className="h-4 w-4" /> {busy ? 'Enregistrement…' : 'Valider le cadrage'}</button></div></div>
    </div>
  </div>, document.body);
}
