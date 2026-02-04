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
