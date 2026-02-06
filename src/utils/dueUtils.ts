export function computeDueDate(base: any, value: number, unit: string): Date | null {
  if (!base) return null;
  let baseDate: Date | null = null;
  if (base instanceof Date) baseDate = base;
  // Firestore Timestamp has toDate()
  if ((base as any)?.toDate && typeof (base as any).toDate === 'function') baseDate = (base as any).toDate();
  if (!baseDate) return null;
  const d = new Date(baseDate.getTime());
  const v = Number(value) || 0;
  switch ((unit || '').toLowerCase()) {
    case 'day':
    case 'days':
      d.setDate(d.getDate() + v);
      break;
    case 'week':
    case 'weeks':
      d.setDate(d.getDate() + v * 7);
      break;
    case 'month':
    case 'months':
      d.setMonth(d.getMonth() + v);
      break;
    case 'year':
    case 'years':
      d.setFullYear(d.getFullYear() + v);
      break;
    default:
      return null;
  }
  return d;
}
