import { getUserId } from "@/actions/users/getUserId";
import { messagesTable, generateConversationId } from "@/db/schema";
import { db } from "@/services/db";
import { and, eq, desc, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get("otherUserId");
    const { spaceId } = await params;

    if (!otherUserId) {
      return NextResponse.json(
        { error: "otherUserId is required" },
        { status: 400 }
      );
    }

    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversationId = generateConversationId(userId, otherUserId, spaceId);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.conversationId, conversationId),
          eq(messagesTable.space, spaceId),
          eq(messagesTable.isDeleted, false)
        )
      );

    const lastMessage = await db
      .select({
        id: messagesTable.id,
        createdAt: messagesTable.createdAt,
        updatedAt: messagesTable.updatedAt,
        senderId: messagesTable.senderId,
      })
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.conversationId, conversationId),
          eq(messagesTable.space, spaceId),
          eq(messagesTable.isDeleted, false)
        )
      )
      .orderBy(desc(messagesTable.createdAt))
      .limit(1);

    const lastUpdatedMessage = await db
      .select({
        id: messagesTable.id,
        updatedAt: messagesTable.updatedAt,
      })
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.conversationId, conversationId),
          eq(messagesTable.space, spaceId),
          eq(messagesTable.isDeleted, false)
        )
      )
      .orderBy(desc(messagesTable.updatedAt))
      .limit(1);

    const unreadCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.conversationId, conversationId),
          eq(messagesTable.recipientId, userId),
          eq(messagesTable.space, spaceId),
          eq(messagesTable.isRead, false),
          eq(messagesTable.isDeleted, false)
        )
      );

    return NextResponse.json({
      messageCount: count,
      lastMessageId: lastMessage[0]?.id || null,
      lastMessageAt: lastMessage[0]?.createdAt || null,
      lastSenderId: lastMessage[0]?.senderId || null,
      lastUpdatedAt: lastUpdatedMessage[0]?.updatedAt || null,
      lastUpdatedMessageId: lastUpdatedMessage[0]?.id || null,
      unreadCount: unreadCount[0]?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching conversation status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}