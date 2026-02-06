export function addRelativeTime(baseDate: Date, value: number, unit: 'days'|'weeks'|'months'|'years') {
  const date = new Date(baseDate);
  switch (unit) {
    case 'days': date.setDate(date.getDate() + value); return date;
    case 'weeks': date.setDate(date.getDate() + value * 7); return date;
    case 'months': date.setMonth(date.getMonth() + value); return date;
    case 'years': date.setFullYear(date.getFullYear() + value); return date;
    default: return date;
  }
}

export function resolveTaskDueDate(task: any, staffRecord: any): Date | null {
  if (!task) return null;
  if (task.dueType === 'fixed') {
    return task.dueDate ? (task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate)) : null;
  }
  if (task.dueType === 'relative' && task.relative && task.relative.field) {
    const base = staffRecord?.[task.relative.field];
    const baseDate = base && base.toDate ? base.toDate() : (base ? new Date(base) : null);
    if (!baseDate) return null;
    return addRelativeTime(baseDate, Number(task.relative.value || 0), task.relative.unit || 'months');
  }
  return null;
}