import {
  parseHabitSchedule,
  serializeHabitSchedule,
  toggleHabitDay,
} from '../src/utils/habitSchedule';

describe('habit schedule helpers', () => {
  it('parses valid weekdays, removes duplicates and ignores invalid values', () => {
    expect(parseHabitSchedule('1, 3,3,6,7,-1,2x')).toEqual([1, 3, 6]);
  });

  it('serializes unique valid weekdays in calendar order', () => {
    expect(serializeHabitSchedule([5, 1, 5, 9, 0])).toBe('0,1,5');
  });

  it('toggles a selected day on and off without mutating the input', () => {
    const days = [1, 3];
    expect(toggleHabitDay(days, 5)).toEqual([1, 3, 5]);
    expect(toggleHabitDay(days, 3)).toEqual([1]);
    expect(days).toEqual([1, 3]);
  });

  it('ignores invalid weekday selections', () => {
    expect(toggleHabitDay([1], 7)).toEqual([1]);
  });
});
