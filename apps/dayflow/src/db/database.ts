import type { SQLiteDatabase } from 'expo-sqlite';

const INITIAL_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    nickname TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );
  INSERT OR IGNORE INTO user_profile(id, nickname, updated_at) VALUES (1, '', CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  INSERT OR IGNORE INTO app_settings(key, value, updated_at) VALUES ('show_daily_focus', '1', CURRENT_TIMESTAMP);
  INSERT OR IGNORE INTO app_settings(key, value, updated_at) VALUES ('week_start', 'monday', CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS daily_focus (
    local_date TEXT PRIMARY KEY NOT NULL,
    focus_text TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    due_at TEXT,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    schedule_days TEXT NOT NULL DEFAULT '1,2,3,4,5,6,0',
    is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS habit_entries (
    id TEXT PRIMARY KEY NOT NULL,
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    local_date TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    UNIQUE(habit_id, local_date)
  );
  CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_at);
  CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(is_completed);
  CREATE INDEX IF NOT EXISTS idx_habit_entries_date ON habit_entries(local_date);
`;

type Migration = {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
};

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: async (db) => {
      await db.execAsync(INITIAL_SCHEMA_SQL);
    },
  },
];

const CURRENT_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA journal_mode = WAL;');

  await db.withTransactionAsync(async () => {
    // The metadata table must exist before reading the version. Creating it is
    // safe for both a new install and databases initialized by schema v1.
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS schema_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);

    const versionRow = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM schema_meta WHERE key = 'schema_version'",
    );
    const version = versionRow ? Number.parseInt(versionRow.value, 10) : 0;

    if (!Number.isInteger(version) || version < 0) {
      throw new Error('Database schema version is invalid');
    }

    if (version > CURRENT_SCHEMA_VERSION) {
      throw new Error(
        `Database schema version ${version} is newer than supported version ${CURRENT_SCHEMA_VERSION}`,
      );
    }

    for (const migration of MIGRATIONS) {
      if (migration.version <= version) continue;

      await migration.up(db);
      await db.execAsync(
        `INSERT OR REPLACE INTO schema_meta(key, value) VALUES ('schema_version', '${migration.version}')`,
      );
    }
  });
}
