import { NextResponse } from "next/server";
import { getUserIdOrAnonymous } from "@/actions/users/getUserIdOrAnonymous";
import { createHash } from "crypto";
import { logger } from "@/lib/logger";
import { resolveDocAccess, canWriteRole } from "@/services/mpAccess";
import { isValidSlugOrId } from "@/utils/slugResolver";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/services/db";
import { mpDocPermissionsTable } from "@/db/tables/mpDocPermissionsTable";
import { mpDocShareLinksTable } from "@/db/tables/mpDocShareLinksTable";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  if (process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const hostname = url.hostname;

  let body: any = null;
  try {
    body = await req.json();
  } catch {}

  const docId = body?.docId as string | undefined;
  const shareToken = body?.shareToken as string | undefined;
  if (!docId || !isValidSlugOrId(docId)) {
    return NextResponse.json({ error: "Invalid document" }, { status: 400 });
  }

  const userId = await getUserIdOrAnonymous();

  // Rate limit: 100 token requests per minute per user
  const rateLimit = await checkRateLimit(userId, 100, 60000, "yjs-token");
  if (!rateLimit.allowed) {
    const res = NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
    res.headers.set("X-RateLimit-Limit", "100");
    res.headers.set("X-RateLimit-Remaining", "0");
    res.headers.set("X-RateLimit-Reset", String(rateLimit.resetTime));
    res.headers.set(
      "Retry-After",
      String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000))
    );
    return res;
  }

  const secret = process.env.YJS_AUTH_SECRET;
  if (!secret) {
    logger.error("YJS_AUTH_SECRET not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const expiry = timestamp + 60 * 60 * 8;
  const access = await resolveDocAccess(docId, { userId, shareToken });
  if (access.status !== "ok") {
    const status =
      access.status === "not_found" ? 404 : access.requiresAuth ? 401 : 403;
    return NextResponse.json({ error: "Forbidden" }, { status });
  }

  // Persist access for authenticated users who used a share link that requires login
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
            docId: access.docId,
            userId: userId,
            role: access.role as "editor" | "viewer",
            grantedBy: access.ownerId,
            grantedByShareLinkId: access.shareLinkId,
          })
          .onConflictDoNothing();
      }
    } catch (err) {
      logger.warn("[yjs token] Failed to persist share link access:", err);
    }
  }

  const readonly = access.requiresAuthForWrite
    ? true
    : !canWriteRole(access.role);

  const payload = JSON.stringify({
    userId: userId || "anon",
    docId: access.docId,
    expiry,
    mode: readonly ? "readonly" : "rw",
  });
  const payloadB64 = Buffer.from(payload).toString("base64");
  const signature = createHash("sha256")
    .update(payloadB64 + secret)
    .digest("hex");

  const token = `${payloadB64}.${signature}`;

  const res = NextResponse.json({
    token,
    expiresAt: expiry * 1000,
  });
  try {
    res.headers.set("x-yjs-expires-at", String(expiry * 1000));
    res.headers.set("cache-control", "no-store");
    res.headers.set("X-RateLimit-Limit", "100");
    res.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
    res.headers.set("X-RateLimit-Reset", String(rateLimit.resetTime));
  } catch {}
  return res;
}
