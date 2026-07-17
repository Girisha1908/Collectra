import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function list() {
  const r = await pool.query("SELECT order_id, qr_code_base64 FROM orders LIMIT 5");
  console.log(JSON.stringify(r.rows, null, 2));
  await pool.end();
}
list();
