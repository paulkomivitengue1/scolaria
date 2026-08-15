import { getSupabase } from './supabase';
import type {
  Student,
  FeeSubscription,
  FeeConfigRow,
  TrancheDef,
  FeeTypeDef,
  SchoolFeeConfig,
  UniformStockItem,
  BookStockItem,
  UniformCycle,
  UniformSize,
  BookClass,
  BookSubject,
} from '../types';
import { CLASS_LIST, DEFAULT_FEE_TYPES } from '../types';

/* ────────────────────────────────────────────────────────
   Data access layer — every function filters by school_id
   so the frontend never has to thread it manually. RLS
   enforces the same isolation at the database level.
   ──────────────────────────────────────────────────────── */

// ── School fee config (tranches + fee types + amounts) ──

export async function loadSchoolFeeConfig(schoolId: string): Promise<SchoolFeeConfig> {
  const supa = getSupabase();

  const [tranchesRes, feeConfigRes] = await Promise.all([
    supa.from('school_tranches').select('tranche_index, label').eq('school_id', schoolId).order('tranche_index'),
    supa.from('fee_config').select('fee_type, class_name, payment_mode, tranche_index, amount').eq('school_id', schoolId),
  ]);

  if (tranchesRes.error) throw tranchesRes.error;
  if (feeConfigRes.error) throw feeConfigRes.error;

  const tranches: TrancheDef[] = (tranchesRes.data || []).map(r => ({
    index: r.tranche_index,
    label: r.label || `Tranche ${r.tranche_index}`,
  }));

  const feeConfig: FeeConfigRow[] = (feeConfigRes.data || []).map(r => ({
    feeType: r.fee_type,
    className: r.class_name,
    paymentMode: r.payment_mode as 'tranche' | 'single',
    trancheIndex: r.tranche_index,
    amount: r.amount,
  }));

  // Derive fee types from the config data
  const feeTypeSet = new Set(feeConfig.map(r => r.feeType));
  const feeTypes: FeeTypeDef[] = [];
  for (const def of DEFAULT_FEE_TYPES) {
    if (feeTypeSet.has(def.feeType)) {
      feeTypes.push(def);
      feeTypeSet.delete(def.feeType);
    }
  }
  // Add any custom fee types not in defaults
  for (const ft of feeTypeSet) {
    const rows = feeConfig.filter(r => r.feeType === ft);
    const mode = rows[0]?.paymentMode || 'tranche';
    feeTypes.push({ feeType: ft, label: ft, paymentMode: mode, isDefault: false });
  }

  return { tranches, feeTypes, feeConfig };
}

export async function saveTranches(schoolId: string, tranches: TrancheDef[]): Promise<void> {
  const supa = getSupabase();
  // Delete existing and re-insert (simple sync for small arrays)
  const { error: delErr } = await supa.from('school_tranches').delete().eq('school_id', schoolId);
  if (delErr) throw delErr;

  if (tranches.length === 0) return;

  const rows = tranches.map(t => ({
    school_id: schoolId,
    tranche_index: t.index,
    label: t.label,
  }));
  const { error } = await supa.from('school_tranches').insert(rows);
  if (error) throw error;
}

export async function saveFeeConfig(schoolId: string, feeConfig: FeeConfigRow[]): Promise<void> {
  const supa = getSupabase();
  // Delete existing and re-insert
  const { error: delErr } = await supa.from('fee_config').delete().eq('school_id', schoolId);
  if (delErr) throw delErr;

  if (feeConfig.length === 0) return;

  const rows = feeConfig.map(r => ({
    school_id: schoolId,
    fee_type: r.feeType,
    class_name: r.className,
    payment_mode: r.paymentMode,
    tranche_index: r.trancheIndex,
    amount: r.amount,
  }));
  const { error } = await supa.from('fee_config').insert(rows);
  if (error) throw error;
}

// ── Students ────────────────────────────────────────────

