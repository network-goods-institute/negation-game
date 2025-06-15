import { createNotification } from "@/actions/notifications/createNotification";
import { generateNotificationSummary } from "@/actions/ai/generateNotificationSummary";
import { db } from "@/services/db";
import { pointsTable, viewpointsTable, usersTable } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { PointNodeData } from "@/components/graph/nodes/PointNode";

interface EndorsementNotificationData {
  type: "endorsement";
  pointId: number;
  endorserId: string;
  credAmount: number;
  space: string;
}

interface NegationNotificationData {
  type: "negation";
  negatedPointId: number;
  counterpointId: number;
  negatorId: string;
  credAmount: number;
  space: string;
}

interface RationaleMentionNotificationData {
  type: "rationale_mention";
  rationaleId: string;
  graph: ViewpointGraph;
  authorId: string;
  space: string;
}

interface RestakeNotificationData {
  type: "restake";
  negatedPointId: number;
  restakerId: string;
  amount: number;
  space: string;
}

interface SlashNotificationData {
  type: "slash";
  negatedPointId: number;
  slasherId: string;
  amount: number;
  space: string;
}

interface DoubtNotificationData {
  type: "doubt";
  negatedPointId: number;
  doubterId: string;
  amount: number;
  space: string;
}

interface DoubtReductionNotificationData {
  type: "doubt_reduction";
  negatedPointId: number;
  slasherId: string;
  doubterId: string;
  reductionAmount: number;
  newDoubtAmount: number;
  space: string;
}

type NotificationData =
  | EndorsementNotificationData
  | NegationNotificationData
  | RationaleMentionNotificationData
  | RestakeNotificationData
  | SlashNotificationData
  | DoubtNotificationData
  | DoubtReductionNotificationData;

class NotificationQueue {
  private queue: NotificationData[] = [];
  private processing = false;

