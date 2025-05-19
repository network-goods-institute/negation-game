"use server";

import { db } from "@/services/db";
import { chatsTable } from "@/db/tables/chatsTable";
import { getUserId } from "./getUserId";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";

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
  graph: z.custom<ViewpointGraph>().optional().nullable(),
  distillRationaleId: z.string().nullable().optional(),
});
export type ChatContent = z.infer<typeof ChatContentSchema>;

const ClientChatCreateSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(z.any()),
  state_hash: z.string(),
  spaceId: z.string(),
  graph: z.custom<ViewpointGraph>().optional().nullable(),
  distillRationaleId: z.string().nullable().optional(),
});

const ClientChatUpdateSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(z.any()),
  state_hash: z.string(),
  graph: z.custom<ViewpointGraph>().optional().nullable(),
  distillRationaleId: z.string().nullable().optional(),
});

/**
 * Fetches metadata (id, state_hash, updatedAt) for all chats belonging to the current user.
 * Fetches metadata (id, state_hash, updatedAt) for chats belonging to the current user within a specific space.
 * @param spaceId The ID of the space to filter chats by.
 * @returns Promise<ChatMetadata[]>
 */
export async function fetchUserChatMetadata(
  spaceId: string
): Promise<ChatMetadata[]> {
  const userId = await getUserId();
  if (!userId) {
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
        and(
          eq(chatsTable.userId, userId),
          eq(chatsTable.is_deleted, false),
          eq(chatsTable.spaceId, spaceId)
        )
      )
      .orderBy(chatsTable.updatedAt);

    const validatedMetadata = z.array(ChatMetadataSchema).safeParse(metadata);
    if (!validatedMetadata.success) {
      throw new Error("Failed to validate chat metadata from database.");
    }

    return validatedMetadata.data;
  } catch (error) {
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
    return null;
  }

  try {
    const result = await db
      .select({
        title: chatsTable.title,
        messages: chatsTable.messages,
        createdAt: chatsTable.createdAt,
        updatedAt: chatsTable.updatedAt,
        graph: chatsTable.graph,
        distillRationaleId: chatsTable.distillRationaleId,
      })
      .from(chatsTable)
      .where(and(eq(chatsTable.id, chatId), eq(chatsTable.userId, userId)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const chatData = {
      ...result[0],
      messages:
        typeof result[0].messages === "string"
          ? JSON.parse(result[0].messages)
          : result[0].messages,
      graph: result[0].graph,
    };

    const validatedContent = ChatContentSchema.safeParse(chatData);
    if (!validatedContent.success) {
      console.error(
        "Validation Error (fetchChatContent):",
        validatedContent.error.errors
      );
      throw new Error("Failed to validate chat content from database.");
    }

    return validatedContent.data;
  } catch (error) {
    console.error("DB Error (fetchChatContent):", error);
    throw new Error("Failed to fetch chat content.");
  }
}

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
    const error = "User not authenticated.";
    return { success: false, id: null, error };
  }

  const validation = ClientChatCreateSchema.safeParse(chatData);
  if (!validation.success) {
    const error = `Invalid chat data: ${validation.error.message}`;
    console.error("Validation Error (createDbChat):", validation.error.errors);
    return { success: false, id: null, error };
  }
  const {
    id: createId,
    title: createTitle,
    messages: createMessages,
    state_hash: createStateHash,
    spaceId: createSpaceId,
    graph: createGraph,
    distillRationaleId: createDistillRationaleId,
  } = validation.data;

  try {
    await db.insert(chatsTable).values({
      id: createId,
      userId: userId,
      spaceId: createSpaceId,
      title: createTitle,
      messages: createMessages,
      state_hash: createStateHash,
      graph: createGraph,
      distillRationaleId: createDistillRationaleId,
    });
    return { success: true, id: createId };
  } catch (error) {
    console.error("DB Error (createDbChat):", error);
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
    return { success: false, error: "User not authenticated." };
  }

  const updateValidation = ClientChatUpdateSchema.safeParse(chatData);
  if (!updateValidation.success) {
    const error = `Invalid chat data: ${updateValidation.error.message}`;
    console.error(
      "Validation Error (updateDbChat):",
      updateValidation.error.errors
    );
    return { success: false, error };
  }
  const {
    id: updateId,
    title: updateTitle,
    messages: updateMessages,
    state_hash: updateStateHash,
    graph: updateGraph,
    distillRationaleId: updateDistillRationaleId,
  } = updateValidation.data;

  try {
    const result = await db
      .update(chatsTable)
      .set({
        title: updateTitle,
        messages: updateMessages,
        state_hash: updateStateHash,
        updatedAt: new Date(),
        graph: updateGraph,
        distillRationaleId: updateDistillRationaleId,
      })
      .where(and(eq(chatsTable.id, updateId), eq(chatsTable.userId, userId)))
      .returning({
        updatedId: chatsTable.id,
        distillRationaleId: chatsTable.distillRationaleId,
      });

    if (result.length === 0) {
      return { success: false, error: "Chat not found or access denied." };
    }

    return { success: true };
  } catch (error) {
    console.error("DB Error (updateDbChat):", error);
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
    return { success: false, error: "User not authenticated." };
  }

  if (!chatId) {
    return { success: false, error: "No chatId provided." };
  }

  try {
    const result = await db
      .update(chatsTable)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updatedAt: new Date(),
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
      return {
        success: false,
        error: "Chat not found, already deleted, or access denied.",
      };
    }
    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}
