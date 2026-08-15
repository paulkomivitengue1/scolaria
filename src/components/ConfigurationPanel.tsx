import { useCallback, useEffect, useRef, useState } from 'react';
import { Settings2, RotateCcw, Check, Search, AlertCircle, School, CalendarClock, Sparkles, ArrowRight, Loader2, Plus, Trash2, Layers, FileText, PartyPopper, Utensils, Bus, GraduationCap, X } from 'lucide-react';
import type { SchoolFeeConfig, FeeConfigRow, TrancheDef, FeeTypeDef, UniformStockItem, BookStockItem } from '../types';
import { CLASS_LIST, formatFCFA, getFeeTotalForClass, uniformRemaining, bookRemaining, FEE_TYPE_ICONS, getFeeAccent } from '../types';

interface ConfigPanelProps {
  feeConfig: SchoolFeeConfig;
  onSaveFeeConfig: (tranches: TrancheDef[], feeTypes: FeeTypeDef[], feeConfigRows: FeeConfigRow[]) => Promise<void>;
  onReset: () => void;
  schoolName: string;
  onSchoolNameChange: (n: string) => void;
  uniforms: UniformStockItem[];
  books: BookStockItem[];
  onYearEnd: () => void;
}

const FEE_ICONS: Record<string, typeof GraduationCap> = {
  GraduationCap, FileText, PartyPopper, Utensils, Bus,
};

type SaveState = 'idle' | 'saving' | 'saved';

