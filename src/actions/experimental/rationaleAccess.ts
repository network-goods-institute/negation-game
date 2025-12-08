"use server";

import { db } from "@/services/db";
import { getUserId } from "@/actions/users/getUserId";
import { mpDocShareLinksTable } from "@/db/tables/mpDocShareLinksTable";
import { mpDocPermissionsTable } from "@/db/tables/mpDocPermissionsTable";
import { resolveDocAccess, canWriteRole } from "@/services/mpAccess";
import { resolveSlugToId, isValidSlugOrId } from "@/utils/slugResolver";
import { nanoid } from "nanoid";
import { and, desc, eq } from "drizzle-orm";

type ShareRole = "viewer" | "editor";

const assertOwnerAccess = async (docId: string, userId: string) => {
  const access = await resolveDocAccess(docId, { userId });
  if (access.status === "not_found") throw new Error("Document not found");
  if (access.status !== "ok" || access.role !== "owner") {
    throw new Error("Forbidden");
  }
  return access;
};

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

  const token = `sl-${nanoid(16)}`;
  let expiresAtDate: Date | null = null;
  if (opts.expiresAt) {
    expiresAtDate = new Date(opts.expiresAt);
    if (isNaN(expiresAtDate.getTime())) {
      throw new Error("Invalid expiry date");
    }
    if (expiresAtDate <= new Date()) {
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

export const listShareLinks = async (docId: string) => {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  if (!isValidSlugOrId(docId)) throw new Error("Invalid doc id or slug");

  const canonicalId = await resolveSlugToId(docId);
  await assertOwnerAccess(canonicalId, userId);

  const now = new Date();
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
    .orderBy(desc(mpDocShareLinksTable.createdAt));

  return rows.filter((row) => {
    if (row.disabledAt) return false;
    if (row.expiresAt && row.expiresAt <= now) return false;
    return true;
  });
};

export const revokeShareLink = async (docId: string, linkId: string) => {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  if (!isValidSlugOrId(docId)) throw new Error("Invalid doc id or slug");

  const canonicalId = await resolveSlugToId(docId);
  await assertOwnerAccess(canonicalId, userId);

  await db
    .update(mpDocShareLinksTable)
    .set({ disabledAt: new Date() })
    .where(and(eq(mpDocShareLinksTable.id, linkId), eq(mpDocShareLinksTable.docId, canonicalId)));

  return { ok: true } as const;
};

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

export const listCollaborators = async (docId: string) => {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  if (!isValidSlugOrId(docId)) throw new Error("Invalid doc id or slug");

  const canonicalId = await resolveSlugToId(docId);
  const access = await resolveDocAccess(canonicalId, { userId });
  if (access.status !== "ok") throw new Error("Forbidden");
  if (!canWriteRole(access.role)) throw new Error("Forbidden");

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
    .orderBy(desc(mpDocPermissionsTable.createdAt));

  return rows;
};
