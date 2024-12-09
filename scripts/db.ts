import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables first
config({ path: resolve(process.cwd(), '.env.local') });

const client = postgres(process.env.POSTGRES_URL!, {
  prepare: false,
});

export const db = drizzle(client, { schema }); 