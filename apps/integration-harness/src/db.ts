import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type SqliteDb = DatabaseSync;

export function openDatabase(path: string): SqliteDb {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON;");
  return db;
}

export function migrate(db: SqliteDb): void {
  const schemaPath = resolve(process.cwd(), "apps/integration-harness/src/schema.sql");
  db.exec(readFileSync(schemaPath, "utf8"));
}

export function withTransaction<T>(db: SqliteDb, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
