import { sql, SQL } from "drizzle-orm";
import { AnyPgColumn } from "drizzle-orm/pg-core";

export const lower = (column: AnyPgColumn): SQL => sql`lower(${column})`;
