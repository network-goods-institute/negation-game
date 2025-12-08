import { db } from "@/services/db";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { mpDocPermissionsTable } from "@/db/tables/mpDocPermissionsTable";
import { mpDocShareLinksTable } from "@/db/tables/mpDocShareLinksTable";
import { resolveSlugToId, isValidSlugOrId } from "@/utils/slugResolver";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { logger } from "@/lib/logger";

export type DocAccessRole = "owner" | "editor" | "viewer";

export type DocAccessResult =
  | {
    status: "ok";
    docId: string;
    ownerId: string | null;
    slug: string | null;
    role: DocAccessRole;
    source: "owner" | "permission" | "share" | "ownerless";
    shareLinkId?: string;
    requiresAuthForWrite?: boolean;
  }
  | { status: "not_found" }
  | { status: "forbidden"; requiresAuth?: boolean; docId?: string };

export const canWriteRole = (role: DocAccessRole | null | undefined) =>
  role === "owner" || role === "editor";

const isAnonymousId = (userId: string | null | undefined) =>
  !userId || userId.startsWith("anon-");

export const resolveDocAccess = async (
  docId: string,
  opts: { userId?: string | null; shareToken?: string | null }
): Promise<DocAccessResult> => {
  if (!isValidSlugOrId(docId)) return { status: "not_found" };

  const canonicalId = await resolveSlugToId(docId);
  const safeLimit = async (query: any) => {
    try {
      if (query && typeof query.limit === "function") {
        return (await query.limit(1)) || [];
      }
    } catch (error) {
      logger.error("[mpAccess] limit failed", error);
    }
    return [];
  };

  const docRow = await safeLimit(
    db
      .select({
        id: mpDocsTable.id,
        ownerId: mpDocsTable.ownerId,
        slug: mpDocsTable.slug,
      })
      .from(mpDocsTable)
      .where(eq(mpDocsTable.id, canonicalId))
  );

  const doc = docRow[0];
  if (!doc) return { status: "not_found" };

  const userId = opts.userId || null;
  const anonymous = isAnonymousId(userId);

  if (!doc.ownerId) {
    if (!anonymous) {
      return {
        status: "ok",
        docId: canonicalId,
        ownerId: null,
        slug: doc.slug || null,
        role: "owner",
        source: "ownerless",
      };
    }
    return {
      status: "ok",
      docId: canonicalId,
      ownerId: null,
      slug: doc.slug || null,
      role: "viewer",
      source: "ownerless",
      requiresAuthForWrite: true,
    };
  }

  if (userId && doc.ownerId && doc.ownerId === userId) {
    return {
      status: "ok",
      docId: canonicalId,
      ownerId: doc.ownerId,
      slug: doc.slug || null,
      role: "owner",
      source: "owner",
    };
  }

  if (userId) {
    const perms = await safeLimit(
      db
        .select({ role: mpDocPermissionsTable.role })
        .from(mpDocPermissionsTable)
        .where(
          and(
            eq(mpDocPermissionsTable.docId, canonicalId),
            eq(mpDocPermissionsTable.userId, userId)
          )
        )
    );
    if (perms[0]?.role) {
      return {
        status: "ok",
        docId: canonicalId,
        ownerId: doc.ownerId,
        slug: doc.slug || null,
        role: perms[0].role,
        source: "permission",
      };
    }
  }

  const shareToken = opts.shareToken || null;
  if (shareToken) {
    const now = new Date();
    const links = await safeLimit(
      db
        .select({
          id: mpDocShareLinksTable.id,
          role: mpDocShareLinksTable.role,
          requireLogin: mpDocShareLinksTable.requireLogin,
          token: mpDocShareLinksTable.token,
          expiresAt: mpDocShareLinksTable.expiresAt,
          disabledAt: mpDocShareLinksTable.disabledAt,
        })
        .from(mpDocShareLinksTable)
        .where(
          and(
            eq(mpDocShareLinksTable.docId, canonicalId),
            eq(mpDocShareLinksTable.token, shareToken),
            isNull(mpDocShareLinksTable.disabledAt),
            or(
              isNull(mpDocShareLinksTable.expiresAt),
              gt(mpDocShareLinksTable.expiresAt, now)
            )
          )
        )
    );

    const link = links[0];
    if (link) {
      if (link.requireLogin && anonymous) {
        return { status: "forbidden", requiresAuth: true, docId: canonicalId };
      }

      const role: DocAccessRole = link.role;

      return {
        status: "ok",
        docId: canonicalId,
        ownerId: doc.ownerId,
        slug: doc.slug || null,
        role,
        source: "share",
        shareLinkId: link.id,
        requiresAuthForWrite: false,
      };
    }
  }

  return { status: "forbidden", docId: canonicalId, requiresAuth: true };
};
