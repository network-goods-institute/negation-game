"use server";

import { db } from "@/services/db";
import { getUserId } from "@/actions/users/getUserId";
import { mpDocShareLinksTable } from "@/db/tables/mpDocShareLinksTable";
import { mpDocPermissionsTable } from "@/db/tables/mpDocPermissionsTable";
import { mpDocAccessRequestsTable } from "@/db/tables/mpDocAccessRequestsTable";
import { mpDocsTable, usersTable } from "@/db/schema";
import { resolveDocAccess, canWriteRole } from "@/services/mpAccess";
import { resolveSlugToId, isValidSlugOrId } from "@/utils/slugResolver";
import { nanoid } from "nanoid";
import { and, desc, eq } from "drizzle-orm";

type ShareRole = "viewer" | "editor";

/**
 * Internal helper to assert owner access and throw if not authorized.
 * @throws Error if user is not the document owner
 */
const assertOwnerAccess = async (docId: string, userId: string) => {
  const access = await resolveDocAccess(docId, { userId });
  if (access.status === "not_found") throw new Error("Document not found");
  if (access.status !== "ok" || access.role !== "owner") {
    throw new Error("Forbidden");
  }
  return access;
};

/**
 * Creates a shareable link for a document with specific permissions.
 * Only document owners can create share links.
 *
 * @param docId - Document ID or slug
 * @param opts - Share link options
 * @param opts.role - Access level to grant ("viewer" or "editor")
 * @param opts.requireLogin - Whether the link requires authentication
 * @param opts.expiresAt - Optional ISO 8601 expiry date (must be future date)
 *
 * @returns Created share link with token (format: "sl-" + 21 chars)
 *
 * @throws Error if user is unauthorized or not document owner
 * @throws Error if expiresAt is invalid or in the past
 *
 * @example
 * ```ts
 * const link = await createShareLink("doc-123", {
 *   role: "editor",
 *   requireLogin: true,
 *   expiresAt: "2025-12-31T23:59:59Z"
 * });
 * // Share URL: https://app.com/doc/doc-123?share=sl-abc123...
 * ```
 */
export const createShareLink = async (
  docId: string,
  opts: {
    role: ShareRole;
    requireLogin: boolean;
    expiresAt?: string | null;
  }
) => {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  if (!isValidSlugOrId(docId)) throw new Error("Invalid doc id or slug");

  const canonicalId = await resolveSlugToId(docId);
  await assertOwnerAccess(canonicalId, userId);

  const token = `sl-${nanoid(21)}`;
  let expiresAtDate: Date | null = null;
  if (opts.expiresAt) {
    expiresAtDate = new Date(opts.expiresAt);
    if (isNaN(expiresAtDate.getTime())) {
      throw new Error("Invalid expiry date");
    }
    const nowUtc = new Date();
    if (expiresAtDate <= nowUtc) {
      throw new Error("Expiry must be in the future");
    }
  }

  const [row] = await db
    .insert(mpDocShareLinksTable)
    .values({
      docId: canonicalId,
      token,
      role: opts.role,
      requireLogin: opts.requireLogin,
      grantPermanentAccess: false,
      expiresAt: expiresAtDate || null,
      createdBy: userId,
    })
    .returning();

  return {
    id: row.id,
    token: row.token,
    role: row.role,
    requireLogin: row.requireLogin,
    expiresAt: row.expiresAt,
  };
};

/**
 * Lists all active share links for a document.
 * Only document owners can list share links.
 * Excludes disabled and expired links from results.
 *
 * @param docId - Document ID or slug
 * @param opts - Pagination options
 * @param opts.limit - Max results per page (1-100, default: 50)
 * @param opts.offset - Number of results to skip (default: 0)
 *
 * @returns Array of active share links ordered by creation date (newest first)
 *
 * @throws Error if user is unauthorized or not document owner
 * @throws Error if limit/offset are invalid
 */
