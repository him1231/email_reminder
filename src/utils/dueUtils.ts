import { Timestamp } from 'firebase/firestore';

export function computeDueDate(base: any, value: number, unit: string): Date | null {
  if (!base) return null;
  let baseDate: Date | null = null;
  if (base instanceof Date) baseDate = base;
  else if (base && typeof base.toDate === 'function') {
    try { baseDate = base.toDate(); } catch (e) { baseDate = null; }
  } else if (typeof base === 'string' || typeof base === 'number') {
    const d = new Date(base);
    if (!isNaN(d.getTime())) baseDate = d;
  }
  if (!baseDate) return null;

  const n = Number(value) || 0;
  const result = new Date(baseDate.getTime());
  switch (unit) {
    case 'days': result.setDate(result.getDate() + n); break;
    case 'weeks': result.setDate(result.getDate() + n * 7); break;
    case 'months': result.setMonth(result.getMonth() + n); break;
    case 'years': result.setFullYear(result.getFullYear() + n); break;
    default: result.setDate(result.getDate() + n); break;
  }
  return result;
}
