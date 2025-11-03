import { createNotification } from "@/actions/notifications/createNotification";
import { generateNotificationSummary } from "@/actions/ai/generateNotificationSummary";
import { db } from "@/services/db";
import { pointsTable, viewpointsTable, usersTable } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import type { PointSnapshot } from "@/actions/points/fetchPointSnapshots";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { PointNodeData } from "@/components/graph/nodes/PointNode";
import { isFeatureEnabled } from "@/lib/featureFlags";import { logger } from "@/lib/logger";

interface EndorsementNotificationData {
  type: "endorsement";
  pointId: number;
  endorserId: string;
  credAmount: number;
  space: string;
  pointSnapshot?: PointSnapshot | null;
}

interface NegationNotificationData {
  type: "negation";
  negatedPointId: number;
  counterpointId: number;
  negatorId: string;
  credAmount: number;
  space: string;
  negatedPointSnapshot?: PointSnapshot | null;
  counterpointSnapshot?: PointSnapshot | null;
}

interface RationaleMentionNotificationData {
  type: "rationale_mention";
  rationaleId: string;
  graph: ViewpointGraph;
  authorId: string;
  space: string;
  pointSnapshots?: PointSnapshot[] | null;
  rationaleTitle?: string | null;
  rationaleDescription?: string | null;
}

interface RestakeNotificationData {
  type: "restake";
  negatedPointId: number;
  restakerId: string;
  amount: number;
  space: string;
  pointSnapshot?: PointSnapshot | null;
}

interface SlashNotificationData {
  type: "slash";
  negatedPointId: number;
  slasherId: string;
  amount: number;
  space: string;
  pointSnapshot?: PointSnapshot | null;
}

interface DoubtNotificationData {
  type: "doubt";
  negatedPointId: number;
  doubterId: string;
  amount: number;
  space: string;
  pointSnapshot?: PointSnapshot | null;
}

interface DoubtReductionNotificationData {
  type: "doubt_reduction";
  negatedPointId: number;
  slasherId: string;
  doubterId: string;
  reductionAmount: number;
  newDoubtAmount: number;
  space: string;
  pointSnapshot?: PointSnapshot | null;
}

type NotificationData =
  | EndorsementNotificationData
  | NegationNotificationData
  | RationaleMentionNotificationData
  | RestakeNotificationData
  | SlashNotificationData
  | DoubtNotificationData
  | DoubtReductionNotificationData;

const isCompletePointSnapshot = (
  snapshot?: PointSnapshot | null
): snapshot is PointSnapshot => {
  if (!snapshot) {
    return false;
  }

  const { id, createdBy, content, space, createdAt } = snapshot;

  return (
    typeof id === "number" &&
    typeof createdBy === "string" &&
    typeof content === "string" &&
    typeof space === "string" &&
    createdAt !== undefined &&
    "authorUsername" in snapshot
  );
};

class NotificationQueue {
  private queue: NotificationData[] = [];
  private processing = false;
  private pointCache = new Map<number, PointSnapshot>();
  private rationaleCache = new Map<
    string,
    { title: string; description: string | null }
  >();

  private async resolvePointSnapshot(
    pointId: number,
    fallback?: PointSnapshot | null
  ): Promise<PointSnapshot | null> {
    if (isCompletePointSnapshot(fallback)) {
      this.pointCache.set(pointId, fallback);
      return fallback;
    }

    const cached = this.pointCache.get(pointId);
    if (cached) {
      return cached;
    }

    const result = await db
      .select({
        id: pointsTable.id,
        createdBy: pointsTable.createdBy,
        content: pointsTable.content,
        space: pointsTable.space,
        createdAt: pointsTable.createdAt,
        authorUsername: usersTable.username,
      })
      .from(pointsTable)
      .innerJoin(usersTable, eq(usersTable.id, pointsTable.createdBy))
      .where(and(eq(pointsTable.id, pointId), eq(pointsTable.isActive, true)))
      .limit(1);

    if (!result[0]) {
      return null;
    }

    this.pointCache.set(pointId, result[0]);
    return result[0];
  }

