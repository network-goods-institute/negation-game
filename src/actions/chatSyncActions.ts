"use server";

import { db } from "@/services/db";
import { chatsTable } from "@/db/tables/chatsTable";
import { getUserId } from "./getUserId";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const ChatMetadataSchema = z.object({
  id: z.string(),
  state_hash: z.string(),
  updatedAt: z.date(),
});
export type ChatMetadata = z.infer<typeof ChatMetadataSchema>;

const ChatContentSchema = z.object({
  title: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
      sources: z
        .array(
          z.object({ type: z.string(), id: z.union([z.string(), z.number()]) })
        )
        .optional(),
    })
  ),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ChatContent = z.infer<typeof ChatContentSchema>;

/**
 * Fetches metadata (id, state_hash, updatedAt) for all chats belonging to the current user.
 * @returns Promise<ChatMetadata[]>
 */
export async function fetchUserChatMetadata(): Promise<ChatMetadata[]> {
  const userId = await getUserId();
  if (!userId) {
    console.error("[fetchUserChatMetadata] User not authenticated.");
    return [];
  }

  try {
    const metadata = await db
      .select({
        id: chatsTable.id,
        state_hash: chatsTable.state_hash,
        updatedAt: chatsTable.updatedAt,
      })
      .from(chatsTable)
      .where(
        and(eq(chatsTable.userId, userId), eq(chatsTable.is_deleted, false))
      )
      .orderBy(chatsTable.updatedAt);

    const validatedMetadata = z.array(ChatMetadataSchema).safeParse(metadata);
    if (!validatedMetadata.success) {
      console.error(
        "[fetchUserChatMetadata] Failed Zod validation:",
        validatedMetadata.error
      );
      throw new Error("Failed to validate chat metadata from database.");
    }

    return validatedMetadata.data;
  } catch (error) {
    console.error(
      "[fetchUserChatMetadata] Error fetching chat metadata:",
      error
    );
    throw new Error("Failed to fetch chat metadata.");
  }
}

/**
 * Fetches the full content (title, messages, createdAt, updatedAt) of a specific chat, verifying ownership.
 * @param chatId The ID of the chat to fetch.
 * @returns Promise<ChatContent | null>
 */
export async function fetchChatContent(
  chatId: string
): Promise<ChatContent | null> {
  const userId = await getUserId();
  if (!userId) {
    console.error("[fetchChatContent] User not authenticated.");
    return null; // Or throw error
  }

  try {
    const result = await db
      .select({
        title: chatsTable.title,
        messages: chatsTable.messages,
        createdAt: chatsTable.createdAt,
        updatedAt: chatsTable.updatedAt,
      })
      .from(chatsTable)
      .where(and(eq(chatsTable.id, chatId), eq(chatsTable.userId, userId)))
      .limit(1);

    if (result.length === 0) {
      console.log(
        `[fetchChatContent] Chat not found or access denied for chatId: ${chatId}`
      );
      return null;
    }

    const chatData = {
      ...result[0],
      messages:
        typeof result[0].messages === "string"
          ? JSON.parse(result[0].messages)
          : result[0].messages,
    };

    const validatedContent = ChatContentSchema.safeParse(chatData);
    if (!validatedContent.success) {
      console.error(
        "[fetchChatContent] Failed Zod validation:",
        validatedContent.error
      );
      throw new Error("Failed to validate chat content from database.");
    }

    return validatedContent.data;
  } catch (error) {
    console.error(
      `[fetchChatContent] Error fetching chat content for chatId ${chatId}:`,
      error
    );
    throw new Error("Failed to fetch chat content.");
  }
}
const ClientChatDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(z.any()),
  state_hash: z.string(),
  spaceId: z.string(),
});

/**
 * Creates a new chat record in the database.
 * Assumes client generates the UUID.
 * @param chatData Object containing id, title, messages, state_hash, spaceId.
 * @returns Promise<{ success: boolean, id: string | null }>
 */
