"use server";

import { getUserId } from "@/actions/users/getUserId";
import { endorsementsTable, pointsTable, usersTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq, sql } from "drizzle-orm";

import { addEmbedding } from "@/actions/ai/addEmbedding";
import { addKeywords } from "@/actions/ai/addKeywords";
import { getSpace } from "@/actions/spaces/getSpace";
import { InsertEndorsement } from "@/db/tables/endorsementsTable";
import { InsertPoint, Point } from "@/db/tables/pointsTable";
import { waitUntil } from "@vercel/functions";
import { executeCommand } from "@/actions/feed/handleCommand";
import { revalidatePath } from "next/cache";

export const makePoint = async ({
  content,
  cred = 0,
}: Pick<InsertPoint, "content"> & Pick<InsertEndorsement, "cred">): Promise<
  Point["id"]
> => {
  const userId = await getUserId();
  const space = await getSpace();

  if (!userId) {
    throw new Error("Must be authenticated to add a point");
  }

  // Check if this is a command
  const isCommand = content.trim().startsWith("/");

  return await db.transaction(async (tx) => {
    const newPointId = await tx
      .insert(pointsTable)
      .values({ content, createdBy: userId, space, isCommand })
      .returning({ id: pointsTable.id })
      .then(([{ id }]) => id);

    if (cred > 0) {
      await tx
        .update(usersTable)
        .set({
          cred: sql`${usersTable.cred} - ${cred}`,
        })
        .where(eq(usersTable.id, userId));

      await tx.insert(endorsementsTable).values({
        cred,
        pointId: newPointId,
        userId,
        space,
      });
    }

    waitUntil(addEmbedding({ content, id: newPointId }));
    waitUntil(addKeywords({ content, id: newPointId }));

    // If this is a command, execute it after the transaction
    if (isCommand) {
      waitUntil(
        (async () => {
          try {
            const result = await executeCommand(space, content);

            if (result.success) {
              revalidatePath(`/s/${space}`);
            }
          } catch (error) {
            console.error(`Error executing command: ${error}`);
          }
        })()
      );
    }

    return newPointId;
  });
};