export async function loadStudents(schoolId: string, _feeConfig: FeeConfigRow[], tranches: TrancheDef[]): Promise<Student[]> {
  const supa = getSupabase();
  const { data: rows, error } = await supa
    .from('students')
    .select('id, first_name, last_name, class_name, parent_name, parent_phone, fees_json')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const ids = rows.map(r => r.id);
  const { data: pays, error: payErr } = await supa
    .from('payments')
    .select('student_id, fee_type, tranche_index, amount')
    .in('student_id', ids);
  if (payErr) throw payErr;

  // Aggregate payments: { "studentId|feeType|trancheKey": totalPaid }
  const payMap: Record<string, number> = {};
  (pays || []).forEach(p => {
    const key = `${p.student_id}|${p.fee_type}|${p.tranche_index}`;
    payMap[key] = (payMap[key] || 0) + p.amount;
  });

  return rows.map(r => {
    const feesRaw = (r.fees_json || []) as { feeType: string; paymentMode: 'tranche' | 'single'; totalExpected: number }[];
    const fees: FeeSubscription[] = feesRaw.map(f => {
      const payments: Record<string, { paid: number }> = {};
      if (f.paymentMode === 'single') {
        const paid = payMap[`${r.id}|${f.feeType}|single`] || 0;
        payments['single'] = { paid };
      } else {
        const trancheCount = tranches.length || 3;
        for (let i = 1; i <= trancheCount; i++) {
          const paid = payMap[`${r.id}|${f.feeType}|${i}`] || 0;
          payments[i] = { paid };
        }
      }
      return { feeType: f.feeType, paymentMode: f.paymentMode, payments, totalExpected: f.totalExpected };
    });
    return {
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      className: r.class_name,
      parentName: r.parent_name,
      parentPhone: r.parent_phone,
      fees,
    };
  });
}

export async function addStudentDB(schoolId: string, student: Omit<Student, 'id'>): Promise<string> {
  const feesJson = student.fees.map(f => ({
    feeType: f.feeType,
    paymentMode: f.paymentMode,
    totalExpected: f.totalExpected,
  }));
  const { data, error } = await getSupabase()
    .from('students')
    .insert({
      school_id: schoolId,
      first_name: student.firstName,
      last_name: student.lastName,
      class_name: student.className,
      parent_name: student.parentName,
      parent_phone: student.parentPhone,
      fees_json: feesJson,
      status: 'actif',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function deleteStudentDB(studentId: string): Promise<void> {
  const { error } = await getSupabase().from('students').delete().eq('id', studentId);
  if (error) throw error;
}

// ── Payments ────────────────────────────────────────────

export async function recordPayment(
  schoolId: string,
  studentId: string,
  feeType: string,
  trancheKey: number | 'single',
  amount: number,
): Promise<void> {
  const { error } = await getSupabase().from('payments').insert({
    school_id: schoolId,
    student_id: studentId,
    type: feeType,               // populate old column for backward compat
    month_key: 'oct',            // legacy placeholder
    fee_type: feeType,
    tranche_index: trancheKey === 'single' ? 0 : trancheKey,
    amount,
    method: 'especes',
  });
  if (error) throw error;
}

// ── Stock ───────────────────────────────────────────────

export async function loadUniformStock(schoolId: string): Promise<UniformStockItem[]> {
  const { data, error } = await getSupabase()
    .from('stock_items')
    .select('id, size, cycle, old_stock, new_stock, sold, price')
    .eq('school_id', schoolId)
    .eq('category', 'tenue')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id,
    cycle: r.cycle as UniformCycle,
    size: r.size as UniformSize,
    oldStock: r.old_stock,
    newStock: r.new_stock,
    sold: r.sold,
    price: r.price,
  }));
}

export async function loadBookStock(schoolId: string): Promise<BookStockItem[]> {
  const { data, error } = await getSupabase()
    .from('stock_items')
    .select('id, class_level, subject, in_stock, sold')
    .eq('school_id', schoolId)
    .eq('category', 'livre')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id,
    className: r.class_level as BookClass,
    subject: r.subject as BookSubject,
    inStock: r.in_stock,
    sold: r.sold,
  }));
}

