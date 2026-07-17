import pg from "pg";

const { Pool } = pg;

pg.types.setTypeParser(20, (val) => parseInt(val, 10));

let pool: pg.Pool | null = null;

/** Lazy pool so `/health` can run before DATABASE_URL is validated by route handlers. */
export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    const ssl = process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined;
    pool = new Pool({ connectionString, max: 10, ssl });
  }
  return pool;
}
