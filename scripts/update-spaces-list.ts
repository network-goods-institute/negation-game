/**
 * This script fetches all spaces from the database and updates
 * the static spaces list used by the middleware.
 *
 * Run this script whenever spaces are added or removed from the database:
 * pnpm tsx scripts/update-spaces-list.ts
 */

import fs from "fs";
import path from "path";
import { config } from "dotenv";
import postgres from "postgres";

// Load environment variables from .env.local
config({ path: ".env.local" });

async function updateSpacesList() {
  let sql: ReturnType<typeof postgres> | null = null;

  try {
    console.log("Connecting to database...");

    // Create a new connection using the connection string from .env.local
    if (!process.env.POSTGRES_URL) {
      throw new Error("POSTGRES_URL environment variable is not defined");
    }

    sql = postgres(process.env.POSTGRES_URL, { prepare: false });
    console.log("Connected to database");

    console.log("Fetching spaces from database...");
    // Fetch all spaces from the database using the correct column names
    const spaces = await sql`SELECT space_id FROM spaces`;
    console.log(`Found ${spaces.length} spaces`);

    // Extract space IDs and convert to lowercase
    const spaceIds = spaces.map((space) =>
      (space.space_id as string).toLowerCase()
    );

    // Always include "global" as a valid space
    if (!spaceIds.includes("global")) {
      spaceIds.push("global");
      console.log('Added "global" space to the list');
    }

    // Create the content for the static spaces list file
    const fileContent = `/**
 * Static list of space IDs for middleware
 * 
 * This list is used by the middleware to validate subdomains without
 * requiring database access, which isn't supported in Edge Runtime.
 * 
 * UPDATE THIS LIST when new spaces are added or removed.
 * Run: pnpm tsx scripts/update-spaces-list.ts
 * 
 * For subdomain redirects to function properly, all valid spaces 
 * must be listed here.
 * 
 * Last updated: ${new Date().toISOString()}
 */
export const VALID_SPACE_IDS = new Set([
  ${spaceIds.map((id) => `"${id}"`).join(",\n  ")}
]);
`;

    // Write to the file
    const filePath = path.join(
      __dirname,
      "../src/lib/negation-game/staticSpacesList.ts"
    );
    fs.writeFileSync(filePath, fileContent);

    console.log(`✅ Updated static spaces list with ${spaceIds.length} spaces`);
    console.log(`File: ${filePath}`);
  } catch (error) {
    console.error("❌ Error updating spaces list:", error);
    process.exit(1);
  } finally {
    // Close the database connection if it was opened
    if (sql) {
      console.log("Closing database connection...");
      await sql.end();
      console.log("Database connection closed");
    }

    process.exit(0);
  }
}

updateSpacesList();
