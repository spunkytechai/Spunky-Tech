import type { SQLiteDatabase } from 'expo-sqlite';
import { initializeDatabase } from '../src/db/database';

type FakeDatabase = {
  execAsync: jest.Mock<Promise<void>, [string]>;
  getFirstAsync: jest.Mock<Promise<{ value: string } | null>, [string, ...unknown[]]>;
  withTransactionAsync: jest.Mock<Promise<void>, [() => Promise<void>]>;
};

function fakeDatabase(schemaVersion: string | null): FakeDatabase {
  const db = {} as FakeDatabase;
  db.execAsync = jest.fn(async () => undefined);
  db.getFirstAsync = jest.fn(async () =>
    schemaVersion === null ? null : { value: schemaVersion },
  );
  db.withTransactionAsync = jest.fn(async (work: () => Promise<void>) => work());
  return db;
}

describe('database migrations', () => {
  it('creates the current schema for a fresh database inside a transaction', async () => {
    const db = fakeDatabase(null);

    await initializeDatabase(db as unknown as SQLiteDatabase);

    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.execAsync.mock.calls.some(([sql]) => sql.includes('CREATE TABLE IF NOT EXISTS notes'))).toBe(true);
    expect(db.execAsync.mock.calls.some(([sql]) => sql.includes("'schema_version', '1'"))).toBe(true);
  });

  it('keeps an existing v1 database on its current schema without replaying the baseline migration', async () => {
    const db = fakeDatabase('1');

    await initializeDatabase(db as unknown as SQLiteDatabase);

    expect(db.getFirstAsync).toHaveBeenCalled();
    expect(db.execAsync.mock.calls.some(([sql]) => sql.includes('CREATE TABLE IF NOT EXISTS notes'))).toBe(false);
  });

  it('refuses a database created by a newer app version without running migrations', async () => {
    const db = fakeDatabase('99');

    await expect(initializeDatabase(db as unknown as SQLiteDatabase)).rejects.toThrow(
      'Database schema version 99 is newer than supported version 1',
    );
    expect(db.withTransactionAsync).not.toHaveBeenCalled();
  });
});