  async queueNotification(data: NotificationData) {
    this.queue.push(data);
    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    this.processing = true;

    while (this.queue.length > 0) {
      const notification = this.queue.shift()!;

      try {
        await this.processNotification(notification);
      } catch (error) {
        console.error("Failed to process notification:", error);
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
    // Fetch point and check if we should send notification
    const point = await db
      .select({
        createdBy: pointsTable.createdBy,
        content: pointsTable.content,
      })
      .from(pointsTable)
      .where(
        and(eq(pointsTable.id, data.pointId), eq(pointsTable.isActive, true))
      )
      .limit(1);

    if (!point[0] || point[0].createdBy === data.endorserId) {
      return; // Don't notify if point doesn't exist or user endorsed their own point
    }

    const title = "Your point received an endorsement";
    const content = `Someone endorsed your point with ${data.credAmount} cred`;

    const notificationData = {
      type: data.type,
      title,
      content,
      metadata: {
        pointId: data.pointId,
        credAmount: data.credAmount,
        pointContent: point[0].content,
      },
    };

    const aiSummary = await generateNotificationSummary(notificationData);

    await createNotification({
      userId: point[0].createdBy,
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
    // Fetch both points and check if we should send notification
    const points = await db
      .select({
        id: pointsTable.id,
        createdBy: pointsTable.createdBy,
        content: pointsTable.content,
      })
      .from(pointsTable)
      .where(
        and(
          inArray(pointsTable.id, [data.negatedPointId, data.counterpointId]),
          eq(pointsTable.isActive, true)
        )
      );

    const negatedPoint = points.find((p) => p.id === data.negatedPointId);
    const counterpoint = points.find((p) => p.id === data.counterpointId);

    if (
      !negatedPoint ||
      !counterpoint ||
      negatedPoint.createdBy === data.negatorId
    ) {
      return; // Don't notify if points don't exist or user negated their own point
    }

    const title = "Your point was challenged";
    const content = "Someone created a counterpoint to your point";

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

    // Fetch rationale data
    const rationale = await db
      .select({
        title: viewpointsTable.title,
        description: viewpointsTable.description,
      })
      .from(viewpointsTable)
      .where(eq(viewpointsTable.id, data.rationaleId))
      .limit(1);

    if (!rationale[0]) {
      return; // Rationale not found
    }

    // Fetch all point creators
    const pointCreators = await db
      .select({
        id: pointsTable.id,
        createdBy: pointsTable.createdBy,
        content: pointsTable.content,
      })
      .from(pointsTable)
      .where(
        and(inArray(pointsTable.id, pointIds), eq(pointsTable.isActive, true))
      );

    // Send notification to each point creator (except the rationale author)
    for (const point of pointCreators) {
      if (point.createdBy !== data.authorId) {
        const title = "Your point was mentioned in a rationale";
        const content = `Your point was included in the rationale "${rationale[0].title}"`;

        const notificationData = {
          type: data.type,
          title,
          content,
          metadata: {
            rationaleId: data.rationaleId,
            pointId: point.id,
            rationaleTitle: rationale[0].title,
            rationaleDescription: rationale[0].description,
            pointContent: point.content,
          },
        };

        const aiSummary = await generateNotificationSummary(notificationData);

        await createNotification({
          userId: point.createdBy,
          type: data.type,
          sourceUserId: data.authorId,
          sourceEntityId: data.rationaleId,
          sourceEntityType: "rationale",
          title,
          content,
          aiSummary: aiSummary || undefined,
          metadata: notificationData.metadata,
          space: data.space,
        });
      }
    }
  }

  private async processRestake(data: RestakeNotificationData) {
    // Fetch point and check if we should send notification
    const point = await db
      .select({
        createdBy: pointsTable.createdBy,
        content: pointsTable.content,
      })
      .from(pointsTable)
      .where(
        and(
          eq(pointsTable.id, data.negatedPointId),
          eq(pointsTable.isActive, true)
        )
      )
      .limit(1);

    if (!point[0] || point[0].createdBy === data.restakerId) {
      return; // Don't notify if point doesn't exist or user restaked their own point
    }

    const title = "Someone restaked on your point";
    const content = `Someone committed ${data.amount} cred to change their mind if your point is successfully negated`;

    const notificationData = {
      type: data.type,
      title,
      content,
      metadata: {
        negatedPointId: data.negatedPointId,
        amount: data.amount,
        negatedPointContent: point[0].content,
      },
    };

    const aiSummary = await generateNotificationSummary(notificationData);

    await createNotification({
      userId: point[0].createdBy,
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
    // Fetch point and check if we should send notification
    const point = await db
      .select({
        createdBy: pointsTable.createdBy,
        content: pointsTable.content,
      })
      .from(pointsTable)
      .where(
        and(
          eq(pointsTable.id, data.negatedPointId),
          eq(pointsTable.isActive, true)
        )
      )
      .limit(1);

    if (!point[0] || point[0].createdBy === data.slasherId) {
      return; // Don't notify if point doesn't exist or user slashed their own restake
    }

    const title = "Someone slashed their restake on your point";
    const content = `Someone admitted they changed their mind about your point and slashed ${data.amount} of their restake`;

    const notificationData = {
      type: data.type,
      title,
      content,
      metadata: {
        negatedPointId: data.negatedPointId,
        amount: data.amount,
        negatedPointContent: point[0].content,
      },
    };

    const aiSummary = await generateNotificationSummary(notificationData);

    await createNotification({
      userId: point[0].createdBy,
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
    // Fetch point and check if we should send notification
    const point = await db
      .select({
        createdBy: pointsTable.createdBy,
        content: pointsTable.content,
      })
      .from(pointsTable)
      .where(
        and(
          eq(pointsTable.id, data.negatedPointId),
          eq(pointsTable.isActive, true)
        )
      )
      .limit(1);

    if (!point[0] || point[0].createdBy === data.doubterId) {
      return; // Don't notify if point doesn't exist or user doubted their own point
    }

    const title = "Someone doubted restakes on your point";
    const content = `Someone bet ${data.amount} cred that restakers won't follow through on your point`;

    const notificationData = {
      type: data.type,
      title,
      content,
      metadata: {
        negatedPointId: data.negatedPointId,
        amount: data.amount,
        negatedPointContent: point[0].content,
      },
    };

    const aiSummary = await generateNotificationSummary(notificationData);

    await createNotification({
      userId: point[0].createdBy,
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
    // Fetch point for context
    const point = await db
      .select({ content: pointsTable.content })
      .from(pointsTable)
      .where(
        and(
          eq(pointsTable.id, data.negatedPointId),
          eq(pointsTable.isActive, true)
        )
      )
      .limit(1);

    if (!point[0]) {
      return; // Point doesn't exist
    }

    const title = "Your doubt was reduced by a slash";
    const content = `Someone slashed their restake, reducing your doubt by ${data.reductionAmount} cred (${data.newDoubtAmount} remaining)`;

    const notificationData = {
      type: data.type,
      title,
      content,
      metadata: {
        negatedPointId: data.negatedPointId,
        reductionAmount: data.reductionAmount,
        newDoubtAmount: data.newDoubtAmount,
        negatedPointContent: point[0].content,
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
