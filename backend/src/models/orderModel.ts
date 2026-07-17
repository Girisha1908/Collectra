import { getPool } from "../config/db.js";

export type OrderRow = {
  id: number;
  order_id: string;
  receiver_name: string;
  phone_number: number;
  description: string | null;
  location: string | null;
  rack_number: string | null;
  status: string;
  qr_code_base64: string | null;
  otp_code: string | null;
  otp_expires_at: Date | null;
  otp_verified: boolean;
  otp_attempts: number;
  created_at: Date;
  collected_at: Date | null;
  last_reminded_at: Date | null;
  created_by: number | null;
};

export type NewOrderInput = {
  order_id: string;
  receiver_name: string;
  phone_number: number;
  description?: string | null;
  location?: string | null;
  rack_number?: string | null;
  qr_code_base64?: string | null;
  created_by: number;
};

const orderSelect = `id, order_id, receiver_name, phone_number, description, location, rack_number,
            status, qr_code_base64, otp_code, otp_expires_at, otp_verified, otp_attempts,
            created_at, collected_at, last_reminded_at, created_by`;

export async function listOrders(limit = 200, offset = 0): Promise<OrderRow[]> {
  const pool = getPool();
  const r = await pool.query<OrderRow>(
    `SELECT ${orderSelect}
     FROM orders
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  return r.rows;
}

export async function findByPublicOrderId(orderId: string): Promise<OrderRow | null> {
  const pool = getPool();
  const r = await pool.query<OrderRow>(`SELECT * FROM orders WHERE order_id = $1`, [orderId]);
  return r.rows[0] ?? null;
}

export async function insertOrder(input: NewOrderInput): Promise<OrderRow> {
  const pool = getPool();
  const r = await pool.query<OrderRow>(
    `INSERT INTO orders (
       order_id, receiver_name, phone_number, description, location, rack_number,
       qr_code_base64, created_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.order_id,
      input.receiver_name,
      input.phone_number,
      input.description ?? null,
      input.location ?? null,
      input.rack_number ?? null,
      input.qr_code_base64 ?? null,
      input.created_by,
    ],
  );
  return r.rows[0]!;
}

export async function setOtpForOrder(
  orderId: string,
  code: string,
  expiresAt: Date,
): Promise<OrderRow | null> {
  const pool = getPool();
  const r = await pool.query<OrderRow>(
    `UPDATE orders
     SET otp_code = $1, otp_expires_at = $2, otp_verified = false, otp_attempts = 0
     WHERE order_id = $3
     RETURNING *`,
    [code, expiresAt, orderId],
  );
  return r.rows[0] ?? null;
}

export async function setOtpVerified(orderId: string): Promise<OrderRow | null> {
  const pool = getPool();
  const r = await pool.query<OrderRow>(
    `UPDATE orders SET otp_verified = true WHERE order_id = $1 RETURNING *`,
    [orderId],
  );
  return r.rows[0] ?? null;
}

export async function collectOrder(orderId: string): Promise<OrderRow | null> {
  const pool = getPool();
  const r = await pool.query<OrderRow>(
    `UPDATE orders
     SET status = 'collected', collected_at = NOW()
     WHERE order_id = $1
       AND otp_verified = true
       AND status IN ('stored', 'overdue')
     RETURNING *`,
    [orderId],
  );
  return r.rows[0] ?? null;
}

export async function deleteOrder(orderId: string): Promise<boolean> {
  const pool = getPool();
  const r = await pool.query(`DELETE FROM orders WHERE order_id = $1`, [orderId]);
  return (r.rowCount ?? 0) > 0;
}

export async function updateOrderRack(orderId: string, rack: string): Promise<OrderRow | null> {
  const pool = getPool();
  const r = await pool.query<OrderRow>(`UPDATE orders SET rack_number = $1 WHERE order_id = $2 RETURNING *`, [rack, orderId]);
  return r.rows[0] ?? null;
}

export async function updateLastReminded(orderId: string): Promise<void> {
  const pool = getPool();
  await pool.query(`UPDATE orders SET last_reminded_at = NOW() WHERE order_id = $1`, [orderId]);
}

export async function incrementOtpAttempts(orderId: string): Promise<number> {
  const pool = getPool();
  const r = await pool.query<{ otp_attempts: number }>(
    `UPDATE orders SET otp_attempts = otp_attempts + 1 WHERE order_id = $1 RETURNING otp_attempts`,
    [orderId],
  );
  return r.rows[0]?.otp_attempts ?? 999;
}

export async function getNextOrderId(): Promise<string> {
  const pool = getPool();
  const r = await pool.query<{ order_id: string }>(
    `SELECT order_id FROM orders 
     WHERE order_id ~ '^ORD\\d+$' 
     ORDER BY order_id DESC 
     LIMIT 1`
  );
  if (r.rows.length === 0) {
    return "ORD000001";
  }
  const lastId = r.rows[0].order_id;
  const numPart = lastId.substring(3);
  const nextNum = parseInt(numPart, 10) + 1;
  return `ORD${String(nextNum).padStart(6, "0")}`;
}

