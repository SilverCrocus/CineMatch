import { Pool } from "pg";

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("Adding tmdb_rating column to cached_movies table...");

    await pool.query(`
      ALTER TABLE cached_movies
      ADD COLUMN IF NOT EXISTS tmdb_rating NUMERIC(3,1);
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
