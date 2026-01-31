import { NextResponse } from "next/server";
import { db } from "@/services/db";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { mpDocUpdatesTable } from "@/db/tables/mpDocUpdatesTable";
import { mpDocPermissionsTable } from "@/db/tables/mpDocPermissionsTable";
import { mpDocShareLinksTable } from "@/db/tables/mpDocShareLinksTable";
import { eq } from "drizzle-orm";
import { getUserId } from "@/actions/users/getUserId";
import { getUserIdOrAnonymous } from "@/actions/users/getUserIdOrAnonymous";
import { isProductionRequest } from "@/utils/hosts";
import { slugify } from "@/utils/slugify";
import { resolveSlugToId, isValidSlugOrId } from "@/utils/slugResolver";
import { logger } from "@/lib/logger";
import { resolveDocAccess, canWriteRole } from "@/services/mpAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: any) {
  if (process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const raw = ctx?.params;
  const url = new URL(_req.url);
  const shareToken = url.searchParams.get("share");

  const userId = await getUserIdOrAnonymous();
  const { id } =
    raw && typeof raw.then === "function" ? await raw : (raw as { id: string });

  if (!isValidSlugOrId(id)) {
    return NextResponse.json(
      { error: "Invalid doc id or slug" },
      { status: 400 }
    );
  }

  const access = await resolveDocAccess(id, { userId, shareToken });
  if (access.status === "not_found") {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  if (access.status !== "ok") {
    return NextResponse.json(
      { error: "Forbidden", requiresAuth: access.requiresAuth ?? false },
      { status: 403 }
    );
  }

  const canonicalId = access.docId;

  // Persist access for authenticated users who used a share link that requires login
  // This prevents losing access when visiting without the share token
  if (access.source === "share" && access.shareLinkId && userId && !userId.startsWith("anon-")) {
    try {
      const linkRows = await db
        .select({ requireLogin: mpDocShareLinksTable.requireLogin })
        .from(mpDocShareLinksTable)
        .where(eq(mpDocShareLinksTable.id, access.shareLinkId))
        .limit(1);

      if (linkRows[0]?.requireLogin) {
        await db
          .insert(mpDocPermissionsTable)
          .values({
            docId: canonicalId,
            userId: userId,
            role: access.role as "editor" | "viewer",
            grantedBy: access.ownerId,
            grantedByShareLinkId: access.shareLinkId,
          })
          .onConflictDoNothing();
      }
    } catch (err) {
      logger.warn("[rationales API] Failed to persist share link access:", err);
    }
  }
  const rows = await db
    .select()
    .from(mpDocsTable)
    .where(eq(mpDocsTable.id, canonicalId))
    .limit(1);
  const doc = rows[0] as any;
  return NextResponse.json({
    id: doc?.id || canonicalId,
    title: doc?.title || null,
    ownerId: doc?.ownerId || null,
    slug: doc?.slug || access.slug || null,
    role: access.role,
    canWrite: canWriteRole(access.role) && !(access.requiresAuthForWrite ?? false),
    source: access.source,
  });
}

export async function DELETE(_req: Request, ctx: any) {
  if (process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = ctx?.params;
  const { id } =
    raw && typeof raw.then === "function" ? await raw : (raw as { id: string });

  if (!isValidSlugOrId(id)) {
    return NextResponse.json(
      { error: "Invalid doc id or slug" },
      { status: 400 }
    );
  }

  const canonicalId = await resolveSlugToId(id);

  try {
    const access = await resolveDocAccess(canonicalId, { userId });
    if (access.status === "not_found")
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    if (access.status !== "ok" || access.role !== "owner")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db
      .delete(mpDocUpdatesTable)
      .where(eq(mpDocUpdatesTable.docId, canonicalId));
    await db.delete(mpDocsTable).where(eq(mpDocsTable.id, canonicalId));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete rationale:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: any) {
  if (process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const url = new URL(req.url);
  const nonProd = !isProductionRequest(url.hostname);
  const userId = nonProd ? await getUserIdOrAnonymous() : await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raw = ctx?.params;
  const { id } =
    raw && typeof raw.then === "function" ? await raw : (raw as { id: string });

  if (!isValidSlugOrId(id)) {
    return NextResponse.json(
      { error: "Invalid doc id or slug" },
      { status: 400 }
    );
  }

  const canonicalId = await resolveSlugToId(id);

  let json: any = null;
  try {
    json = await req.json();
  } catch {}
  const title = json?.title || "";
  try {
    const access = await resolveDocAccess(canonicalId, { userId });
    if (access.status === "not_found") {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    if (access.status !== "ok" || access.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db
      .insert(mpDocsTable)
      .values({ id: canonicalId, ownerId: userId || null })
      .onConflictDoNothing();
    const docRows = await db
      .select({ ownerId: mpDocsTable.ownerId, title: mpDocsTable.title })
      .from(mpDocsTable)
      .where(eq(mpDocsTable.id, canonicalId))
      .limit(1);
    if (docRows.length === 0)
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    if (!docRows[0].ownerId) {
      await db
        .update(mpDocsTable)
        .set({ ownerId: userId })
        .where(eq(mpDocsTable.id, canonicalId));
    }
    if (title && title !== docRows[0].title) {
      const newSlug = slugify(title);
      await db
        .update(mpDocsTable)
        .set({ title, slug: newSlug, updatedAt: new Date() })
        .where(eq(mpDocsTable.id, canonicalId));
      return NextResponse.json({ ok: true, slug: newSlug, id: canonicalId });
    } else if (title) {
      await db
        .update(mpDocsTable)
        .set({ title, updatedAt: new Date() })
        .where(eq(mpDocsTable.id, canonicalId));
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Failed to update title:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
