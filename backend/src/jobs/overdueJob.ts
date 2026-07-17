import { getPool } from "../config/db.js";
import type { OrderRow } from "../models/orderModel.js";
import * as smsService from "../services/smsService.js";

/** Marks stored parcels older than 7 days as overdue, and triggers 2-day reminder SMS loop. */
export async function runOverdueJob(): Promise<number> {
  if (!process.env.DATABASE_URL) {
    return 0;
  }
  try {
    const pool = getPool();
    
    // 1. Mark orders older than 7 days as overdue
    await pool.query(
      `UPDATE orders
       SET status = 'overdue'
       WHERE status = 'stored'
         AND created_at < NOW() - INTERVAL '7 days'`,
    );

    const r = await pool.query<OrderRow>(
      `SELECT * FROM orders 
       WHERE status IN ('stored', 'overdue')
         AND COALESCE(last_reminded_at, created_at) < NOW() - INTERVAL '2 days'`
    );

    let sent = 0;
    for (const order of r.rows) {
      try {
        await smsService.sendReminderSms(String(order.phone_number), order.order_id, order.status === 'overdue');
        await pool.query(`UPDATE orders SET last_reminded_at = NOW() WHERE id = $1`, [order.id]);
        sent++;
      } catch (smsErr) {
        console.error(`[reminder failed] order ${order.order_id} -> ${order.phone_number}:`, smsErr);
        // Continue to the next order even if one fails
      }
    }

    return sent;
  } catch (e) {
    console.error("[overdue job]", e);
    return 0;
  }
}
