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
  viewpointsTable,
  topicsTable,
  definitionsTable,
  embeddingsTable,
  chatsTable,
  messagesTable,
  objectionsTable,
  doubtsTable,
  restakesTable,
  slashesTable,
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
type SelectViewpoint = typeof viewpointsTable.$inferSelect;
type InsertViewpoint = typeof viewpointsTable.$inferInsert;
type SelectTopic = typeof topicsTable.$inferSelect;
type InsertTopic = typeof topicsTable.$inferInsert;
type SelectDefinition = typeof definitionsTable.$inferSelect;
type InsertDefinition = typeof definitionsTable.$inferInsert;
type SelectEmbedding = typeof embeddingsTable.$inferSelect;
type InsertEmbedding = typeof embeddingsTable.$inferInsert;
type SelectChat = typeof chatsTable.$inferSelect;
type InsertChat = typeof chatsTable.$inferInsert;
type SelectMessage = typeof messagesTable.$inferSelect;
type InsertMessage = typeof messagesTable.$inferInsert;
type SelectObjection = typeof objectionsTable.$inferSelect;
type InsertObjection = typeof objectionsTable.$inferInsert;
type SelectDoubt = typeof doubtsTable.$inferSelect;
type InsertDoubt = typeof doubtsTable.$inferInsert;
type SelectRestake = typeof restakesTable.$inferSelect;
type InsertRestake = typeof restakesTable.$inferInsert;
type SelectSlash = typeof slashesTable.$inferSelect;
type InsertSlash = typeof slashesTable.$inferInsert;

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
      const originalTopics: SelectTopic[] = await tx.query.topicsTable.findMany(
        {
          where: eq(topicsTable.space, originalSpaceId),
        }
      );
      const originalViewpoints: SelectViewpoint[] =
        await tx.query.viewpointsTable.findMany({
          where: eq(viewpointsTable.space, originalSpaceId),
        });
      const originalDefinitions: SelectDefinition[] =
        await tx.query.definitionsTable.findMany({
          where: eq(definitionsTable.space, originalSpaceId),
        });
      const originalEmbeddings: SelectEmbedding[] =
        await tx.query.embeddingsTable.findMany({
          where: eq(embeddingsTable.space, originalSpaceId),
        });
      const originalChats: SelectChat[] = await tx.query.chatsTable.findMany({
        where: eq(chatsTable.spaceId, originalSpaceId),
      });
      const originalMessages: SelectMessage[] =
        await tx.query.messagesTable.findMany({
          where: eq(messagesTable.space, originalSpaceId),
        });
      const originalObjections: SelectObjection[] =
        await tx.query.objectionsTable.findMany({
          where: eq(objectionsTable.space, originalSpaceId),
        });
      const originalDoubts: SelectDoubt[] = await tx.query.doubtsTable.findMany(
        {
          where: eq(doubtsTable.space, originalSpaceId),
        }
      );
      const originalRestakes: SelectRestake[] =
        await tx.query.restakesTable.findMany({
          where: eq(restakesTable.space, originalSpaceId),
        });
      const originalSlashes: SelectSlash[] =
        await tx.query.slashesTable.findMany({
          where: eq(slashesTable.space, originalSpaceId),
        });

      log(
        `Fetched ${originalPoints.length} points, ${originalNegations.length} negations, ${originalEndorsements.length} endorsements, ${originalTopics.length} topics, ${originalViewpoints.length} viewpoints, ${originalDefinitions.length} definitions, ${originalEmbeddings.length} embeddings, ${originalChats.length} chats, ${originalMessages.length} messages, ${originalObjections.length} objections, ${originalDoubts.length} doubts, ${originalRestakes.length} restakes, ${originalSlashes.length} slashes.`
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

          // Enforce the olderPointFirst constraint: smaller ID must be olderPointId
          const actualOlderPointId = Math.min(newOlderPointId, newNewerPointId);
          const actualNewerPointId = Math.max(newOlderPointId, newNewerPointId);

          newNegationsData.push({
            olderPointId: actualOlderPointId,
            newerPointId: actualNewerPointId,
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

      // Initialize ID mappings
      const topicIdMap = new Map<number, number>();

      // Clone topics first (no dependencies)
      if (originalTopics.length > 0) {
        log("Duplicating topics...");
        const newTopicsData: Omit<InsertTopic, "id" | "createdAt">[] =
          originalTopics.map((t: SelectTopic) => ({
            name: t.name,
            space: newSpaceId,
            discourseUrl: t.discourseUrl,
          }));

        const insertedTopics = await tx
          .insert(topicsTable)
          .values(newTopicsData)
          .returning({
            oldId: topicsTable.id,
            newId: topicsTable.id,
          });

        // Create topic ID mapping
        originalTopics.forEach((ot: SelectTopic, index: number) => {
          topicIdMap.set(ot.id, insertedTopics[index].newId);
        });
        log(`Duplicated ${insertedTopics.length} topics.`);
      } else {
        log("No topics found in original space.");
      }

      // Clone definitions (no dependencies)
      if (originalDefinitions.length > 0) {
        log("Duplicating definitions...");
        const newDefinitionsData: InsertDefinition[] = originalDefinitions.map(
          (d: SelectDefinition) => ({
            term: d.term,
            definition: d.definition,
            space: newSpaceId,
          })
        );

        await tx.insert(definitionsTable).values(newDefinitionsData);
        log(`Duplicated ${newDefinitionsData.length} definitions.`);
      } else {
        log("No definitions found in original space.");
      }

      // Clone embeddings (references points)
      if (originalEmbeddings.length > 0) {
        log("Duplicating embeddings...");
        const newEmbeddingsData: InsertEmbedding[] = [];
        for (const e of originalEmbeddings) {
          const newPointId = pointIdMap.get(e.id);
          if (!newPointId) {
            logError(
              `Skipping embedding (Original Point ID: ${e.id}) due to missing point mapping.`
            );
            continue;
          }
          newEmbeddingsData.push({
            id: newPointId,
            embedding: e.embedding,
            space: newSpaceId,
          });
        }

        if (newEmbeddingsData.length > 0) {
          await tx.insert(embeddingsTable).values(newEmbeddingsData);
          log(`Duplicated ${newEmbeddingsData.length} embeddings.`);
        } else {
          log("No valid embeddings to duplicate after mapping check.");
        }
      } else {
        log("No embeddings found in original space.");
      }

      // Clone viewpoints (references topics and possibly other viewpoints)
      if (originalViewpoints.length > 0) {
        log("Duplicating viewpoints...");
        const viewpointIdMap = new Map<string, string>();
        const newViewpointsData: InsertViewpoint[] = [];

        for (const v of originalViewpoints) {
          const newViewpointId = `${newSpaceId}_${v.id.split("_").pop()}`; // Generate new ID
          viewpointIdMap.set(v.id, newViewpointId);

          // Update graph to reference new point IDs
          const updatedGraph = { ...v.graph };
          if (updatedGraph.nodes) {
            updatedGraph.nodes = updatedGraph.nodes.map((node: any) => {
              if (node.data && node.data.pointId) {
                const newPointId = pointIdMap.get(node.data.pointId);
                if (newPointId) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      pointId: newPointId,
                    },
                  };
                }
              }
              return node;
            });
          }

          newViewpointsData.push({
            id: newViewpointId,
            title: v.title,
            description: v.description,
            graph: updatedGraph,
            createdBy: targetUserId,
            space: newSpaceId,
            topicId: v.topicId ? topicIdMap.get(v.topicId) || null : null,
            copiedFromId: null, // Will handle self-references in a second pass
          });
        }

        if (newViewpointsData.length > 0) {
          await tx.insert(viewpointsTable).values(newViewpointsData);

          // Second pass: update copiedFromId references
          for (const v of originalViewpoints) {
            if (v.copiedFromId) {
              const newViewpointId = viewpointIdMap.get(v.id);
              const newCopiedFromId = viewpointIdMap.get(v.copiedFromId);
              if (newViewpointId && newCopiedFromId) {
                await tx
                  .update(viewpointsTable)
                  .set({ copiedFromId: newCopiedFromId })
                  .where(eq(viewpointsTable.id, newViewpointId));
              }
            }
          }

          log(`Duplicated ${newViewpointsData.length} viewpoints.`);
        }
      } else {
        log("No viewpoints found in original space.");
      }

      // Clone chats (references users)
      if (originalChats.length > 0) {
        log("Duplicating chats...");
        const newChatsData: InsertChat[] = originalChats.map(
          (c: SelectChat) => ({
            // Generate new chat ID to avoid conflicts
            userId: targetUserId, // Assign to target user
            spaceId: newSpaceId,
            title: c.title,
            messages: c.messages,
            state_hash: c.state_hash,
            is_deleted: c.is_deleted,
            deleted_at: c.deleted_at,
            is_shared: c.is_shared,
            share_id: c.share_id,
            graph: c.graph,
            distillRationaleId: c.distillRationaleId,
          })
        );

        await tx.insert(chatsTable).values(newChatsData);
        log(`Duplicated ${newChatsData.length} chats.`);
      } else {
        log("No chats found in original space.");
      }

      // Clone messages (references users and chats)
      if (originalMessages.length > 0) {
        log("Duplicating messages...");
        const newMessagesData = originalMessages.map((m: SelectMessage) => ({
          // Generate new message ID to avoid conflicts
          conversationId: m.conversationId,
          content: m.content,
          senderId: targetUserId, // Assign to target user
          recipientId: targetUserId, // Assign to target user
          space: newSpaceId,
          isRead: m.isRead,
          isDeleted: m.isDeleted,
          isEdited: m.isEdited,
          editedAt: m.editedAt,
          readAt: m.readAt,
        }));

        await tx.insert(messagesTable).values(newMessagesData);
        log(`Duplicated ${newMessagesData.length} messages.`);
      } else {
        log("No messages found in original space.");
      }

      // Clone objections (references points, negations, endorsements)
      if (originalObjections.length > 0) {
        log("Duplicating objections...");
        const newObjectionsData = [];
        for (const o of originalObjections) {
          const newObjectionPointId = pointIdMap.get(o.objectionPointId);
          const newTargetPointId = pointIdMap.get(o.targetPointId);
          const newContextPointId = pointIdMap.get(o.contextPointId);

          if (!newObjectionPointId || !newTargetPointId || !newContextPointId) {
            logError(`Skipping objection due to missing point mapping.`);
            continue;
          }

          newObjectionsData.push({
            objectionPointId: newObjectionPointId,
            targetPointId: newTargetPointId,
            contextPointId: newContextPointId,
            parentEdgeId: o.parentEdgeId, // This might need mapping too, but keeping for now
            endorsementId: o.endorsementId, // This might need mapping too, but keeping for now
            createdBy: targetUserId,
            space: newSpaceId,
          });
        }

        if (newObjectionsData.length > 0) {
          await tx.insert(objectionsTable).values(newObjectionsData);
          log(`Duplicated ${newObjectionsData.length} objections.`);
        } else {
          log("No valid objections to duplicate after mapping check.");
        }
      } else {
        log("No objections found in original space.");
      }

      // Clone epistemic system: restakes, doubts, slashes
      const restakeIdMap = new Map<number, number>();

      if (originalRestakes.length > 0) {
        log("Duplicating restakes...");
        const restakeAggregates = new Map<
          string,
          {
            userId: string;
            pointId: number;
            negationId: number;
            amount: number;
            space: string;
          }
        >();

        for (const r of originalRestakes) {
          const newPointId = pointIdMap.get(r.pointId);
          const newNegationId = pointIdMap.get(r.negationId);

          if (!newPointId || !newNegationId) {
            logError(`Skipping restake due to missing point mapping.`);
            continue;
          }

          const key = `${targetUserId}-${newPointId}-${newNegationId}`;
          const existing = restakeAggregates.get(key);

          if (existing) {
            existing.amount += r.amount;
          } else {
            restakeAggregates.set(key, {
              userId: targetUserId,
              pointId: newPointId,
              negationId: newNegationId,
              amount: r.amount,
              space: newSpaceId,
            });
          }
        }

        const newRestakesData = Array.from(restakeAggregates.values());

        if (newRestakesData.length > 0) {
          const insertedRestakes = await tx
            .insert(restakesTable)
            .values(newRestakesData)
            .returning({
              newId: restakesTable.id,
            });

          // Create restake ID mapping (simplified since we're aggregating)
          insertedRestakes.forEach((inserted, index) => {
            restakeIdMap.set(index + 1, inserted.newId); // Simple mapping for aggregated restakes
          });

          log(`Duplicated ${insertedRestakes.length} aggregated restakes.`);
        } else {
          log("No valid restakes to duplicate after mapping check.");
        }
      } else {
        log("No restakes found in original space.");
      }

      if (originalDoubts.length > 0) {
        log("Duplicating doubts...");
        const doubtAggregates = new Map<
          string,
          {
            userId: string;
            pointId: number;
            negationId: number;
            amount: number;
            space: string;
          }
        >();

        for (const d of originalDoubts) {
          const newPointId = pointIdMap.get(d.pointId);
          const newNegationId = pointIdMap.get(d.negationId);

          if (!newPointId || !newNegationId) {
            logError(`Skipping doubt due to missing point mapping.`);
            continue;
          }

          const key = `${targetUserId}-${newPointId}-${newNegationId}`;
          const existing = doubtAggregates.get(key);

          if (existing) {
            existing.amount += d.amount;
          } else {
            doubtAggregates.set(key, {
              userId: targetUserId,
              pointId: newPointId,
              negationId: newNegationId,
              amount: d.amount,
              space: newSpaceId,
            });
          }
        }

        const newDoubtsData = Array.from(doubtAggregates.values());

        if (newDoubtsData.length > 0) {
          await tx.insert(doubtsTable).values(newDoubtsData);
          log(`Duplicated ${newDoubtsData.length} aggregated doubts.`);
        } else {
          log("No valid doubts to duplicate after mapping check.");
        }
      } else {
        log("No doubts found in original space.");
      }

      if (originalSlashes.length > 0) {
        log("Duplicating slashes...");
        const slashAggregates = new Map<
          string,
          {
            userId: string;
            restakeId: number;
            pointId: number;
            negationId: number;
            amount: number;
            space: string;
          }
        >();

        for (const s of originalSlashes) {
          // For slashes, we'll just use the first restake ID from our mapping since we aggregated restakes
          const firstRestakeId = Array.from(restakeIdMap.values())[0];
          const newPointId = pointIdMap.get(s.pointId);
          const newNegationId = pointIdMap.get(s.negationId);

          if (!firstRestakeId || !newPointId || !newNegationId) {
            logError(`Skipping slash due to missing mapping.`);
            continue;
          }

          const key = `${targetUserId}-${firstRestakeId}`;
          const existing = slashAggregates.get(key);

          if (existing) {
            existing.amount += s.amount;
          } else {
            slashAggregates.set(key, {
              userId: targetUserId,
              restakeId: firstRestakeId,
              pointId: newPointId,
              negationId: newNegationId,
              amount: s.amount,
              space: newSpaceId,
            });
          }
        }

        const newSlashesData = Array.from(slashAggregates.values());

        if (newSlashesData.length > 0) {
          await tx.insert(slashesTable).values(newSlashesData);
          log(`Duplicated ${newSlashesData.length} aggregated slashes.`);
        } else {
          log("No valid slashes to duplicate after mapping check.");
        }
      } else {
        log("No slashes found in original space.");
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
