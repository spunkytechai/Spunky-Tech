import { calculateHabitStats } from '../src/utils/habitStats';

describe('calculateHabitStats', () => {
  it('counts consecutive scheduled days and skips rest days', () => {
    // Monday 2026-11-02; schedule Monday, Wednesday, Friday.
    const stats = calculateHabitStats('1,3,5', [
      '2026-10-30', '2026-11-02',
    ], new Date(2026, 10, 3));
    expect(stats.currentStreak).toBe(2);
    expect(stats.isScheduledToday).toBe(false);
    expect(stats.completedDays).toBe(2);
  });

  it('keeps a streak alive while the current scheduled day is still pending', () => {
    const stats = calculateHabitStats('1,2,3,4,5,6,0', [
      '2026-11-06', '2026-11-07',
    ], new Date(2026, 10, 8));
    expect(stats.currentStreak).toBe(2);
    expect(stats.isScheduledToday).toBe(true);
    expect(stats.isCompletedToday).toBe(false);
  });

  it('breaks the streak at a missed scheduled day', () => {
    const stats = calculateHabitStats('1,2,3,4,5,6,0', [
      '2026-11-05',
    ], new Date(2026, 10, 8));
    expect(stats.currentStreak).toBe(0);
  });

  it('returns zero streak when no days are scheduled', () => {
    const stats = calculateHabitStats('', ['2026-11-08'], new Date(2026, 10, 8));
    expect(stats.currentStreak).toBe(0);
    expect(stats.isScheduledToday).toBe(false);
  });
});