export function ConfigurationPanel({ feeConfig, onSaveFeeConfig, onReset, schoolName, onSchoolNameChange, uniforms, books, onYearEnd }: ConfigPanelProps) {
  const [tranches, setTranches] = useState<TrancheDef[]>(feeConfig.tranches);
  const [feeTypes, setFeeTypes] = useState<FeeTypeDef[]>(feeConfig.feeTypes);
  const [configRows, setConfigRows] = useState<FeeConfigRow[]>(feeConfig.feeConfig);
  const [filter, setFilter] = useState('');
  const [savedField, setSavedField] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<SaveState>('idle');
  const [schoolDraft, setSchoolDraft] = useState(schoolName);
  const [schoolStatus, setSchoolStatus] = useState<SaveState>('idle');
  const [activeFeeType, setActiveFeeType] = useState<string>(feeConfig.feeTypes[0]?.feeType ?? 'scolarite');
  const [newFeeName, setNewFeeName] = useState('');
  const [showAddFee, setShowAddFee] = useState(false);

  const configRef = useRef(feeConfig);
  const schoolRef = useRef(schoolName);
  const configTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schoolTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { configRef.current = feeConfig; }, [feeConfig]);
  useEffect(() => { schoolRef.current = schoolName; }, [schoolName]);

  // Sync when feeConfig prop changes (e.g. after initial load)
  useEffect(() => {
    setTranches(feeConfig.tranches);
    setFeeTypes(feeConfig.feeTypes);
    setConfigRows(feeConfig.feeConfig);
    if (feeConfig.feeTypes.length > 0 && !feeConfig.feeTypes.find(f => f.feeType === activeFeeType)) {
      setActiveFeeType(feeConfig.feeTypes[0].feeType);
    }
  }, [feeConfig]);

  const doConfigSave = useCallback(async (newTranches: TrancheDef[], newFeeTypes: FeeTypeDef[], newRows: FeeConfigRow[]) => {
    setConfigStatus('saving');
    try {
      await onSaveFeeConfig(newTranches, newFeeTypes, newRows);
      setConfigStatus('saved');
      setTimeout(() => setConfigStatus('idle'), 2000);
    } catch {
      setConfigStatus('idle');
    }
  }, [onSaveFeeConfig]);

  const scheduleSave = useCallback((newTranches: TrancheDef[], newFeeTypes: FeeTypeDef[], newRows: FeeConfigRow[]) => {
    if (configTimer.current) clearTimeout(configTimer.current);
    configTimer.current = setTimeout(() => {
      doConfigSave(newTranches, newFeeTypes, newRows);
      setTimeout(() => setSavedField(null), 1500);
    }, 800);
  }, [doConfigSave]);

  // Update amount for a specific fee type / class / tranche
  const updateAmount = (feeType: string, className: string, trancheKey: number | 'single', value: number) => {
    const newVal = Math.max(0, isNaN(value) ? 0 : value);
    const ft = feeTypes.find(f => f.feeType === feeType);
    if (!ft) return;

    const next = configRows.filter(r => !(r.feeType === feeType && r.className === className && r.trancheIndex === (trancheKey === 'single' ? null : trancheKey)));
    next.push({
      feeType,
      className,
      paymentMode: ft.paymentMode,
      trancheIndex: trancheKey === 'single' ? null : trancheKey,
      amount: newVal,
    });
    setConfigRows(next);
    setSavedField(`${feeType}-${className}-${trancheKey}`);
    scheduleSave(tranches, feeTypes, next);
  };

  // ── Tranche management ──
  const addTranche = () => {
    if (tranches.length >= 12) return;
    const nextIndex = Math.max(0, ...tranches.map(t => t.index)) + 1;
    const newTranche: TrancheDef = { index: nextIndex, label: `Tranche ${nextIndex}` };
    const next = [...tranches, newTranche];
    setTranches(next);
    scheduleSave(next, feeTypes, configRows);
  };

  const removeTranche = () => {
    if (tranches.length <= 1) return;
    const removedIndex = tranches[tranches.length - 1].index;
    const next = tranches.slice(0, -1);
    setTranches(next);
    // Remove fee_config rows for the removed tranche
    const nextRows = configRows.filter(r => r.trancheIndex !== removedIndex || r.paymentMode === 'single');
    setConfigRows(nextRows);
    scheduleSave(next, feeTypes, nextRows);
  };

  const renameTranche = (index: number, label: string) => {
    const next = tranches.map(t => t.index === index ? { ...t, label } : t);
    setTranches(next);
    setSavedField(`tranche-${index}`);
    scheduleSave(next, feeTypes, configRows);
  };

  // ── Fee type management ──
  const addFeeType = () => {
    const name = newFeeName.trim();
    if (!name || feeTypes.find(f => f.feeType === name)) return;
    const newDef: FeeTypeDef = { feeType: name, label: name, paymentMode: 'single' as const, isDefault: false };
    const nextTypes = [...feeTypes, newDef];
    // Create fee_config rows for all classes with amount 0
    const newRows = [...configRows];
    for (const cls of CLASS_LIST) {
      newRows.push({ feeType: name, className: cls, paymentMode: 'single', trancheIndex: null, amount: 0 });
    }
    setFeeTypes(nextTypes);
    setConfigRows(newRows);
    setActiveFeeType(name);
    setNewFeeName('');
    setShowAddFee(false);
    scheduleSave(tranches, nextTypes, newRows);
  };

  const removeFeeType = (feeType: string) => {
    const ft = feeTypes.find(f => f.feeType === feeType);
    if (!ft || ft.isDefault) return;
    const nextTypes = feeTypes.filter(f => f.feeType !== feeType);
    const nextRows = configRows.filter(r => r.feeType !== feeType);
    setFeeTypes(nextTypes);
    setConfigRows(nextRows);
    if (activeFeeType === feeType) setActiveFeeType(nextTypes[0]?.feeType ?? 'scolarite');
    scheduleSave(tranches, nextTypes, nextRows);
  };

  const toggleFeeMode = (feeType: string) => {
    const ft = feeTypes.find(f => f.feeType === feeType);
    if (!ft) return;
    const newMode = ft.paymentMode === 'tranche' ? 'single' : 'tranche';
    const nextTypes = feeTypes.map(f => f.feeType === feeType ? { ...f, paymentMode: newMode as 'tranche' | 'single' } : f);
    // Update config rows: for single→tranche, create one row per tranche with 0;
    // for tranche→single, keep just one row with the first tranche's amount
    let nextRows = [...configRows];
    if (newMode === 'tranche') {
      // Was single, now tranche: replace single rows with per-tranche rows
      nextRows = nextRows.filter(r => r.feeType !== feeType);
      for (const cls of CLASS_LIST) {
        for (const t of tranches) {
          nextRows.push({ feeType, className: cls, paymentMode: 'tranche', trancheIndex: t.index, amount: 0 });
        }
      }
    } else {
      // Was tranche, now single: keep only one row per class (sum of tranches or first tranche)
      nextRows = nextRows.filter(r => r.feeType !== feeType);
      for (const cls of CLASS_LIST) {
        const total = getFeeTotalForClass(configRows, feeType, cls);
        nextRows.push({ feeType, className: cls, paymentMode: 'single', trancheIndex: null, amount: total });
      }
    }
    setFeeTypes(nextTypes);
    setConfigRows(nextRows);
    scheduleSave(tranches, nextTypes, nextRows);
  };

  const handleReset = () => {
    if (configTimer.current) clearTimeout(configTimer.current);
    onReset();
    setConfigStatus('idle');
    setSavedField(null);
  };

  // ── School name ──
  const doSchoolSave = useCallback(async (name: string) => {
    setSchoolStatus('saving');
    try {
      await onSchoolNameChange(name);
      setSchoolStatus('saved');
      setTimeout(() => setSchoolStatus('idle'), 2000);
    } catch {
      setSchoolStatus('idle');
    }
  }, [onSchoolNameChange]);

  const onSchoolInput = (val: string) => {
    setSchoolDraft(val);
    if (schoolTimer.current) clearTimeout(schoolTimer.current);
    schoolTimer.current = setTimeout(() => {
      const trimmed = val.trim();
      if (trimmed && trimmed !== schoolRef.current) {
        doSchoolSave(trimmed);
      }
    }, 800);
  };

  const handleSchoolReset = () => {
    if (schoolTimer.current) clearTimeout(schoolTimer.current);
    setSchoolDraft('');
    onSchoolNameChange('');
    setSchoolStatus('idle');
  };

  const classes = CLASS_LIST.filter(c => c.toLowerCase().includes(filter.trim().toLowerCase()));
  const activeFt = feeTypes.find(f => f.feeType === activeFeeType) ?? feeTypes[0];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2.5xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full blur-2xl" style={{ background: 'var(--royal-50)' }} />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-royal-700 to-royal-900 text-white shadow-cardLg"><Settings2 className="h-6 w-6" /></span>
            <div>
              <h2 className="font-display text-xl font-700 text-ink">Paramètres — Tarifs & Tranches</h2>
              <p className="text-sm text-slate-500">Configurez vos tranches, types de frais et montants par classe.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SaveIndicator status={configStatus} />
            <button onClick={handleReset} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-600 text-slate-600 transition hover:bg-slate-50 active:scale-95"><RotateCcw className="h-4 w-4" />Réinitialiser</button>
          </div>
        </div>
      </div>

      {/* School name editor */}
      <div className="relative overflow-hidden rounded-2.5xl border border-slate-200 bg-white p-5 shadow-card sm:p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold-50 blur-2xl" />
        <div className="relative">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-white shadow-gold"><School className="h-6 w-6" /></span>
            <div>
              <h2 className="font-display text-xl font-700 text-ink">Nom de l'école</h2>
              <p className="text-sm text-slate-500">Ce nom apparaît dans les messages WhatsApp envoyés aux parents.</p>
            </div>
          </div>
          <div className="relative">
            <input type="text" value={schoolDraft} onChange={e => onSchoolInput(e.target.value)} placeholder="Entrez le nom de votre école…" className="h-14 w-full rounded-xl border border-slate-300 bg-white px-4 pr-12 text-lg font-600 text-ink outline-none transition focus:border-royal-500 focus:ring-2 focus:ring-royal-500/30" />
            <div className="absolute right-3 top-1/2 -translate-y-1/2"><SaveIndicator status={schoolStatus} compact /></div>
          </div>
          <div className="mt-4">
            <button onClick={handleSchoolReset} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-600 text-slate-600 transition hover:bg-slate-50 active:scale-95"><RotateCcw className="h-4 w-4" /> Réinitialiser</button>
          </div>
        </div>
      </div>

      {/* Tranche configurator */}
      <div className="rounded-2.5xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-royal-50 text-royal-700"><Layers className="h-5 w-5" /></span>
          <div className="flex-1">
            <h3 className="font-display text-lg font-700 text-ink">Tranches de paiement</h3>
            <p className="text-sm text-slate-500">Définissez le nombre et le nom de vos tranches (2, 3, 4 ou plus).</p>
          </div>
        </div>
        <div className="space-y-2">
          {tranches.map(t => (
            <div key={t.index} className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-royal-100 text-sm font-700 text-royal-700">{t.index}</span>
              <input type="text" value={t.label} onChange={e => renameTranche(t.index, e.target.value)} className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-600 text-ink outline-none transition focus:border-royal-400 focus:ring-4" placeholder={`Tranche ${t.index}`} />
              <FieldTick fieldKey={`tranche-${t.index}`} savedField={savedField} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button onClick={addTranche} disabled={tranches.length >= 12} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-royal-200 bg-royal-50 px-3 text-sm font-600 text-royal-700 transition hover:bg-royal-100 active:scale-95 disabled:opacity-40"><Plus className="h-4 w-4" /> Ajouter une tranche</button>
          {tranches.length > 1 && (
            <button onClick={removeTranche} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-600 text-red-600 transition hover:bg-red-100 active:scale-95"><Trash2 className="h-4 w-4" /> Retirer la dernière</button>
          )}
        </div>
      </div>

      {/* Fee type manager */}
      <div className="rounded-2.5xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700"><FileText className="h-5 w-5" /></span>
          <div className="flex-1">
            <h3 className="font-display text-lg font-700 text-ink">Types de frais</h3>
            <p className="text-sm text-slate-500">Ajoutez vos propres frais (inscription, fête, cantine, transport…).</p>
          </div>
        </div>
        {/* Fee type tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
          {feeTypes.map(ft => {
            const iconName = FEE_TYPE_ICONS[ft.feeType];
            const Icon = iconName ? FEE_ICONS[iconName] : FileText;
            const accent = getFeeAccent(ft.feeType);
            const isActive = ft.feeType === activeFeeType;
            return (
              <button key={ft.feeType} onClick={() => setActiveFeeType(ft.feeType)} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-700 transition ${isActive ? `${accent.wrap} ${accent.text} ring-2 ring-current/30` : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                <Icon className="h-4 w-4" />
                {ft.label}
                <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[9px] font-700 uppercase">{ft.paymentMode === 'tranche' ? `${tranches.length}×` : '1×'}</span>
                {!ft.isDefault && (
                  <span onClick={(e) => { e.stopPropagation(); removeFeeType(ft.feeType); }} className="ml-0.5 grid h-5 w-5 place-items-center rounded-full bg-red-100 text-red-600 transition hover:bg-red-200"><X className="h-3 w-3" /></span>
                )}
              </button>
            );
          })}
        </div>
        {/* Add custom fee type */}
        {showAddFee ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <input type="text" value={newFeeName} onChange={e => setNewFeeName(e.target.value)} placeholder="Nom du frais (ex: Cantine, Transport…)" className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-600 text-ink outline-none focus:border-royal-400 focus:ring-4" autoFocus onKeyDown={e => e.key === 'Enter' && addFeeType()} />
            <button onClick={addFeeType} disabled={!newFeeName.trim()} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-royal-700 px-4 text-sm font-700 text-white transition hover:bg-royal-800 active:scale-95 disabled:opacity-40"><Check className="h-4 w-4" strokeWidth={3} /> Ajouter</button>
            <button onClick={() => { setShowAddFee(false); setNewFeeName(''); }} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 active:scale-95"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <button onClick={() => setShowAddFee(true)} className="mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 text-sm font-600 text-teal-700 transition hover:bg-teal-100 active:scale-95"><Plus className="h-4 w-4" /> Ajouter un type de frais</button>
        )}
        {/* Mode toggle for active fee type */}
        {activeFt && (
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-sm font-600 text-slate-600">Mode de paiement pour <strong className="text-ink">{activeFt.label}</strong> :</span>
            <button onClick={() => toggleFeeMode(activeFt.feeType)} className={`rounded-lg px-3 py-1.5 text-xs font-700 transition ${activeFt.paymentMode === 'tranche' ? 'bg-royal-700 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
              Par tranche ({tranches.length} paiements)
            </button>
            <button onClick={() => toggleFeeMode(activeFt.feeType)} className={`rounded-lg px-3 py-1.5 text-xs font-700 transition ${activeFt.paymentMode === 'single' ? 'bg-royal-700 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
              Paiement unique
            </button>
          </div>
        )}
      </div>

      {/* Class filter */}
      <div className="relative max-w-xs"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrer une classe…" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-royal-400 focus:ring-4" /></div>

      {/* Amount grid for active fee type */}
      {activeFt && (
        <>
          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-2.5xl border border-slate-200 bg-white shadow-card md:block">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-700 uppercase tracking-wider text-slate-500">Classe</th>
                    {activeFt.paymentMode === 'tranche' ? tranches.map(t => (
                      <th key={t.index} className="border-l border-slate-200 px-4 py-3 text-left text-xs font-700 uppercase tracking-wider text-royal-700">{t.label}</th>
                    )) : (
                      <th className="border-l border-slate-200 px-4 py-3 text-left text-xs font-700 uppercase tracking-wider text-teal-700">Montant unique</th>
                    )}
                    <th className="border-l border-slate-200 px-4 py-3 text-right text-xs font-700 uppercase tracking-wider text-slate-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls, idx) => (
                    <tr key={cls} className="border-b border-slate-100 transition hover:bg-royal-50" style={{ background: idx % 2 ? 'var(--slate-50)' : '#fff' }}>
                      <td className="px-5 py-3"><span className="font-600 text-ink">{cls}</span></td>
                      {activeFt.paymentMode === 'tranche' ? tranches.map(t => (
                        <td key={t.index} className="border-l border-slate-100 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <PriceInput value={getAmount(configRows, activeFt.feeType, cls, t.index)} onChange={v => updateAmount(activeFt.feeType, cls, t.index, v)} accent={getFeeAccent(activeFt.feeType)} />
                            <FieldTick fieldKey={`${activeFt.feeType}-${cls}-${t.index}`} savedField={savedField} />
                          </div>
                        </td>
                      )) : (
                        <td className="border-l border-slate-100 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <PriceInput value={getAmount(configRows, activeFt.feeType, cls, 'single')} onChange={v => updateAmount(activeFt.feeType, cls, 'single', v)} accent={getFeeAccent(activeFt.feeType)} />
                            <FieldTick fieldKey={`${activeFt.feeType}-${cls}-single`} savedField={savedField} />
                          </div>
                        </td>
                      )}
                      <td className="border-l border-slate-100 px-4 py-3 text-right"><span className="font-display text-sm font-700 text-royal-700">{formatFCFA(getFeeTotalForClass(configRows, activeFt.feeType, cls))}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: stacked cards */}
          <div className="space-y-3 md:hidden">
            {classes.map(cls => (
              <div key={cls} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="font-display text-base font-800 text-ink">{cls}</span>
                  <span className="font-display text-sm font-700 text-royal-700">{formatFCFA(getFeeTotalForClass(configRows, activeFt.feeType, cls))}</span>
                </div>
                <div className="mt-1 text-[10px] font-600 uppercase tracking-wider text-slate-400">Total {activeFt.label}</div>
                <div className="mt-3 space-y-2.5">
                  {activeFt.paymentMode === 'tranche' ? tranches.map(t => (
                    <div key={t.index} className="flex items-center justify-between gap-3">
                      <span className="text-sm font-600 text-slate-600">{t.label}</span>
                      <div className="flex items-center gap-2">
                        <PriceInput value={getAmount(configRows, activeFt.feeType, cls, t.index)} onChange={v => updateAmount(activeFt.feeType, cls, t.index, v)} accent={getFeeAccent(activeFt.feeType)} />
                        <FieldTick fieldKey={`${activeFt.feeType}-${cls}-${t.index}`} savedField={savedField} />
                      </div>
                    </div>
                  )) : (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-600 text-slate-600">Montant</span>
                      <div className="flex items-center gap-2">
                        <PriceInput value={getAmount(configRows, activeFt.feeType, cls, 'single')} onChange={v => updateAmount(activeFt.feeType, cls, 'single', v)} accent={getFeeAccent(activeFt.feeType)} />
                        <FieldTick fieldKey={`${activeFt.feeType}-${cls}-single`} savedField={savedField} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Year-end section */}
      <YearEndSection uniforms={uniforms} books={books} onYearEnd={onYearEnd} />

      <div className="flex items-start gap-2 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-xs text-gold-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>Les nouveaux élèves inscrits via « Ajouter un élève » utiliseront automatiquement ces tarifs selon leur classe et les frais cochés. Modifier un tarif n'affecte pas les élèves déjà inscrits.</p></div>
    </div>
  );
}

function getAmount(rows: FeeConfigRow[], feeType: string, className: string, trancheKey: number | 'single'): number {
  const row = rows.find(r => r.feeType === feeType && r.className === className && r.trancheIndex === (trancheKey === 'single' ? null : trancheKey));
  return row?.amount ?? 0;
}

function SaveIndicator({ status, compact }: { status: SaveState; compact?: boolean }) {
  if (status === 'idle') return null;
  if (status === 'saving') return (
    <span className={`inline-flex items-center gap-1.5 ${compact ? 'text-[11px]' : 'text-xs'} font-600 text-slate-400`}>
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> {compact ? '' : 'Enregistrement…'}
    </span>
  );
  return (
    <span className={`inline-flex items-center gap-1 ${compact ? 'text-[11px]' : 'text-xs'} font-700 text-emerald-600`}>
      <Check className="h-3.5 w-3.5" strokeWidth={3} /> {compact ? '' : 'Enregistré'}
    </span>
  );
}

function FieldTick({ fieldKey, savedField }: { fieldKey: string; savedField: string | null }) {
  if (savedField !== fieldKey) return <span className="w-4 shrink-0" />;
  return (
    <span className="inline-flex w-4 shrink-0 animate-fadeIn">
      <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} />
    </span>
  );
}

function PriceInput({ value, onChange, accent }: { value: number; onChange: (v: number) => void; accent: { wrap: string; text: string } }) {
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-lg border border-slate-200 bg-white transition focus-within:border-royal-400">
      <input type="number" min={0} step={1000} value={value || ''} onChange={e => onChange(parseInt(e.target.value, 10))} placeholder="0" className={`h-9 w-16 min-w-0 bg-white px-2 text-right text-sm font-700 text-ink outline-none sm:h-10 sm:w-24 sm:px-3 md:w-20 ${value > 0 ? accent.wrap : ''}`} />
      <span className="flex items-center bg-slate-100 px-2 text-[10px] font-700 text-slate-500 sm:px-2.5 sm:text-[11px]">FCFA</span>
    </div>
  );
}

function YearEndSection({ uniforms, books, onYearEnd }: { uniforms: UniformStockItem[]; books: BookStockItem[]; onYearEnd: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);

  const totalUniforms = uniforms.reduce((s, i) => s + uniformRemaining(i), 0);
  const totalBooks = books.reduce((s, i) => s + bookRemaining(i), 0);

  const handleConfirm = () => {
    onYearEnd();
    setConfirm(false);
    setDone(true);
    setTimeout(() => setDone(false), 4000);
  };

  return (
    <div className="rounded-2.5xl border border-royal-200 bg-gradient-to-br from-royal-50 via-white to-gold-50 p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-royal-700 to-royal-900 text-white shadow-cardLg">
          <CalendarClock className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h3 className="font-display text-lg font-800 text-ink">Clôture d'exercice / Nouvelle Année</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            Prépare la rentrée scolaire en un clic : les compteurs « Vendus » et « Distribués » repassent à zéro, et le stock restant de cette année devient automatiquement l'« Ancien Stock » de la prochaine.
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-[11px] font-700 uppercase tracking-wider text-slate-400">Tenues reportées</div>
          <div className="font-display text-xl font-800 text-royal-700">{totalUniforms}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-[11px] font-700 uppercase tracking-wider text-slate-400">Livres reportés</div>
          <div className="font-display text-xl font-800 text-royal-700">{totalBooks}</div>
        </div>
      </div>
      {done ? (
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-700 text-emerald-700">
          <Check className="h-4 w-4" /> Nouvelle année scolaire préparée avec succès !
        </div>
      ) : confirm ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-600 text-slate-600">Confirmer la clôture ?</span>
          <button onClick={handleConfirm} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-royal-700 to-royal-900 px-4 py-2 text-sm font-700 text-white shadow-cardLg transition hover:brightness-105 active:scale-95">
            <Check className="h-4 w-4" /> Oui, préparer la rentrée
          </button>
          <button onClick={() => setConfirm(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-600 text-slate-500 transition hover:bg-slate-50">Annuler</button>
        </div>
      ) : (
        <button onClick={() => setConfirm(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 px-5 py-2.5 text-sm font-700 text-white shadow-gold transition hover:brightness-105 active:scale-95">
          <Sparkles className="h-4 w-4" /> Préparer la nouvelle rentrée scolaire <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
