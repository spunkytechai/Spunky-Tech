import { localDate } from './date';

export type DueChoice = 'none' | 'today' | 'tomorrow';

export function dueDateForChoice(choice: DueChoice, now: Date = new Date()): string | null {
  if (choice === 'none') return null;
  if (choice === 'today') return localDate(now);
  const tomorrow = new Date(now.getTime());
  tomorrow.setDate(tomorrow.getDate() + 1);
  return localDate(tomorrow);
}


export function taskDueLabel(dueAt: string | null, now: Date = new Date()): string | null {
  if (!dueAt) return null;
  const today = localDate(now);
  if (dueAt === today) return 'TODAY';
  const tomorrow = new Date(now.getTime());
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dueAt === localDate(tomorrow)) return 'TOMORROW';
  if (dueAt < today) return 'OVERDUE · ' + dueAt;
  return dueAt;
}
