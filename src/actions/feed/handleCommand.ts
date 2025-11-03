import { db } from "@/services/db";
import { pointsTable, spacesTable } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { decodeId } from "@/lib/negation-game/decodeId";import { logger } from "@/lib/logger";

export enum CommandType {
  PIN = "pin",
  UNKNOWN = "unknown",
}

type CommandConfig = {
  type: CommandType;
  targetId: string | undefined;
};

// Parse a command from the content string
export function parseCommand(content: string): CommandConfig | null {
  if (!content.startsWith("/")) return null;

  const parts = content.trim().split(" ");
  const command = parts[0].substring(1).toLowerCase();
  const targetId = parts.length > 1 ? parts[1] : undefined;

  switch (command) {
    case "pin":
      return { type: CommandType.PIN, targetId };
    default:
      return { type: CommandType.UNKNOWN, targetId };
  }
}

// Process a pin command
export async function processPinCommand(
  spaceId: string,
  targetPointId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    let pointId: number;

    try {
      const decodedId = decodeId(targetPointId);
      if (decodedId === null) {
        pointId = parseInt(targetPointId, 10);
        if (isNaN(pointId)) {
          logger.error(`Invalid point ID format: ${targetPointId}`);
          return { success: false, error: "Invalid point ID format" };
        }
      } else {
        pointId = decodedId;
      }
    } catch (e) {
      // If decoding fails, try to parse as a number directly
      pointId = parseInt(targetPointId, 10);
      if (isNaN(pointId)) {
        logger.error(`Invalid point ID format: ${targetPointId}`);
        return { success: false, error: "Invalid point ID format" };
      }
    }

    const point = await db.query.pointsTable.findFirst({
      where: and(eq(pointsTable.id, pointId), eq(pointsTable.isActive, true)),
    });

    if (!point) {
      return { success: false, error: "Point not found" };
    }

    // Update the space to pin this point
    await db
      .update(spacesTable)
      .set({ pinnedPointId: pointId })
      .where(eq(spacesTable.id, spaceId));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// Main handler for executing commands
export async function executeCommand(
  spaceId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  // IMPORTANT: Double check to prevent command execution in global space
  if (spaceId === "global") {
    return {
      success: false,
      error:
        "Commands can only be executed in specific spaces, not in global space",
    };
  }

  const command = parseCommand(content);
  if (!command) {
    return { success: false, error: "Not a valid command" };
  }
  switch (command.type) {
    case CommandType.PIN:
      if (!command.targetId) {
        return { success: false, error: "Pin command requires a point ID" };
      }
      if (spaceId === "global") {
        return {
          success: false,
          error: "Pin commands cannot be executed in global space",
        };
      }
      return processPinCommand(spaceId, command.targetId);

    case CommandType.UNKNOWN:
    default:
      return { success: false, error: "Unknown command" };
  }
}

// Utility function to help with debugging pin commands
export async function getAllPinCommands(spaceId: string) {
  const pinCommands = await db.query.pointsTable.findMany({
    where: and(
      eq(pointsTable.space, spaceId),
      eq(pointsTable.isCommand, true),
      eq(pointsTable.isActive, true),
      sql`${pointsTable.content} LIKE '/pin %'`
    ),
    orderBy: [sql`${pointsTable.createdAt} DESC`],
  });

  return pinCommands;
}
