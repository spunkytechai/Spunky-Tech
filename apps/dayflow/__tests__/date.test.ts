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
