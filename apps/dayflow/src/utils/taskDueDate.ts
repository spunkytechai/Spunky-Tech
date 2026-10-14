import { localDate } from './date';

export type DueChoice = 'none' | 'today' | 'tomorrow';

export function dueDateForChoice(choice: DueChoice, now: Date = new Date()): string | null {
  if (choice === 'none') return null;
  if (choice === 'today') return localDate(now);
  const tomorrow = new Date(now.getTime());
  tomorrow.setDate(tomorrow.getDate() + 1);
  return localDate(tomorrow);
}
