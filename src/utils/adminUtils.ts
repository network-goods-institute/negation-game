import { db } from "@/services/db";
import { usersTable, spaceAdminsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function isUserSiteAdmin(userId: string): Promise<boolean> {
  const user = await db
    .select({ siteAdmin: usersTable.siteAdmin })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  return user[0]?.siteAdmin ?? false;
}

export async function isUserSpaceAdmin(
  userId: string,
  spaceId: string
): Promise<boolean> {
  const isSiteAdmin = await isUserSiteAdmin(userId);
  if (isSiteAdmin) return true;

  const spaceAdmin = await db
    .select()
    .from(spaceAdminsTable)
    .where(
      and(
        eq(spaceAdminsTable.userId, userId),
        eq(spaceAdminsTable.spaceId, spaceId)
      )
    )
    .limit(1);

  return spaceAdmin.length > 0;
}

export async function requireSiteAdmin(userId: string): Promise<void> {
  const isSiteAdmin = await isUserSiteAdmin(userId);
  if (!isSiteAdmin) {
    throw new Error("Site admin access required");
  }
}

export async function requireSpaceAdmin(
  userId: string,
  spaceId: string
): Promise<void> {
  const isAdmin = await isUserSpaceAdmin(userId, spaceId);
  if (!isAdmin) {
    throw new Error("Space admin access required");
  }
}
