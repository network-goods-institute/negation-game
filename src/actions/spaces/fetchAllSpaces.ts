"use server";

import { spacesTable } from "@/db/schema";
import { db } from "@/services/db";

export const fetchAllSpaces = async () => {
  return await db.select({ id: spacesTable.id }).from(spacesTable);
};
