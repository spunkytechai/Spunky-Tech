/** Escape SQLite LIKE metacharacters so search input is treated literally. */
export function escapeNoteSearch(value: string): string {
  return value.replace(/[!%_]/g, '!$&');
}
