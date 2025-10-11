import { db } from "@/services/db";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { eq, or } from "drizzle-orm";

/**
 * Resolves a slug or ID to the canonical document ID.
 * If the input is already a canonical ID, returns it.
 * If the input is a slug, looks up and returns the corresponding ID.
 *
 * @param idOrSlug - Either a document ID or slug
 * @returns The canonical document ID, or the original input if not found
 */
export async function resolveSlugToId(idOrSlug: string): Promise<string> {
  if (!idOrSlug) return idOrSlug;

  // Support combined slug_id format (e.g., "my-board_m-123").
  // We extract the trailing id after the last underscore if it looks like an id.
  // Otherwise, we try full-string match against id or slug.
  // Prefer parsing a trailing `_m-...` pattern to avoid ambiguity when ids contain underscores
  const mIdx = idOrSlug.lastIndexOf("_m-");
  if (mIdx >= 0) {
    const candidateId = idOrSlug.slice(mIdx + 1);
    // quick path: if candidateId exists as an id, return it
    try {
      const byId = await db
        .select({ id: mpDocsTable.id })
        .from(mpDocsTable)
        .where(eq(mpDocsTable.id, candidateId))
        .limit(1);
      if (byId.length === 1) {
        return byId[0].id;
      }
    } catch {}
  }

  try {
    const rows = await db
      .select({ id: mpDocsTable.id })
      .from(mpDocsTable)
      .where(or(eq(mpDocsTable.id, idOrSlug), eq(mpDocsTable.slug, idOrSlug)))
      .limit(1);

    if (rows.length === 1) {
      return rows[0].id;
    }
  } catch (err) {
    console.error("[SlugResolver] Error resolving slug to ID:", err);
  }

  // If not found or error, return original input
  return idOrSlug;
}

/**
 * Checks if a given string is a valid slug/ID format
 * @param idOrSlug - The string to validate
 * @returns true if valid format
 */
export function isValidSlugOrId(idOrSlug: string): boolean {
  // Allow alphanumeric, hyphens, underscores, colons
  // Length between 1-256 characters
  return /^[a-zA-Z0-9:_-]{1,256}$/.test(idOrSlug);
}
