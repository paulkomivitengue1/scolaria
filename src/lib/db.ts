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
  GradePeriod,
  ReportCard,
  GradeRow,
  Teacher,
  SalaryPayment,
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
    .select('id, first_name, last_name, class_name, parent_name, parent_phone, fees_json, matricule, sexe')
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
      matricule: r.matricule || '',
      sexe: (r.sexe === 'F' ? 'F' : 'M') as 'M' | 'F',
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
      matricule: student.matricule || null,
      sexe: student.sexe,
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

export async function updateStudentDB(studentId: string, updates: {
  firstName: string;
  lastName: string;
  className: string;
  parentName: string;
  parentPhone: string;
  fees: FeeSubscription[];
  matricule: string;
  sexe: 'M' | 'F';
}): Promise<void> {
  const feesJson = updates.fees.map(f => ({
    feeType: f.feeType,
    paymentMode: f.paymentMode,
    totalExpected: f.totalExpected,
  }));
  const { error } = await getSupabase()
    .from('students')
    .update({
      first_name: updates.firstName,
      last_name: updates.lastName,
      class_name: updates.className,
      parent_name: updates.parentName,
      parent_phone: updates.parentPhone,
      fees_json: feesJson,
      matricule: updates.matricule || null,
      sexe: updates.sexe,
    })
    .eq('id', studentId);
  if (error) throw error;
}

