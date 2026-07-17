import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Set DATABASE_URL in .env");
    process.exit(1);
  }

  const patchesDir = path.join(__dirname, "..", "db", "patches");
  const files = fs.readdirSync(patchesDir).filter((f) => f.endsWith(".sql")).sort();

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    for (const file of files) {
      const patchPath = path.join(patchesDir, file);
      const sql = fs.readFileSync(patchPath, "utf8");
      await client.query(sql);
      console.log("Patch applied:", file);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