export const listShareLinks = async (
  docId: string,
  opts?: { limit?: number; offset?: number }
) => {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  if (!isValidSlugOrId(docId)) throw new Error("Invalid doc id or slug");

  const canonicalId = await resolveSlugToId(docId);
  await assertOwnerAccess(canonicalId, userId);

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  if (limit < 1 || limit > 100) throw new Error("Limit must be between 1 and 100");
  if (offset < 0) throw new Error("Offset must be non-negative");

  const nowUtc = new Date();
  const rows = await db
    .select({
      id: mpDocShareLinksTable.id,
      role: mpDocShareLinksTable.role,
      token: mpDocShareLinksTable.token,
      requireLogin: mpDocShareLinksTable.requireLogin,
      expiresAt: mpDocShareLinksTable.expiresAt,
      disabledAt: mpDocShareLinksTable.disabledAt,
      createdAt: mpDocShareLinksTable.createdAt,
    })
    .from(mpDocShareLinksTable)
    .where(eq(mpDocShareLinksTable.docId, canonicalId))
    .orderBy(desc(mpDocShareLinksTable.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.filter((row) => {
    if (row.disabledAt) return false;
    if (row.expiresAt && row.expiresAt <= nowUtc) return false;
    return true;
  });
};

/**
 * Revokes a share link by marking it as disabled.
 * Only document owners can revoke share links.
 * The link will no longer grant access after revocation.
 *
 * @param docId - Document ID or slug
 * @param linkId - UUID of the share link to revoke
 *
 * @returns Success indicator
 *
 * @throws Error if user is unauthorized or not document owner
 */
export const revokeShareLink = async (docId: string, linkId: string) => {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  if (!isValidSlugOrId(docId)) throw new Error("Invalid doc id or slug");

  const canonicalId = await resolveSlugToId(docId);
  await assertOwnerAccess(canonicalId, userId);

  const nowUtc = new Date();
  await db
    .update(mpDocShareLinksTable)
    .set({ disabledAt: nowUtc })
    .where(and(eq(mpDocShareLinksTable.id, linkId), eq(mpDocShareLinksTable.docId, canonicalId)));

  return { ok: true } as const;
};

/**
 * Grants or updates a user's direct access to a document.
 * Only document owners can set user access.
 * Creates or updates a permission entry in mp_doc_permissions.
 *
 * @param docId - Document ID or slug
 * @param targetUserId - User ID to grant access to
 * @param role - Access level to grant ("viewer" or "editor")
 *
 * @returns Updated permission record
 *
 * @throws Error if user is unauthorized or not document owner
 */
export const setUserAccess = async (
  docId: string,
  targetUserId: string,
  role: ShareRole
) => {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  if (!isValidSlugOrId(docId)) throw new Error("Invalid doc id or slug");
  if (!targetUserId) throw new Error("Target user required");

  const canonicalId = await resolveSlugToId(docId);
  await assertOwnerAccess(canonicalId, userId);

  // Validate that target user exists
  const { usersTable } = await import("@/db/schema");
  const targetUser = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, targetUserId))
    .limit(1);

  if (targetUser.length === 0) {
    throw new Error("Target user not found");
  }

  const [row] = await db
    .insert(mpDocPermissionsTable)
    .values({
      docId: canonicalId,
      userId: targetUserId,
      role,
      grantedBy: userId,
    })
    .onConflictDoUpdate({
      target: [mpDocPermissionsTable.docId, mpDocPermissionsTable.userId],
      set: { role, updatedAt: new Date(), grantedBy: userId },
    })
    .returning({
      docId: mpDocPermissionsTable.docId,
      userId: mpDocPermissionsTable.userId,
      role: mpDocPermissionsTable.role,
    });

  return row;
};

/**
 * Removes a user's direct access to a document.
 * Only document owners can remove user access.
 * Deletes the permission entry from mp_doc_permissions.
 *
 * @param docId - Document ID or slug
 * @param targetUserId - User ID to remove access from
 *
 * @returns Success indicator
 *
 * @throws Error if user is unauthorized or not document owner
 */
