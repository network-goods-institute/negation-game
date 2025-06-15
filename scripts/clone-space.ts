// usage
// pnpm clone-space <originalSpaceId> <targetUserId>

import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import {
  spacesTable,
  usersTable,
  pointsTable,
  negationsTable,
  endorsementsTable,
} from "@/db/schema";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { exit } from "process";

if (!process.env.POSTGRES_URL) {
  console.error(
    "[CloneScript ERROR] POSTGRES_URL is not defined in environment."
  );
  exit(1);
}
const localClient = postgres(process.env.POSTGRES_URL, {
  prepare: false,
});
const db = drizzle(localClient, { schema });

type SelectPoint = typeof pointsTable.$inferSelect;
type InsertPoint = typeof pointsTable.$inferInsert;
type SelectNegation = typeof negationsTable.$inferSelect;
type InsertNegation = typeof negationsTable.$inferInsert;
type SelectEndorsement = typeof endorsementsTable.$inferSelect;
type InsertEndorsement = typeof endorsementsTable.$inferInsert;

const log = (...args: any[]) => console.log("[CloneScript]", ...args);
const logError = (...args: any[]) =>
  console.error("[CloneScript ERROR]", ...args);

async function cloneSpace() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    logError("Usage: pnpm clone-space <originalSpaceId> <targetUserId>");
    exit(1);
  }

  const originalSpaceId = args[0];
  const targetUserId = args[1];
  const newSpaceId = `${originalSpaceId}_test`;

  log(
    `Attempting to clone space "${originalSpaceId}" to "${newSpaceId}" with owner "${targetUserId}"`
  );

  try {
    await db.transaction(async (tx) => {
      log("Running pre-flight checks...");

      const originalSpace = await tx.query.spacesTable.findFirst({
        where: eq(spacesTable.id, originalSpaceId),
      });
      if (!originalSpace) {
        throw new Error(`Original space "${originalSpaceId}" not found.`);
      }
      log(`Original space "${originalSpaceId}" found.`);

      const existingTestSpace = await tx.query.spacesTable.findFirst({
        where: eq(spacesTable.id, newSpaceId),
      });
      if (existingTestSpace) {
        throw new Error(
          `Target space "${newSpaceId}" already exists. Please delete it first.`
        );
      }
      log(`Target space "${newSpaceId}" does not exist. Proceeding.`);

      const targetUser = await tx.query.usersTable.findFirst({
        where: eq(usersTable.id, targetUserId),
      });
      if (!targetUser) {
        throw new Error(`Target user "${targetUserId}" not found.`);
      }
      log(`Target user "${targetUserId}" found.`);

      log(`Creating target space "${newSpaceId}"...`);
      await tx.insert(spacesTable).values({
        id: newSpaceId,
        icon: originalSpace.icon,
        pinnedPointId: null,
      });
      log(`Target space "${newSpaceId}" created.`);

      log(`Fetching data from original space "${originalSpaceId}"...`);
      const originalPoints: SelectPoint[] = await tx.query.pointsTable.findMany(
        {
          where: eq(pointsTable.space, originalSpaceId),
        }
      );
      const originalNegations: SelectNegation[] =
        await tx.query.negationsTable.findMany({
          where: eq(negationsTable.space, originalSpaceId),
        });
      const originalEndorsements: SelectEndorsement[] =
        await tx.query.endorsementsTable.findMany({
          where: eq(endorsementsTable.space, originalSpaceId),
        });
      log(
        `Fetched ${originalPoints.length} points, ${originalNegations.length} negations, ${originalEndorsements.length} endorsements.`
      );

      if (originalPoints.length === 0) {
        log("Original space has no points. Skipping duplication steps.");
        return;
      }

      log("Duplicating points and creating ID map...");
      const pointIdMap = new Map<number, number>();
      const newPointsData: Omit<InsertPoint, "id" | "createdAt">[] =
        originalPoints.map((p: SelectPoint) => ({
          content: p.content,
          createdBy: targetUserId,
          keywords: p.keywords,
          space: newSpaceId,
          isCommand: p.isCommand,
        }));

      const insertedPoints = await tx
        .insert(pointsTable)
        .values(newPointsData)
        .returning({
          newId: pointsTable.id,
        });

      if (insertedPoints.length !== originalPoints.length) {
        throw new Error(
          "Mismatch between original points and inserted points count during mapping."
        );
      }
      originalPoints.forEach((op: SelectPoint, index: number) => {
        pointIdMap.set(op.id, insertedPoints[index].newId);
      });
      log(`Duplicated ${insertedPoints.length} points. ID map created.`);

      if (originalNegations.length > 0) {
        log("Duplicating negations...");
        const newNegationsData: Omit<InsertNegation, "id" | "createdAt">[] = [];
        for (const n of originalNegations) {
          const newOlderPointId = pointIdMap.get(n.olderPointId as number);
          const newNewerPointId = pointIdMap.get(n.newerPointId as number);

          if (!newOlderPointId || !newNewerPointId) {
            logError(
              `Skipping negation (Original Older: ${n.olderPointId}, Newer: ${n.newerPointId}) due to missing point mapping.`
            );
            continue;
          }

          newNegationsData.push({
            olderPointId: newOlderPointId,
            newerPointId: newNewerPointId,
            createdBy: targetUserId,
            space: newSpaceId,
          });
        }

        if (newNegationsData.length > 0) {
          await tx.insert(negationsTable).values(newNegationsData);
          log(`Duplicated ${newNegationsData.length} negations.`);
        } else {
          log("No valid negations to duplicate after mapping check.");
        }
      } else {
        log("No negations found in original space.");
      }

      if (originalEndorsements.length > 0) {
        log("Duplicating endorsements...");
        const newEndorsementsData: Omit<
          InsertEndorsement,
          "id" | "createdAt"
        >[] = [];
        for (const e of originalEndorsements) {
          const newPointId = pointIdMap.get(e.pointId);
          if (!newPointId) {
            logError(
              `Skipping endorsement (Original Point ID: ${e.pointId}) due to missing point mapping.`
            );
            continue;
          }
          newEndorsementsData.push({
            cred: e.cred,
            pointId: newPointId,
            userId: targetUserId,
            space: newSpaceId,
          });
        }

        if (newEndorsementsData.length > 0) {
          await tx.insert(endorsementsTable).values(newEndorsementsData);
          log(`Duplicated ${newEndorsementsData.length} endorsements.`);
        } else {
          log("No valid endorsements to duplicate after mapping check.");
        }
      } else {
        log("No endorsements found in original space.");
      }

      log("Transaction committed successfully.");
    });

    log(
      `\n✅ SUCCESS: Space "${originalSpaceId}" cloned to "${newSpaceId}" with content owned by "${targetUserId}".`
    );
  } catch (error) {
    logError("Cloning failed:", error);
    exit(1);
  } finally {
    log("Closing database connection...");
    await localClient.end();
    log("Database connection closed.");
  }
}

cloneSpace();
