import type { SQLiteDatabase } from 'expo-sqlite';
import { createLocalId } from '../src/db/id';

describe('createLocalId', () => {
  it('uses SQLite randomblob to create a prefixed 128-bit hexadecimal ID', async () => {
    const getFirstAsync = jest.fn().mockResolvedValue({ value: '0123456789abcdef0123456789abcdef' });
    const db = { getFirstAsync } as unknown as SQLiteDatabase;

    await expect(createLocalId(db, 'task')).resolves.toBe(
      'task-0123456789abcdef0123456789abcdef',
    );
    expect(getFirstAsync).toHaveBeenCalledWith(
      'SELECT lower(hex(randomblob(16))) AS value',
    );
  });

  it('rejects an invalid random value instead of creating a weak fallback ID', async () => {
    const db = {
      getFirstAsync: jest.fn().mockResolvedValue({ value: 'not-random-enough' }),
    } as unknown as SQLiteDatabase;

    await expect(createLocalId(db, 'note')).rejects.toThrow(
      'Could not generate a local record identifier',
    );
  });
});
