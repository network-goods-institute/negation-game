import { NextRequest } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { messagesTable, generateConversationId } from "@/db/schema";
import { db } from "@/services/db";
import { checkRateLimit } from "@/lib/rateLimit";
import { and, eq, or } from "drizzle-orm";import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  const { spaceId } = await params;
  const { searchParams } = new URL(request.url);
  const otherUserId = searchParams.get("otherUserId");
  const lastSequence = searchParams.get("lastSequence");

  if (!otherUserId) {
    return new Response("Missing otherUserId parameter", { status: 400 });
  }

  const userId = await getUserId();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rateLimitResult = await checkRateLimit(
    userId,
    60,
    60000,
    "messages_sse"
  );
  if (!rateLimitResult.allowed) {
    return new Response("Rate limit exceeded", { status: 429 });
  }

  const conversationId = generateConversationId(userId, otherUserId, spaceId);

  const encoder = new TextEncoder();
  let lastMessageHash: string | null = null;
  let lastUnreadCount = 0;

  const stream = new ReadableStream({
    start(controller) {
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode("event: heartbeat\ndata: {}\n\n"));
      }, 30000);

      const checkForUpdates = async () => {
        try {
          const allMessagesQuery = await db
            .select({
              id: messagesTable.id,
              sequenceNumber: messagesTable.sequenceNumber,
              content: messagesTable.content,
              senderId: messagesTable.senderId,
              recipientId: messagesTable.recipientId,
              isRead: messagesTable.isRead,
              isDeleted: messagesTable.isDeleted,
              isEdited: messagesTable.isEdited,
              editedAt: messagesTable.editedAt,
              createdAt: messagesTable.createdAt,
              updatedAt: messagesTable.updatedAt,
            })
            .from(messagesTable)
            .where(
              and(
                eq(messagesTable.conversationId, conversationId),
                eq(messagesTable.space, spaceId),
                or(
                  eq(messagesTable.senderId, userId),
                  eq(messagesTable.recipientId, userId)
                )
              )
            )
            .orderBy(messagesTable.sequenceNumber);

          const currentMessageHash = JSON.stringify(
            allMessagesQuery.map((m) => ({
              id: m.id,
              sequenceNumber: m.sequenceNumber.toString(),
              content: m.content,
              isDeleted: m.isDeleted,
              isEdited: m.isEdited,
              editedAt: m.editedAt?.toISOString(),
              updatedAt: m.updatedAt.toISOString(),
              createdAt: m.createdAt.toISOString(),
              isRead: m.isRead,
            }))
          );

          const hasChanges = currentMessageHash !== lastMessageHash;

          if (hasChanges) {
            // For edits/deletes, we need to send all messages to ensure client gets updated states
            // For new messages, we can still use the sequence filter for efficiency
            let messagesToSend = allMessagesQuery;

            // Only apply sequence filter if we have lastSequence AND this looks like a new message scenario
            // (not an edit/delete scenario where existing messages changed)
            if (lastSequence && lastMessageHash !== null) {
              const newMessages = allMessagesQuery.filter(
                (msg) => msg.sequenceNumber > BigInt(lastSequence)
              );

              // If no new messages but we detected changes, it's likely an edit/delete
              // Send all messages to ensure client gets the updated states
              if (newMessages.length === 0) {
                messagesToSend = allMessagesQuery;
              } else {
                messagesToSend = newMessages;
              }
            }

            const data = JSON.stringify({
              type: "messages",
              messages: messagesToSend.map((msg) => ({
                ...msg,
                sequenceNumber: msg.sequenceNumber.toString(),
                editedAt: msg.editedAt?.toISOString() || null,
              })),
            });

            controller.enqueue(
              encoder.encode(`event: update\ndata: ${data}\n\n`)
            );

            // Calculate unread count
            const unreadCount = allMessagesQuery.filter(
              (msg) =>
                msg.recipientId === userId && !msg.isRead && !msg.isDeleted
            ).length;

            if (unreadCount !== lastUnreadCount) {
              const statusData = JSON.stringify({
                type: "status",
                unreadCount,
              });
              controller.enqueue(
                encoder.encode(`event: status\ndata: ${statusData}\n\n`)
              );
              lastUnreadCount = unreadCount;
            }

            // Update tracking variables
            lastMessageHash = currentMessageHash;
          }
        } catch (error) {
          logger.error("SSE error:", error);
        }
      };

      // Initial check
      checkForUpdates();

      // Check more frequently for better responsiveness, especially for edits/deletes
      const interval = setInterval(checkForUpdates, 500);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        clearInterval(keepAlive);
        controller.close();
      });
    },
  });

  const originHeader = request.headers.get("origin");
  const isDev = process.env.NODE_ENV !== "production";
  const PROD_ALLOWED_ORIGINS = new Set([
    "https://negationgame.com",
    "https://play.negationgame.com",
    "https://scroll.negationgame.com",
  ]);
  const isValidOrigin = (origin: string | null): boolean => {
    if (!origin) return false;
    if (PROD_ALLOWED_ORIGINS.has(origin)) return true;
    if (origin.endsWith(".negationgame.com")) return true;
    if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\\d+)?$/i.test(origin))
      return true;
    return false;
  };
  const requestOrigin = isValidOrigin(originHeader)
    ? (originHeader as string)
    : new URL(request.url).origin;

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": requestOrigin,
      Vary: "Origin",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