export async function createDbChat(
  chatData: unknown
): Promise<{ success: boolean; id: string | null; error?: string }> {
  const userId = await getUserId();
  if (!userId) {
    console.error("[createDbChat] User not authenticated.");
    const error = "User not authenticated.";
    return { success: false, id: null, error };
  }

  const validation = ClientChatDataSchema.safeParse(chatData);
  if (!validation.success) {
    const error = `Invalid chat data: ${validation.error.message}`;
    console.error("[createDbChat]", error);
    return { success: false, id: null, error };
  }
  const { id, title, messages, state_hash, spaceId } = validation.data;

  try {
    await db.insert(chatsTable).values({
      id: id,
      userId: userId,
      spaceId: spaceId,
      title: title,
      messages: messages,
      state_hash: state_hash,
    });
    console.log(`[createDbChat] Successfully created chat with id: ${id}`);
    return { success: true, id: id };
  } catch (error) {
    console.error(`[createDbChat] Error creating chat with id ${id}:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { success: false, id: null, error: errorMessage };
  }
}

/**
 * Updates an existing chat record in the database, verifying ownership.
 * @param chatData Object containing id, title, messages, state_hash.
 * @returns Promise<{ success: boolean }>
 */
export async function updateDbChat(
  chatData: unknown
): Promise<{ success: boolean; error?: string }> {
  const userId = await getUserId();
  if (!userId) {
    console.error("[updateDbChat] User not authenticated.");
    return { success: false, error: "User not authenticated." };
  }

  const validation = ClientChatDataSchema.pick({
    id: true,
    title: true,
    messages: true,
    state_hash: true,
  }).safeParse(chatData);
  if (!validation.success) {
    const error = `Invalid chat data: ${validation.error.message}`;
    console.error("[updateDbChat]", error);
    return { success: false, error };
  }
  const { id, title, messages, state_hash } = validation.data;

  try {
    const result = await db
      .update(chatsTable)
      .set({
        title: title,
        messages: messages,
        state_hash: state_hash,
        updatedAt: new Date(),
      })
      .where(and(eq(chatsTable.id, id), eq(chatsTable.userId, userId)))
      .returning({ updatedId: chatsTable.id });

    if (result.length === 0) {
      console.warn(
        `[updateDbChat] Chat not found or access denied for update, chatId: ${id}`
      );
      return { success: false, error: "Chat not found or access denied." };
    }

    console.log(`[updateDbChat] Successfully updated chat with id: ${id}`);
    return { success: true };
  } catch (error) {
    console.error(`[updateDbChat] Error updating chat with id ${id}:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Marks a chat as deleted in the database (soft delete).
 * @param chatId The ID of the chat to mark as deleted.
 * @returns Promise<{ success: boolean }>
 */
export async function markChatAsDeleted(
  chatId: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getUserId();
  if (!userId) {
    console.error("[markChatAsDeleted] User not authenticated.");
    return { success: false, error: "User not authenticated." };
  }

  if (!chatId) {
    console.error("[markChatAsDeleted] No chatId provided.");
    return { success: false, error: "No chatId provided." };
  }

  try {
    const result = await db
      .update(chatsTable)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updatedAt: new Date(), // Also update updatedAt?
      })
      .where(
        and(
          eq(chatsTable.id, chatId),
          eq(chatsTable.userId, userId),
          eq(chatsTable.is_deleted, false)
        )
      )
      .returning({ updatedId: chatsTable.id });

    if (result.length === 0) {
      console.warn(
        `[markChatAsDeleted] Chat not found, already deleted, or access denied for deletion, chatId: ${chatId}`
      );
      return {
        success: false,
        error: "Chat not found, already deleted, or access denied.",
      };
    }

    console.log(
      `[markChatAsDeleted] Successfully marked chat as deleted: ${chatId}`
    );
    return { success: true };
  } catch (error) {
    console.error(
      `[markChatAsDeleted] Error marking chat as deleted ${chatId}:`,
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}
