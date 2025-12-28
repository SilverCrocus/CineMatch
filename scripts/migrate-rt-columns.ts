import { Pool } from "pg";

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("Adding RT columns to cached_movies table...");

    await pool.query(`
      ALTER TABLE cached_movies
      ADD COLUMN IF NOT EXISTS rt_audience_score VARCHAR(10),
      ADD COLUMN IF NOT EXISTS rt_url TEXT;
    `);

    console.log("Migration complete!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
