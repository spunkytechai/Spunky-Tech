import { localDate } from '../src/utils/date';
import { dueDateForChoice, taskDueLabel } from '../src/utils/taskDueDate';


describe('localDate', () => {
  it('formats a local calendar date with zero-padded month and day', () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(localDate(new Date(2026, 9, 15, 0, 1))).toBe('2026-10-15');
  });

  it('uses the supplied date rather than converting through UTC', () => {
    const date = new Date(2026, 2, 1, 0, 0, 0);
    expect(localDate(date)).toBe('2026-03-01');
  });
});


describe('dueDateForChoice', () => {
  const now = new Date(2026, 9, 15, 23, 30);

  it('returns no date when no due date is selected', () => {
    expect(dueDateForChoice('none', now)).toBeNull();
  });

  it('uses the selected local calendar date for today', () => {
    expect(dueDateForChoice('today', now)).toBe('2026-10-15');
  });

  it('advances across month and year boundaries for tomorrow', () => {
    expect(dueDateForChoice('tomorrow', now)).toBe('2026-10-16');
    expect(dueDateForChoice('tomorrow', new Date(2026, 11, 31, 23, 30))).toBe('2027-01-01');
  });

  it('handles leap-day rollover in leap and non-leap years', () => {
    expect(dueDateForChoice('tomorrow', new Date(2024, 1, 28, 23, 30))).toBe('2024-02-29');
    expect(dueDateForChoice('tomorrow', new Date(2025, 1, 28, 23, 30))).toBe('2025-03-01');
  });
});


describe('taskDueLabel', () => {
  const now = new Date(2026, 9, 15, 12, 0);

  it('labels today and tomorrow clearly', () => {
    expect(taskDueLabel('2026-10-15', now)).toBe('TODAY');
    expect(taskDueLabel('2026-10-16', now)).toBe('TOMORROW');
  });

  it('marks past dates as overdue and preserves future dates', () => {
    expect(taskDueLabel('2026-10-14', now)).toBe('OVERDUE · 2026-10-14');
    expect(taskDueLabel('2026-10-20', now)).toBe('2026-10-20');
    expect(taskDueLabel(null, now)).toBeNull();
  });
});
