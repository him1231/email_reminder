import { resolveTaskDueDate, addRelativeTime } from '../../src/utils/dateUtils';

describe('dateUtils', () => {
  it('adds relative time correctly', () => {
    const base = new Date('2024-01-01');
    expect(addRelativeTime(base, 3, 'months').getMonth()).toBe(3); // Apr (0-based)
  });

  it('resolves relative due date from staff record', () => {
    const staff = { contractEffectiveDate: new Date('2024-02-01') };
    const task = { dueType: 'relative', relative: { field: 'contractEffectiveDate', value: 3, unit: 'months' } };
    const res = resolveTaskDueDate(task, staff);
    expect(res).not.toBeNull();
    expect(res!.getFullYear()).toBe(2024);
    expect(res!.getMonth()).toBe(4); // May (Feb + 3 months => May, month index 4)
  });
});
