import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

async function run() {
  try {
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMP;`);
    console.log("Migration: last_reminded_at OK");
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0;`);
    console.log("Migration: otp_attempts OK");
    await pool.query(`ALTER TABLE orders ALTER COLUMN otp_code TYPE TEXT;`);
    console.log("Migration: otp_code column widened to TEXT OK");
    console.log("All migrations complete.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}
run();