export const removeUserAccess = async (docId: string, targetUserId: string) => {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  if (!isValidSlugOrId(docId)) throw new Error("Invalid doc id or slug");
  if (!targetUserId) throw new Error("Target user required");

  const canonicalId = await resolveSlugToId(docId);
  await assertOwnerAccess(canonicalId, userId);

  await db
    .delete(mpDocPermissionsTable)
    .where(
      and(
        eq(mpDocPermissionsTable.docId, canonicalId),
        eq(mpDocPermissionsTable.userId, targetUserId)
      )
    );

  return { ok: true } as const;
};

/**
 * Lists all users with direct access to a document.
 * Users with editor or owner role can view collaborators.
 * Returns user details and permission metadata.
 *
 * @param docId - Document ID or slug
 * @param opts - Pagination options
 * @param opts.limit - Max results per page (1-100, default: 50)
 * @param opts.offset - Number of results to skip (default: 0)
 *
 * @returns Array of collaborators with their roles, ordered by grant date (newest first)
 *
 * @throws Error if user is unauthorized or lacks write access
 * @throws Error if limit/offset are invalid
 */
export const listCollaborators = async (
  docId: string,
  opts?: { limit?: number; offset?: number }
) => {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  if (!isValidSlugOrId(docId)) throw new Error("Invalid doc id or slug");

  const canonicalId = await resolveSlugToId(docId);
  const access = await resolveDocAccess(canonicalId, { userId });
  if (access.status !== "ok") throw new Error("Forbidden");
  if (!canWriteRole(access.role)) throw new Error("Forbidden");

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  if (limit < 1 || limit > 100) throw new Error("Limit must be between 1 and 100");
  if (offset < 0) throw new Error("Offset must be non-negative");

  const { usersTable } = await import("@/db/schema");
  const rows = await db
    .select({
      userId: mpDocPermissionsTable.userId,
      username: usersTable.username,
      role: mpDocPermissionsTable.role,
      grantedBy: mpDocPermissionsTable.grantedBy,
      createdAt: mpDocPermissionsTable.createdAt,
    })
    .from(mpDocPermissionsTable)
    .leftJoin(usersTable, eq(mpDocPermissionsTable.userId, usersTable.id))
    .where(eq(mpDocPermissionsTable.docId, canonicalId))
    .orderBy(desc(mpDocPermissionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  return rows;
};

export const createAccessRequest = async (
  docId: string,
  requestedRole: ShareRole
) => {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  if (!isValidSlugOrId(docId)) throw new Error("Invalid doc id or slug");
  if (requestedRole !== "viewer" && requestedRole !== "editor") {
    throw new Error("Invalid requested role");
  }

  const canonicalId = await resolveSlugToId(docId);
  const access = await resolveDocAccess(canonicalId, { userId });
  if (access.status === "not_found") throw new Error("Document not found");
  if (access.status === "ok") {
    return { ok: false, status: "already_has_access" } as const;
  }

  const now = new Date();
  const [row] = await db
    .insert(mpDocAccessRequestsTable)
    .values({
      docId: canonicalId,
      requesterId: userId,
      requestedRole,
      status: "pending",
      resolvedAt: null,
      resolvedBy: null,
      resolvedRole: null,
    })
    .onConflictDoUpdate({
      target: [
        mpDocAccessRequestsTable.docId,
        mpDocAccessRequestsTable.requesterId,
      ],
      set: {
        requestedRole,
        status: "pending",
        updatedAt: now,
        resolvedAt: null,
        resolvedBy: null,
        resolvedRole: null,
      },
    })
    .returning({
      id: mpDocAccessRequestsTable.id,
      status: mpDocAccessRequestsTable.status,
      requestedRole: mpDocAccessRequestsTable.requestedRole,
    });

  return { ok: true, status: row?.status ?? "pending" } as const;
};

export const listAccessRequests = async (opts?: { docId?: string }) => {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");

  let docFilter: string | null = null;
  if (opts?.docId) {
    if (!isValidSlugOrId(opts.docId)) throw new Error("Invalid doc id or slug");
    docFilter = await resolveSlugToId(opts.docId);
    const access = await resolveDocAccess(docFilter, { userId });
    if (access.status !== "ok" || access.role !== "owner") {
      throw new Error("Forbidden");
    }
  }

  const query = db
    .select({
      id: mpDocAccessRequestsTable.id,
      docId: mpDocAccessRequestsTable.docId,
      docTitle: mpDocsTable.title,
      docSlug: mpDocsTable.slug,
      requesterId: mpDocAccessRequestsTable.requesterId,
      requesterUsername: usersTable.username,
      requestedRole: mpDocAccessRequestsTable.requestedRole,
      status: mpDocAccessRequestsTable.status,
      createdAt: mpDocAccessRequestsTable.createdAt,
    })
    .from(mpDocAccessRequestsTable)
    .leftJoin(mpDocsTable, eq(mpDocsTable.id, mpDocAccessRequestsTable.docId))
    .leftJoin(usersTable, eq(usersTable.id, mpDocAccessRequestsTable.requesterId))
    .where(
      and(
        eq(mpDocAccessRequestsTable.status, "pending"),
        docFilter
          ? eq(mpDocAccessRequestsTable.docId, docFilter)
          : eq(mpDocsTable.ownerId, userId)
      )
    )
    .orderBy(desc(mpDocAccessRequestsTable.createdAt));

  return query;
};

export const resolveAccessRequest = async (opts: {
  requestId: string;
  action: "approve" | "decline";
  role?: ShareRole;
}) => {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  if (!opts.requestId) throw new Error("Request id required");

  const [row] = await db
    .select({
      id: mpDocAccessRequestsTable.id,
      docId: mpDocAccessRequestsTable.docId,
      requesterId: mpDocAccessRequestsTable.requesterId,
      requestedRole: mpDocAccessRequestsTable.requestedRole,
      status: mpDocAccessRequestsTable.status,
      ownerId: mpDocsTable.ownerId,
    })
    .from(mpDocAccessRequestsTable)
    .leftJoin(mpDocsTable, eq(mpDocsTable.id, mpDocAccessRequestsTable.docId))
    .where(eq(mpDocAccessRequestsTable.id, opts.requestId))
    .limit(1);

  if (!row) throw new Error("Request not found");
  if (row.ownerId !== userId) throw new Error("Forbidden");
  if (row.status !== "pending") {
    return { ok: false, status: row.status } as const;
  }

  const now = new Date();
  if (opts.action === "decline") {
    await db
      .update(mpDocAccessRequestsTable)
      .set({
        status: "declined",
        resolvedAt: now,
        resolvedBy: userId,
        updatedAt: now,
        resolvedRole: null,
      })
      .where(eq(mpDocAccessRequestsTable.id, row.id));

    return { ok: true, status: "declined" } as const;
  }

  const approvedRole =
    opts.role && (opts.role === "viewer" || opts.role === "editor")
      ? opts.role
      : row.requestedRole;

  await db.transaction(async (tx) => {
    await tx
      .insert(mpDocPermissionsTable)
      .values({
        docId: row.docId,
        userId: row.requesterId,
        role: approvedRole,
        grantedBy: userId,
      })
      .onConflictDoUpdate({
        target: [mpDocPermissionsTable.docId, mpDocPermissionsTable.userId],
        set: { role: approvedRole, updatedAt: now, grantedBy: userId },
      });

    await tx
      .update(mpDocAccessRequestsTable)
      .set({
        status: "approved",
        resolvedAt: now,
        resolvedBy: userId,
        updatedAt: now,
        resolvedRole: approvedRole,
      })
      .where(eq(mpDocAccessRequestsTable.id, row.id));
  });

  return { ok: true, status: "approved", role: approvedRole } as const;
};
