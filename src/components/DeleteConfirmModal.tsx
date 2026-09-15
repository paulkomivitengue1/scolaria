import { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import type { Student } from '../types';

interface Props {
  student: Student | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}

export function DeleteConfirmModal({ student, open, onClose, onConfirm }: Props) {
  const [deleting, setDeleting] = useState(false);

  if (!student) return null;

  const confirm = async () => {
    setDeleting(true);
    try {
      await onConfirm(student.id);
      onClose();
    } catch {
      // error handled in parent
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity .22s ease' }}>
      <div className="modal-backdrop is-open" onClick={onClose} style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity .22s ease' }} aria-hidden="true" />
      <div className={`modal-panel relative flex w-full max-w-sm flex-col overflow-hidden rounded-2.5xl bg-white shadow-2xl transition ${open ? 'animate-scaleIn' : 'opacity-0'}`}>
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-red-600 to-red-800 px-5 py-4 text-white">
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><AlertTriangle className="h-5 w-5 text-white" /></span>
              <div>
                <h2 className="font-display text-base font-700 leading-tight">Supprimer l'élève</h2>
                <p className="text-xs text-red-100">{student.firstName} {student.lastName}</p>
              </div>
            </div>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 transition hover:bg-white/20 active:scale-95"><X className="h-4.5 w-4.5" /></button>
          </div>
        </div>

        <div className="px-5 py-5">
          <p className="text-sm leading-relaxed text-slate-600">
            Êtes-vous sûr ? Cette action est <strong className="text-red-600">irréversible</strong> et supprimera aussi son historique de paiements.
          </p>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3">
          <div className="flex gap-2">
            <button onClick={onClose} className="flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-600 text-slate-600 transition hover:bg-slate-50 active:scale-95">Annuler</button>
            <button onClick={confirm} disabled={deleting} className="flex h-11 flex-[1.4] items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-sm font-700 text-white shadow-lg transition hover:brightness-110 active:scale-95 disabled:opacity-40">
              {deleting ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Suppression…</> : <><Trash2 className="h-4 w-4" />Supprimer</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
