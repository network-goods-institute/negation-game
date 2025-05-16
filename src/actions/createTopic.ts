"use server";

import { db } from "@/services/db";
import { topicsTable } from "@/db/tables/topicsTable";

export async function createTopic(
  name: string,
  space: string,
  discourseUrl: string = ""
) {
  const [topic] = await db
    .insert(topicsTable)
    .values({ name, space, discourseUrl })
    .returning({
      id: topicsTable.id,
      name: topicsTable.name,
      discourseUrl: topicsTable.discourseUrl,
    });
  return topic;
}