  private async collectPointSnapshots(
    pointIds: number[],
    provided?: Map<number, PointSnapshot | null>
  ): Promise<Map<number, PointSnapshot>> {
    const snapshots = new Map<number, PointSnapshot>();
    const missing: number[] = [];

    for (const id of pointIds) {
      const providedSnapshot = provided?.get(id);
      if (isCompletePointSnapshot(providedSnapshot)) {
        snapshots.set(id, providedSnapshot);
        this.pointCache.set(id, providedSnapshot);
        continue;
      }

      const cached = this.pointCache.get(id);
      if (cached) {
        snapshots.set(id, cached);
        continue;
      }

      missing.push(id);
    }

    if (missing.length > 0) {
      const rows = await db
        .select({
          id: pointsTable.id,
          createdBy: pointsTable.createdBy,
          content: pointsTable.content,
          space: pointsTable.space,
          createdAt: pointsTable.createdAt,
          authorUsername: usersTable.username,
        })
        .from(pointsTable)
        .innerJoin(usersTable, eq(usersTable.id, pointsTable.createdBy))
        .where(
          and(inArray(pointsTable.id, missing), eq(pointsTable.isActive, true))
        );

      rows.forEach((row) => {
        this.pointCache.set(row.id, row);
        snapshots.set(row.id, row);
      });
    }

    return snapshots;
  }

  private async resolveRationaleSnapshot(
    rationaleId: string,
    fallback?: { title?: string | null; description?: string | null }
  ): Promise<{ title: string; description: string | null } | null> {
    if (fallback && fallback.title) {
      const resolved = {
        title: fallback.title,
        description: fallback.description ?? null,
      } as { title: string; description: string | null };
      this.rationaleCache.set(rationaleId, resolved);
      return resolved;
    }

    const cached = this.rationaleCache.get(rationaleId);
    if (cached) {
      return cached;
    }

    const result = await db
      .select({
        title: viewpointsTable.title,
        description: viewpointsTable.description,
      })
      .from(viewpointsTable)
      .where(eq(viewpointsTable.id, rationaleId))
      .limit(1);

    if (!result[0]) {
      return null;
    }

    this.rationaleCache.set(rationaleId, result[0]);
    return result[0];
  }

  async queueNotification(data: NotificationData) {
    if (!isFeatureEnabled("notifications")) {
      return;
    }

    this.queue.push(data);
    if (!this.processing) {
      setImmediate(() => {
        this.processQueue().catch((error) => {
          logger.error("Background notification processing failed:", error);
          this.processing = false;
        });
      });
    }
  }

  private async processQueue() {
    this.processing = true;

    while (this.queue.length > 0) {
      const notification = this.queue.shift()!;

      try {
        await this.processNotification(notification);
      } catch (error) {
        logger.error("Failed to process notification:", error);
        // Could implement retry logic here
      }
    }

    this.processing = false;
  }

  private async processNotification(data: NotificationData) {
    switch (data.type) {
      case "endorsement":
        await this.processEndorsement(data);
        break;
      case "negation":
        await this.processNegation(data);
        break;
      case "rationale_mention":
        await this.processRationaleMention(data);
        break;
      case "restake":
        await this.processRestake(data);
        break;
      case "slash":
        await this.processSlash(data);
        break;
      case "doubt":
        await this.processDoubt(data);
        break;
      case "doubt_reduction":
        await this.processDoubtReduction(data);
        break;
    }
  }