export async function generateMatricule(schoolId: string, schoolName: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = (schoolName || 'ECOLE')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 5) || 'ECOLE';
  const { data, error } = await getSupabase()
    .from('students')
    .select('matricule')
    .eq('school_id', schoolId)
    .like('matricule', `${prefix}-${year}-%`);
  if (error) throw error;
  let maxSeq = 0;
  (data || []).forEach(r => {
    if (r.matricule) {
      const match = r.matricule.match(/-(\d+)$/);
      if (match) maxSeq = Math.max(maxSeq, parseInt(match[1], 10));
    }
  });
  const next = maxSeq + 1;
  return `${prefix}-${year}-${String(next).padStart(3, '0')}`;
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
    .select('id, class_level, subject, in_stock, sold, price')
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
    price: r.price ?? 0,
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
          in_stock: item.inStock, sold: item.sold, price: item.price,
        })
        .select('id')
        .single();
      if (!error && data) result[i] = { ...item, id: data.id };
    } else {
      const old = prevMap.get(item.id)!;
      if (old.inStock !== item.inStock || old.sold !== item.sold || old.price !== item.price) {
        await getSupabase()
          .from('stock_items')
          .update({ in_stock: item.inStock, sold: item.sold, price: item.price })
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

// ── Grade periods ──────────────────────────────────────

export async function loadGradePeriods(schoolId: string): Promise<GradePeriod[]> {
  const { data, error } = await getSupabase()
    .from('grade_periods')
    .select('period_index, label')
    .eq('school_id', schoolId)
    .order('period_index');
  if (error) throw error;
  return (data || []).map(r => ({ index: r.period_index, label: r.label || `Période ${r.period_index}` }));
}

export async function saveGradePeriods(schoolId: string, periods: GradePeriod[]): Promise<void> {
  const supa = getSupabase();
  const { error: delErr } = await supa.from('grade_periods').delete().eq('school_id', schoolId);
  if (delErr) throw delErr;
  if (periods.length === 0) return;
  const rows = periods.map(p => ({ school_id: schoolId, period_index: p.index, label: p.label }));
  const { error } = await supa.from('grade_periods').insert(rows);
  if (error) throw error;
}

// ── Report cards ───────────────────────────────────────

export async function loadReportCards(schoolId: string, studentId: string): Promise<ReportCard[]> {
  const supa = getSupabase();
  const { data: cards, error } = await supa
    .from('report_cards')
    .select('id, student_id, period_index, period_label, academic_year, status, appreciation, updated_at')
    .eq('school_id', schoolId)
    .eq('student_id', studentId)
    .order('period_index', { ascending: true });
  if (error) throw error;
  if (!cards || cards.length === 0) return [];

  const cardIds = cards.map(c => c.id);
  const { data: grades, error: gradeErr } = await supa
    .from('grades')
    .select('id, report_card_id, subject, score, max_score, coefficient')
    .in('report_card_id', cardIds);
  if (gradeErr) throw gradeErr;

  const gradesByCard: Record<string, GradeRow[]> = {};
  (grades || []).forEach(g => {
    if (!gradesByCard[g.report_card_id]) gradesByCard[g.report_card_id] = [];
    gradesByCard[g.report_card_id].push({
      id: g.id,
      subject: g.subject,
      score: Number(g.score),
      maxScore: Number(g.max_score),
      coefficient: Number(g.coefficient),
    });
  });

  return cards.map(c => ({
    id: c.id,
    studentId: c.student_id,
    periodIndex: c.period_index,
    periodLabel: c.period_label,
    academicYear: c.academic_year,
    status: c.status as 'draft' | 'finalized',
    appreciation: c.appreciation || '',
    grades: gradesByCard[c.id] || [],
    updatedAt: c.updated_at,
  }));
}

export async function createReportCard(
  schoolId: string,
  studentId: string,
  periodIndex: number,
  periodLabel: string,
  academicYear: string,
): Promise<string> {
  const { data, error } = await getSupabase()
    .from('report_cards')
    .insert({
      school_id: schoolId,
      student_id: studentId,
      period_index: periodIndex,
      period_label: periodLabel,
      academic_year: academicYear,
      status: 'draft',
      appreciation: '',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateReportCard(
  cardId: string,
  fields: { appreciation?: string; status?: 'draft' | 'finalized' }
): Promise<void> {
  const { error } = await getSupabase()
    .from('report_cards')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', cardId);
  if (error) throw error;
}

export async function deleteReportCard(cardId: string): Promise<void> {
  const { error } = await getSupabase().from('report_cards').delete().eq('id', cardId);
  if (error) throw error;
}

// ── Grades ─────────────────────────────────────────────

export async function saveGrade(
  cardId: string,
  grade: { id?: string; subject: string; score: number; maxScore: number; coefficient: number }
): Promise<string> {
  const supa = getSupabase();
  if (grade.id) {
    const { error } = await supa.from('grades').update({
      subject: grade.subject,
      score: grade.score,
      max_score: grade.maxScore,
      coefficient: grade.coefficient,
    }).eq('id', grade.id);
    if (error) throw error;
    return grade.id;
  }
  const { data, error } = await supa.from('grades').insert({
    report_card_id: cardId,
    subject: grade.subject,
    score: grade.score,
    max_score: grade.maxScore,
    coefficient: grade.coefficient,
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function deleteGrade(gradeId: string): Promise<void> {
  const { error } = await getSupabase().from('grades').delete().eq('id', gradeId);
  if (error) throw error;
}
// ── Dépenses ───────────────────────────────────────────

export async function loadExpenses(schoolId: string): Promise<import('../types').Expense[]> {
  const { data, error } = await getSupabase()
    .from('expenses')
    .select('id, label, amount, category, expense_date')
    .eq('school_id', schoolId)
    .order('expense_date', { ascending: false });
  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id,
    label: r.label,
    amount: r.amount,
    category: r.category,
    expenseDate: r.expense_date,
  }));
}

export async function addExpenseDB(
  schoolId: string,
  expense: Omit<import('../types').Expense, 'id'>
): Promise<string> {
  const { data, error } = await getSupabase()
    .from('expenses')
    .insert({
      school_id: schoolId,
      label: expense.label,
      amount: expense.amount,
      category: expense.category,
      expense_date: expense.expenseDate,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function deleteExpenseDB(expenseId: string): Promise<void> {
  const { error } = await getSupabase().from('expenses').delete().eq('id', expenseId);
  if (error) throw error;
}

// ── Teachers & Salary Payments ─────────────────────────

export async function loadTeachers(schoolId: string): Promise<Teacher[]> {
  const { data, error } = await getSupabase()
    .from('teachers')
    .select('id, first_name, last_name, phone, subject, monthly_salary')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    phone: r.phone || '',
    subject: r.subject || '',
    monthlySalary: r.monthly_salary ?? 0,
  }));
}

export async function addTeacherDB(
  schoolId: string,
  teacher: Omit<Teacher, 'id'>,
): Promise<string> {
  const { data, error } = await getSupabase()
    .from('teachers')
    .insert({
      school_id: schoolId,
      first_name: teacher.firstName,
      last_name: teacher.lastName,
      phone: teacher.phone,
      subject: teacher.subject,
      monthly_salary: teacher.monthlySalary,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateTeacherDB(
  teacherId: string,
  updates: { firstName: string; lastName: string; phone: string; subject: string; monthlySalary: number },
): Promise<void> {
  const { error } = await getSupabase()
    .from('teachers')
    .update({
      first_name: updates.firstName,
      last_name: updates.lastName,
      phone: updates.phone,
      subject: updates.subject,
      monthly_salary: updates.monthlySalary,
    })
    .eq('id', teacherId);
  if (error) throw error;
}

export async function deleteTeacherDB(teacherId: string): Promise<void> {
  const { error } = await getSupabase().from('teachers').delete().eq('id', teacherId);
  if (error) throw error;
}

export async function loadSalaryPayments(schoolId: string): Promise<SalaryPayment[]> {
  const { data, error } = await getSupabase()
    .from('salary_payments')
    .select('id, teacher_id, month, amount, paid_at')
    .eq('school_id', schoolId)
    .order('paid_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id,
    teacherId: r.teacher_id,
    month: r.month,
    amount: r.amount,
    paidAt: r.paid_at,
  }));
}

export async function paySalaryDB(
  schoolId: string,
  teacherId: string,
  month: string,
  amount: number,
): Promise<string> {
  const { data, error } = await getSupabase()
    .from('salary_payments')
    .insert({
      school_id: schoolId,
      teacher_id: teacherId,
      month,
      amount,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function unpaySalaryDB(paymentId: string): Promise<void> {
  const { error } = await getSupabase().from('salary_payments').delete().eq('id', paymentId);
  if (error) throw error;
}
