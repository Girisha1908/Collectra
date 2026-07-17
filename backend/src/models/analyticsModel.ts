import { getPool } from "../config/db.js";

export type StatusCount = { status: string; count: number };

export type OrdersPerDay = { day: string; count: number };

/** Aggregates for dashboard / Recharts-style charts */
export async function getStatusCounts(): Promise<StatusCount[]> {
  const pool = getPool();
  const r = await pool.query<{ status: string; count: number }>(
    `SELECT status::text AS status, COUNT(*)::int AS count FROM orders GROUP BY status`,
  );
  return r.rows;
}

export async function getOrdersCreatedPerDay(days = 30): Promise<OrdersPerDay[]> {
  const pool = getPool();
  const r = await pool.query<{ day: string; count: number }>(
    `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
     FROM orders
     WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
     GROUP BY 1
     ORDER BY 1 ASC`,
    [days],
  );
  return r.rows;
}

export async function getOrdersCollectedPerDay(days = 30): Promise<OrdersPerDay[]> {
  const pool = getPool();
  const r = await pool.query<{ day: string; count: number }>(
    `SELECT to_char(date_trunc('day', collected_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
     FROM orders
     WHERE collected_at IS NOT NULL
       AND collected_at >= NOW() - ($1::int * INTERVAL '1 day')
     GROUP BY 1
     ORDER BY 1 ASC`,
    [days],
  );
  return r.rows;
}

/** AVG(collected_at - created_at) in seconds for collected orders */
export async function getAvgReleaseSeconds(): Promise<number | null> {
  const pool = getPool();
  const r = await pool.query<{ avg: string | null }>(
    `SELECT EXTRACT(EPOCH FROM AVG(collected_at - created_at)) AS avg
     FROM orders
     WHERE collected_at IS NOT NULL`,
  );
  const v = r.rows[0]?.avg;
  if (v == null || v === "") return null;
  return Number(v);
}