  private async processEndorsement(data: EndorsementNotificationData) {
    const pointSnapshot = await this.resolvePointSnapshot(
      data.pointId,
      data.pointSnapshot
    );

    if (!pointSnapshot || pointSnapshot.createdBy === data.endorserId) {
      return; // Don't notify if point doesn't exist or user endorsed their own point
    }

    const title = "Your point received an endorsement";
    const content = `Someone endorsed your point with ${data.credAmount} cred: "${pointSnapshot.content.length > 50 ? pointSnapshot.content.substring(0, 50) + "..." : pointSnapshot.content}"`;

    const notificationData = {
      type: data.type,
      title,
      content,
      metadata: {
        pointId: data.pointId,
        credAmount: data.credAmount,
        pointContent: pointSnapshot.content,
      },
    };

    const aiSummary = await generateNotificationSummary(notificationData);

    await createNotification({
      userId: pointSnapshot.createdBy,
      type: data.type,
      sourceUserId: data.endorserId,
      sourceEntityId: data.pointId.toString(),
      sourceEntityType: "point",
      title,
      content,
      aiSummary: aiSummary || undefined,
      metadata: notificationData.metadata,
      space: data.space,
    });
  }

  private async processNegation(data: NegationNotificationData) {
    const snapshots = await this.collectPointSnapshots(
      [data.negatedPointId, data.counterpointId],
      new Map<number, PointSnapshot | null>([
        [data.negatedPointId, data.negatedPointSnapshot ?? null],
        [data.counterpointId, data.counterpointSnapshot ?? null],
      ])
    );

    const negatedPoint = snapshots.get(data.negatedPointId);
    const counterpoint = snapshots.get(data.counterpointId);

    if (
      !negatedPoint ||
      !counterpoint ||
      negatedPoint.createdBy === data.negatorId
    ) {
      return; // Don't notify if points don't exist or user negated their own point
    }

    const title = "Your point was challenged";
    const content = `Someone created a counterpoint to your point: "${negatedPoint.content.length > 50 ? negatedPoint.content.substring(0, 50) + "..." : negatedPoint.content}"`;

    const notificationData = {
      type: data.type,
      title,
      content,
      metadata: {
        negatedPointId: data.negatedPointId,
        counterpointId: data.counterpointId,
        credAmount: data.credAmount,
        negatedPointContent: negatedPoint.content,
        counterpointContent: counterpoint.content,
      },
    };

    const aiSummary = await generateNotificationSummary(notificationData);

    await createNotification({
      userId: negatedPoint.createdBy,
      type: data.type,
      sourceUserId: data.negatorId,
      sourceEntityId: data.negatedPointId.toString(),
      sourceEntityType: "point",
      title,
      content,
      aiSummary: aiSummary || undefined,
      metadata: notificationData.metadata,
      space: data.space,
    });
  }

