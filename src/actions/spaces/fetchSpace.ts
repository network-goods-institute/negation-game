"use server";

import { spacesTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq } from "drizzle-orm";
import { withRetry, isStatementTimeoutError } from "@/lib/db/withRetry";

export const fetchSpace = async (slug: string) => {
  return withRetry(
    async () =>
      db
        .select()
        .from(spacesTable)
        .where(eq(spacesTable.id, slug.toLowerCase()))
        .limit(1)
        .then((rows) => (rows.length === 1 ? rows[0] : null)),
    {
      retries: 2,
      baseDelayMs: 300,
      shouldRetry: isStatementTimeoutError,
    }
  );
};
