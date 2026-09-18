import pg from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema.ts";

const {Pool} = pg;

export type MiqoDatabase = NodePgDatabase<typeof schema>;

export function createPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("DATABASE_URL is required");
  return new Pool({connectionString});
}

export function createDatabase(pool: pg.Pool): MiqoDatabase {
  return drizzle(pool, {schema});
}
