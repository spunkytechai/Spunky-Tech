import type { SQLiteDatabase } from 'expo-sqlite';

/** Generate a 128-bit identifier using SQLite's platform PRNG. */
export async function createLocalId(db: SQLiteDatabase, prefix: string): Promise<string> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT lower(hex(randomblob(16))) AS value',
  );
  if (!row?.value || !/^[a-f0-9]{32}$/.test(row.value)) {
    throw new Error('Could not generate a local record identifier');
  }
  return `${prefix}-${row.value}`;
}
