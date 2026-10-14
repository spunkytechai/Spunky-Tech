import { localDate } from '../src/utils/date';

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


import { dueDateForChoice } from '../src/utils/taskDueDate';

describe('dueDateForChoice', () => {
  const now = new Date(2026, 9, 15, 23, 30);

  it('returns no date when no due date is selected', () => {
    expect(dueDateForChoice('none', now)).toBeNull();
  });

  it('uses the selected local calendar date for today', () => {
    expect(dueDateForChoice('today', now)).toBe('2026-10-15');
  });

  it('advances across month boundaries for tomorrow', () => {
    expect(dueDateForChoice('tomorrow', now)).toBe('2026-10-16');
    expect(dueDateForChoice('tomorrow', new Date(2026, 11, 31, 23, 30))).toBe('2027-01-01');
  });
});
