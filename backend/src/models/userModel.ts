import { getPool } from "../config/db.js";

export type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  role: string;
};

export async function findUserByUsername(username: string): Promise<UserRow | null> {
  const pool = getPool();
  const r = await pool.query<UserRow>(
    `SELECT id, username, password_hash, role FROM users WHERE username = $1`,
    [username],
  );
  return r.rows[0] ?? null;
}

export async function createUser(
  username: string,
  passwordHash: string,
  role = "security",
): Promise<Pick<UserRow, "id" | "username" | "role">> {
  const pool = getPool();
  const r = await pool.query<{ id: number; username: string; role: string }>(
    `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)
     RETURNING id, username, role`,
    [username, passwordHash, role],
  );
  return r.rows[0]!;
}
