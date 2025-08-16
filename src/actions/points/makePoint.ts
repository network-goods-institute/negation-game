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
import { POINT_MIN_LENGTH, getPointMaxLength } from "@/constants/config";

export const makePoint = async ({
  content,
  cred = 0,
  isOption = false,
}: Pick<InsertPoint, "content"> &
  Pick<InsertEndorsement, "cred"> & { isOption?: boolean }): Promise<
  Point["id"]
> => {
  const userId = await getUserId();
  const space = await getSpace();

  if (!userId) {
    throw new Error("Must be authenticated to add a point");
  }

  const trimmedContent = content.trim();
  const maxLength = getPointMaxLength(isOption);

  if (
    trimmedContent.length < POINT_MIN_LENGTH ||
    trimmedContent.length > maxLength
  ) {
    throw new Error(
      `Point content must be between ${POINT_MIN_LENGTH} and ${maxLength} characters`
    );
  }

  const isCommand = trimmedContent.startsWith("/");

  return await db.transaction(async (tx) => {
    const newPointId = await tx
      .insert(pointsTable)
      .values({
        content: trimmedContent,
        createdBy: userId,
        space,
        isCommand,
        isOption,
      })
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

    waitUntil(addEmbedding({ content: trimmedContent, id: newPointId }));
    waitUntil(addKeywords({ content: trimmedContent, id: newPointId }));

    waitUntil(
      (async () => {
        try {
          const { buildPointCluster } = await import(
            "@/actions/points/buildPointCluster"
          );
          await buildPointCluster(newPointId);
        } catch (error) {
          console.error(
            `Failed to build cluster for point ${newPointId}:`,
            error
          );
        }
      })()
    );

    // If this is a command, execute it after the transaction
    if (isCommand) {
      waitUntil(
        (async () => {
          try {
            const result = await executeCommand(space, trimmedContent);

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
