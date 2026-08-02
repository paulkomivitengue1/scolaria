import { getSupabase } from './supabase';
import type {
  Student,
  ServiceSubscription,
  ServiceType,
  MonthKey,
  PricingConfig,
  UniformStockItem,
  BookStockItem,
  UniformCycle,
  UniformSize,
  BookClass,
  BookSubject,
} from '../types';
import { ALL_MONTHS, emptyPayments, CLASS_LIST } from '../types';

/* ────────────────────────────────────────────────────────
   Data access layer — every function filters by school_id
   so the frontend never has to thread it manually. RLS
   enforces the same isolation at the database level.
   ──────────────────────────────────────────────────────── */

// ── Students ────────────────────────────────────────────

export async function loadStudents(schoolId: string): Promise<Student[]> {
  const { data: rows, error } = await getSupabase()
    .from('students')
    .select('id, first_name, last_name, class_name, parent_name, parent_phone, services_json')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { data: pays, error: payErr } = await getSupabase()
    .from('payments')
    .select('student_id, type, month_key, amount')
    .in('student_id', ids);
  if (payErr) throw payErr;

  // Aggregate payments: { "studentId|type": { "monthKey": totalPaid } }
  const map: Record<string, Record<string, number>> = {};
  (pays || []).forEach((p) => {
    const k = `${p.student_id}|${p.type}`;
    if (!map[k]) map[k] = {};
    map[k][p.month_key] = (map[k][p.month_key] || 0) + p.amount;
  });

  return rows.map((r) => {
    const svcRaw = (r.services_json || []) as { type: ServiceType; annualFee: number }[];
    const services: ServiceSubscription[] = svcRaw.map((svc) => {
      const payRec = emptyPayments();
      const mp = map[`${r.id}|${svc.type}`] || {};
      ALL_MONTHS.forEach((m) => { payRec[m].paid = mp[m] || 0; });
      return { type: svc.type, annualFee: svc.annualFee, payments: payRec };
    });
    return {
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      className: r.class_name,
      parentName: r.parent_name,
      parentPhone: r.parent_phone,
      services,
    };
  });
}

export async function addStudentDB(schoolId: string, student: Omit<Student, 'id'>): Promise<string> {
  const servicesJson = student.services.map((s) => ({ type: s.type, annualFee: s.annualFee }));
  const { data, error } = await getSupabase()
    .from('students')
    .insert({
      school_id: schoolId,
      first_name: student.firstName,
      last_name: student.lastName,
      class_name: student.className,
      parent_name: student.parentName,
      parent_phone: student.parentPhone,
      services_json: servicesJson,
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
  type: ServiceType,
  monthKey: MonthKey,
  amount: number,
): Promise<void> {
  const { error } = await getSupabase().from('payments').insert({
    school_id: schoolId,
    student_id: studentId,
    type,
    month_key: monthKey,
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
  return (data || []).map((r) => ({
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
  return (data || []).map((r) => ({
    id: r.id,
    className: r.class_level as BookClass,
    subject: r.subject as BookSubject,
    inStock: r.in_stock,
    sold: r.sold,
  }));
}

/**
 * Sync the uniform stock array to the database.
 * Diffs prev vs next: inserts new items, updates changed ones, deletes removed ones.
 * Returns the array with DB-generated UUIDs replacing client-generated IDs.
 */
export async function syncUniformStock(
  schoolId: string,
  prev: UniformStockItem[],
  next: UniformStockItem[],
): Promise<UniformStockItem[]> {
  const prevMap = new Map(prev.map((i) => [i.id, i]));
  const nextMap = new Map(next.map((i) => [i.id, i]));
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
  const prevMap = new Map(prev.map((i) => [i.id, i]));
  const nextMap = new Map(next.map((i) => [i.id, i]));
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

// ── Pricing ─────────────────────────────────────────────

export async function loadPricing(schoolId: string): Promise<PricingConfig> {
  const { data, error } = await getSupabase()
    .from('pricing_config')
    .select('class_name, service, annual_fee')
    .eq('school_id', schoolId);
  if (error) throw error;

  const pricing: PricingConfig = {};
  CLASS_LIST.forEach((cls) => { pricing[cls] = { scolarite: 0, cantine: 0, transport: 0 }; });

  (data || []).forEach((row) => {
    if (!pricing[row.class_name]) pricing[row.class_name] = { scolarite: 0, cantine: 0, transport: 0 };
    pricing[row.class_name][row.service as ServiceType] = row.annual_fee;
  });
  return pricing;
}

export async function savePricing(schoolId: string, pricing: PricingConfig): Promise<void> {
  const rows: { school_id: string; class_name: string; service: string; annual_fee: number }[] = [];
  Object.entries(pricing).forEach(([className, services]) => {
    Object.entries(services).forEach(([service, fee]) => {
      rows.push({ school_id: schoolId, class_name: className, service, annual_fee: fee });
    });
  });
  const { error } = await getSupabase()
    .from('pricing_config')
    .upsert(rows, { onConflict: 'school_id,class_name,service' });
  if (error) throw error;
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
