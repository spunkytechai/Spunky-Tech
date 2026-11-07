import { localDate } from './date';

export type HabitStats = {
  isScheduledToday: boolean;
  isCompletedToday: boolean;
  completedDays: number;
  currentStreak: number;
};

function parseSchedule(scheduleDays: string): Set<number> {
  return new Set(
    scheduleDays.split(',')
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
  );
}

/**
 * Counts consecutive completed scheduled days. Unscheduled days are skipped.
 * An incomplete current day is treated as still in progress until the day ends.
 */
export function calculateHabitStats(
  scheduleDays: string,
  completedDates: readonly string[],
  today: Date = new Date(),
): HabitStats {
  const scheduledDays = parseSchedule(scheduleDays);
  const completed = new Set(completedDates);
  const todayKey = localDate(today);
  const isScheduledToday = scheduledDays.has(today.getDay());
  const isCompletedToday = completed.has(todayKey);

  let currentStreak = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // If today is a scheduled day and is not checked in yet, allow it to remain
  // pending; the streak is evaluated from the previous scheduled day.
  if (isScheduledToday && !isCompletedToday) cursor.setDate(cursor.getDate() - 1);

  for (let daysBack = 0; daysBack < 3660; daysBack += 1) {
    if (!scheduledDays.has(cursor.getDay())) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (!completed.has(localDate(cursor))) break;
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    isScheduledToday,
    isCompletedToday,
    completedDays: completed.size,
    currentStreak,
  };
}
