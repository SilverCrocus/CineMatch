/**
 * Seed script for E2E test users.
 *
 * Run with: npx tsx scripts/seed-test-users.ts
 *
 * This creates permanent test accounts used by Playwright tests.
 * Safe to run multiple times (uses upsert).
 */

import { Pool } from "pg";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const TEST_USERS = [
  {
    email: "test-host@cinematch.test",
    name: "Test Host",
    image: null,
  },
  {
    email: "test-guest1@cinematch.test",
    name: "Test Guest 1",
    image: null,
  },
  {
    email: "test-guest2@cinematch.test",
    name: "Test Guest 2",
    image: null,
  },
];

async function seedTestUsers() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL environment variable not set.");
    console.error("Make sure you have a .env.local or .env file with DATABASE_URL.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  console.log("Connecting to database...");

  try {
    const client = await pool.connect();
    console.log("Connected successfully.\n");

    console.log("Seeding test users:");
    console.log("─".repeat(50));

    for (const user of TEST_USERS) {
      const result = await client.query(
        `INSERT INTO users (email, name, image)
         VALUES ($1, $2, $3)
         ON CONFLICT (email)
         DO UPDATE SET name = $2, image = $3
         RETURNING id, email, name`,
        [user.email, user.name, user.image]
      );

      const seededUser = result.rows[0];
      console.log(`✓ ${seededUser.name}`);
      console.log(`  Email: ${seededUser.email}`);
      console.log(`  ID:    ${seededUser.id}`);
      console.log();
    }

    console.log("─".repeat(50));
    console.log("✅ Test users seeded successfully!\n");
    console.log("You can now run E2E tests with:");
    console.log("  npm run test:e2e:headed\n");

    client.release();
  } catch (error) {
    console.error("Error seeding test users:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedTestUsers();