  private async processRationaleMention(
    data: RationaleMentionNotificationData
  ) {
    // Extract point IDs from the graph
    const pointIds = data.graph.nodes
      .filter(
        (node) => node.type === "point" && (node.data as PointNodeData).pointId
      )
      .map((node) => (node.data as PointNodeData).pointId)
      .filter((id): id is number => typeof id === "number");

    if (pointIds.length === 0) {
      return; // No points to notify about
    }

    const providedSnapshots = new Map<number, PointSnapshot | null>(
      (data.pointSnapshots ?? []).map((snapshot) => [snapshot.id, snapshot])
    );

    const pointSnapshots = await this.collectPointSnapshots(
      pointIds,
      providedSnapshots
    );

    const rationaleSnapshot = await this.resolveRationaleSnapshot(
      data.rationaleId,
      {
        title: data.rationaleTitle,
        description: data.rationaleDescription,
      }
    );

    if (!rationaleSnapshot) {
      return;
    }

    const notificationTasks = Array.from(pointSnapshots.values())
      .filter((point) => point.createdBy !== data.authorId)
      .map(async (point) => {
        const title = "Your point was mentioned in a rationale";
        const content = `Your point "${point.content.length > 50 ? point.content.substring(0, 50) + "..." : point.content}" was included in the rationale "${rationaleSnapshot.title}"`;

        const notificationData = {
          type: data.type,
          title,
          content,
          metadata: {
            rationaleId: data.rationaleId,
            pointId: point.id,
            rationaleTitle: rationaleSnapshot.title,
            rationaleDescription: rationaleSnapshot.description,
            pointContent: point.content,
          },
        };

        // Generate AI summary in parallel
        let aiSummary: string | null = null;
        try {
          aiSummary = await generateNotificationSummary(notificationData);
        } catch (error) {
          logger.warn(
            "Failed to generate AI summary for notification:",
            error
          );
        }

        return {
          userId: point.createdBy,
          type: data.type,
          sourceUserId: data.authorId,
          sourceEntityId: data.rationaleId,
          sourceEntityType: "rationale" as const,
          title,
          content,
          aiSummary: aiSummary || undefined,
          metadata: notificationData.metadata,
          space: data.space,
        };
      });
    if (notificationTasks.length > 0) {
      try {
        const notificationParams = await Promise.all(notificationTasks);
        await Promise.all(
          notificationParams.map((params) => createNotification(params))
        );
      } catch (error) {
        logger.error(
          "Error processing rationale mention notifications:",
          error
        );
        for (const task of notificationTasks) {
          try {
            const params = await task;
            await createNotification(params);
          } catch (individualError) {
            logger.error(
              "Failed to create individual notification:",
              individualError
            );
          }
        }
      }
    }
  }

  private async processRestake(data: RestakeNotificationData) {
    const pointSnapshot = await this.resolvePointSnapshot(
      data.negatedPointId,
      data.pointSnapshot
    );

    if (!pointSnapshot || pointSnapshot.createdBy === data.restakerId) {
      return; // Don't notify if point doesn't exist or user restaked their own point
    }

    const title = "Someone restaked on your point";
    const content = `Someone committed ${data.amount} cred to change their mind if your point "${pointSnapshot.content.length > 50 ? pointSnapshot.content.substring(0, 50) + "..." : pointSnapshot.content}" is successfully negated`;

    const notificationData = {
      type: data.type,
      title,
      content,
      metadata: {
        negatedPointId: data.negatedPointId,
        amount: data.amount,
        negatedPointContent: pointSnapshot.content,
      },
    };

    const aiSummary = await generateNotificationSummary(notificationData);

    await createNotification({
      userId: pointSnapshot.createdBy,
      type: data.type,
      sourceUserId: data.restakerId,
      sourceEntityId: data.negatedPointId.toString(),
      sourceEntityType: "point",
      title,
      content,
      aiSummary: aiSummary || undefined,
      metadata: notificationData.metadata,
      space: data.space,
    });
  }

  private async processSlash(data: SlashNotificationData) {
    const pointSnapshot = await this.resolvePointSnapshot(
      data.negatedPointId,
      data.pointSnapshot
    );

    if (!pointSnapshot || pointSnapshot.createdBy === data.slasherId) {
      return; // Don't notify if point doesn't exist or user slashed their own restake
    }

    const title = "Someone slashed their restake on your point";
    const content = `Someone admitted they changed their mind about your point "${pointSnapshot.content.length > 50 ? pointSnapshot.content.substring(0, 50) + "..." : pointSnapshot.content}" and slashed ${data.amount} of their restake`;

    const notificationData = {
      type: data.type,
      title,
      content,
      metadata: {
        negatedPointId: data.negatedPointId,
        amount: data.amount,
        negatedPointContent: pointSnapshot.content,
      },
    };

    const aiSummary = await generateNotificationSummary(notificationData);

    await createNotification({
      userId: pointSnapshot.createdBy,
      type: data.type,
      sourceUserId: data.slasherId,
      sourceEntityId: data.negatedPointId.toString(),
      sourceEntityType: "point",
      title,
      content,
      aiSummary: aiSummary || undefined,
      metadata: notificationData.metadata,
      space: data.space,
    });
  }

