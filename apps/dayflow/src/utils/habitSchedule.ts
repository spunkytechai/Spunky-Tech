export const HABIT_WEEKDAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
] as const;

export function parseHabitSchedule(value: string): number[] {
  return [...new Set(
    value.split(',')
      .map((part) => part.trim())
      .filter((part) => /^(0|[1-6])$/.test(part))
      .map(Number),
  )].sort((a, b) => a - b);
}

export function serializeHabitSchedule(days: readonly number[]): string {
  return [...new Set(days)]
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b)
    .join(',');
}

export function toggleHabitDay(days: readonly number[], day: number): number[] {
  if (!Number.isInteger(day) || day < 0 || day > 6) return [...days];
  return days.includes(day)
    ? days.filter((value) => value !== day)
    : [...days, day].sort((a, b) => a - b);
}