export async function syncUniformStock(
  schoolId: string,
  prev: UniformStockItem[],
  next: UniformStockItem[],
): Promise<UniformStockItem[]> {
  const prevMap = new Map(prev.map(i => [i.id, i]));
  const nextMap = new Map(next.map(i => [i.id, i]));
  const result = [...next];

  for (let i = 0; i < next.length; i++) {
    const item = next[i];
    if (!prevMap.has(item.id)) {
      const { data, error } = await getSupabase()
        .from('stock_items')
        .insert({
          school_id: schoolId, category: 'tenue', name: '',
          size: item.size, cycle: item.cycle,
          old_stock: item.oldStock, new_stock: item.newStock,
          sold: item.sold, price: item.price,
        })
        .select('id')
        .single();
      if (!error && data) result[i] = { ...item, id: data.id };
    } else {
      const old = prevMap.get(item.id)!;
      if (old.oldStock !== item.oldStock || old.newStock !== item.newStock ||
          old.sold !== item.sold || old.price !== item.price) {
        await getSupabase()
          .from('stock_items')
          .update({ old_stock: item.oldStock, new_stock: item.newStock, sold: item.sold, price: item.price })
          .eq('id', item.id);
      }
    }
  }

  for (const old of prev) {
    if (!nextMap.has(old.id)) await getSupabase().from('stock_items').delete().eq('id', old.id);
  }
  return result;
}

export async function syncBookStock(
  schoolId: string,
  prev: BookStockItem[],
  next: BookStockItem[],
): Promise<BookStockItem[]> {
  const prevMap = new Map(prev.map(i => [i.id, i]));
  const nextMap = new Map(next.map(i => [i.id, i]));
  const result = [...next];

  for (let i = 0; i < next.length; i++) {
    const item = next[i];
    if (!prevMap.has(item.id)) {
      const { data, error } = await getSupabase()
        .from('stock_items')
        .insert({
          school_id: schoolId, category: 'livre', name: '',
          class_level: item.className, subject: item.subject,
          in_stock: item.inStock, sold: item.sold,
        })
        .select('id')
        .single();
      if (!error && data) result[i] = { ...item, id: data.id };
    } else {
      const old = prevMap.get(item.id)!;
      if (old.inStock !== item.inStock || old.sold !== item.sold) {
        await getSupabase()
          .from('stock_items')
          .update({ in_stock: item.inStock, sold: item.sold })
          .eq('id', item.id);
      }
    }
  }

  for (const old of prev) {
    if (!nextMap.has(old.id)) await getSupabase().from('stock_items').delete().eq('id', old.id);
  }
  return result;
}

// ── Legacy pricing (kept for backward compat) ───────────

export async function loadPricing(schoolId: string): Promise<Record<string, Record<string, number>>> {
  const { data, error } = await getSupabase()
    .from('pricing_config')
    .select('class_name, service, annual_fee')
    .eq('school_id', schoolId);
  if (error) throw error;

  const pricing: Record<string, Record<string, number>> = {};
  CLASS_LIST.forEach(cls => { pricing[cls] = { scolarite: 0, cantine: 0, transport: 0 }; });

  (data || []).forEach(row => {
    if (!pricing[row.class_name]) pricing[row.class_name] = { scolarite: 0, cantine: 0, transport: 0 };
    pricing[row.class_name][row.service] = row.annual_fee;
  });
  return pricing;
}

// ── School ──────────────────────────────────────────────

export async function updateSchoolName(schoolId: string, name: string): Promise<void> {
  const { error } = await getSupabase().from('schools').update({ name }).eq('id', schoolId);
  if (error) throw error;
}

// ── Year-end stock reset ────────────────────────────────

export async function yearEndStockReset(
  _schoolId: string,
  uniforms: UniformStockItem[],
  books: BookStockItem[],
): Promise<void> {
  for (const u of uniforms) {
    const remaining = Math.max(0, u.oldStock + u.newStock - u.sold);
    await getSupabase()
      .from('stock_items')
      .update({ old_stock: remaining, new_stock: 0, sold: 0 })
      .eq('id', u.id);
  }
  for (const b of books) {
    const remaining = Math.max(0, b.inStock - b.sold);
    await getSupabase()
      .from('stock_items')
      .update({ in_stock: remaining, sold: 0 })
      .eq('id', b.id);
  }
}