  private async processDoubt(data: DoubtNotificationData) {
    const pointSnapshot = await this.resolvePointSnapshot(
      data.negatedPointId,
      data.pointSnapshot
    );

    if (!pointSnapshot || pointSnapshot.createdBy === data.doubterId) {
      return; // Don't notify if point doesn't exist or user doubted their own point
    }

    const title = "Someone doubted restakes on your point";
    const content = `Someone bet ${data.amount} cred that restakers won't follow through on your point: "${pointSnapshot.content.length > 50 ? pointSnapshot.content.substring(0, 50) + "..." : pointSnapshot.content}"`;

    const notificationData = {
      type: data.type,
      title,
      content,
      metadata: {
        negatedPointId: data.negatedPointId,
        amount: data.amount,
        negatedPointContent: pointSnapshot.content,
      },
    };

    const aiSummary = await generateNotificationSummary(notificationData);

    await createNotification({
      userId: pointSnapshot.createdBy,
      type: data.type,
      sourceUserId: data.doubterId,
      sourceEntityId: data.negatedPointId.toString(),
      sourceEntityType: "point",
      title,
      content,
      aiSummary: aiSummary || undefined,
      metadata: notificationData.metadata,
      space: data.space,
    });
  }

  private async processDoubtReduction(data: DoubtReductionNotificationData) {
    const pointSnapshot = await this.resolvePointSnapshot(
      data.negatedPointId,
      data.pointSnapshot
    );

    if (!pointSnapshot) {
      return; // Point doesn't exist
    }

    const title = "Your doubt was reduced by a slash";
    const content = `Someone slashed their restake on "${pointSnapshot.content.length > 50 ? pointSnapshot.content.substring(0, 50) + "..." : pointSnapshot.content}", reducing your doubt by ${data.reductionAmount} cred (${data.newDoubtAmount} remaining)`;

    const notificationData = {
      type: data.type,
      title,
      content,
      metadata: {
        negatedPointId: data.negatedPointId,
        reductionAmount: data.reductionAmount,
        newDoubtAmount: data.newDoubtAmount,
        negatedPointContent: pointSnapshot.content,
      },
    };

    const aiSummary = await generateNotificationSummary(notificationData);

    await createNotification({
      userId: data.doubterId,
      type: data.type,
      sourceUserId: data.slasherId,
      sourceEntityId: data.negatedPointId.toString(),
      sourceEntityType: "point",
      title,
      content,
      aiSummary: aiSummary || undefined,
      metadata: notificationData.metadata,
      space: data.space,
    });
  }
}

const notificationQueue = new NotificationQueue();

export const queueEndorsementNotification = (
  data: Omit<EndorsementNotificationData, "type">
) => {
  notificationQueue.queueNotification({ ...data, type: "endorsement" });
};

export const queueNegationNotification = (
  data: Omit<NegationNotificationData, "type">
) => {
  notificationQueue.queueNotification({ ...data, type: "negation" });
};

export const queueRationaleMentionNotification = (
  data: Omit<RationaleMentionNotificationData, "type">
) => {
  notificationQueue.queueNotification({ ...data, type: "rationale_mention" });
};

export const queueRestakeNotification = (
  data: Omit<RestakeNotificationData, "type">
) => {
  notificationQueue.queueNotification({ ...data, type: "restake" });
};

export const queueSlashNotification = (
  data: Omit<SlashNotificationData, "type">
) => {
  notificationQueue.queueNotification({ ...data, type: "slash" });
};

export const queueDoubtNotification = (
  data: Omit<DoubtNotificationData, "type">
) => {
  notificationQueue.queueNotification({ ...data, type: "doubt" });
};

export const queueDoubtReductionNotification = (
  data: Omit<DoubtReductionNotificationData, "type">
) => {
  notificationQueue.queueNotification({ ...data, type: "doubt_reduction" });
};
