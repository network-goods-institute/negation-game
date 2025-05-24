"use server";

import { spacesTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq } from "drizzle-orm";

export const fetchSpace = async (slug: string) => {
  return await db
    .select()
    .from(spacesTable)
    .where(eq(spacesTable.id, slug.toLowerCase()))
    .limit(1)
    .then((result) => (result.length === 1 ? result[0] : null));
};
