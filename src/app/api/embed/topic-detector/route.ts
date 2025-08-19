import { NextRequest, NextResponse } from "next/server";
import { db } from "@/services/db";
import { topicsTable } from "@/db/tables/topicsTable";
import {
  viewpointsTable,
  activeViewpointsFilter,
} from "@/db/tables/viewpointsTable";
import { eq, and } from "drizzle-orm";
import { createSecureErrorResponse } from "@/lib/security/headers";
import { encodeId } from "@/lib/negation-game/encodeId";

const isDev = process.env.NODE_ENV !== "production";
const ALLOWED_ORIGINS = [
  "https://forum.scroll.io",
  "https://negationgame.com",
  "https://play.negationgame.com",
  "https://scroll.negationgame.com",
];

function isValidOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".negationgame.com"))
    return true;
  if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\\d+)?$/i.test(origin))
    return true;
  return false;
}

function isValidScrollUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (url.length > 2048) return false;

  try {
    const parsedUrl = new URL(url);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return false;
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    if (hostname === "forum.scroll.io") return true;

    if (
      process.env.NODE_ENV !== "production" &&
      (hostname === "localhost" || hostname === "127.0.0.1")
    ) {
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceUrl = searchParams.get("source");
    const origin = request.headers.get("origin");

    const corsOrigin = isValidOrigin(origin)
      ? origin!
      : "https://forum.scroll.io";

    if (!sourceUrl) {
      return createSecureErrorResponse(
        "Missing source parameter",
        400,
        corsOrigin
      );
    }

    const rationaleMatch = sourceUrl.match(/\/rationale\/([a-zA-Z0-9_-]+)/);
    if (rationaleMatch) {
      const rationaleId = rationaleMatch[1];
      const vp = await db
        .select({ topicId: viewpointsTable.topicId })
        .from(viewpointsTable)
        .where(and(eq(viewpointsTable.id, rationaleId), activeViewpointsFilter))
        .limit(1);

      const topicId = vp?.[0]?.topicId as number | null | undefined;
      if (topicId && Number.isFinite(topicId)) {
        const response = NextResponse.json({
          found: true,
          type: "topic",
          topicId: encodeId(topicId as number),
          hasRationales: true,
          rationaleId,
        });
        response.headers.set("Access-Control-Allow-Origin", corsOrigin);
        response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        response.headers.set("Access-Control-Allow-Headers", "Content-Type");
        return response;
      }

      const response = NextResponse.json({
        found: true,
        type: "rationale",
        rationaleId: rationaleId,
        hasRationales: true,
      });
      response.headers.set("Access-Control-Allow-Origin", corsOrigin);
      response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type");
      return response;
    }

    if (!isValidScrollUrl(sourceUrl)) {
      return createSecureErrorResponse(
        "Invalid source URL. Only forum.scroll.io URLs are allowed.",
        400,
        corsOrigin
      );
    }

    const topic = await db
      .select({
        id: topicsTable.id,
        name: topicsTable.name,
        space: topicsTable.space,
      })
      .from(topicsTable)
      .where(
        and(
          eq(topicsTable.discourseUrl, sourceUrl),
          eq(topicsTable.space, "scroll")
        )
      )
      .limit(1);

    if (topic.length === 0) {
      const response = NextResponse.json({
        found: false,
        type: "topic",
        topicId: null,
        hasRationales: false,
      });

      response.headers.set("Access-Control-Allow-Origin", corsOrigin);
      response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type");

      return response;
    }

    const topicData = topic[0];

    const rationales = await db
      .select({ id: viewpointsTable.id })
      .from(viewpointsTable)
      .where(
        and(eq(viewpointsTable.topicId, topicData.id), activeViewpointsFilter)
      )
      .limit(1);

    const response = NextResponse.json({
      found: true,
      type: "topic",
      topicId: encodeId(topicData.id),
      title: topicData.name,
      spaceId: topicData.space,
      hasRationales: rationales.length > 0,
    });

    response.headers.set("Access-Control-Allow-Origin", corsOrigin);
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");

    return response;
  } catch (error) {
    console.error("Topic detector error:", error);
    return createSecureErrorResponse(
      "Internal server error",
      500,
      "https://forum.scroll.io"
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsOrigin = isValidOrigin(origin)
    ? origin!
    : "https://forum.scroll.io";

  const response = new NextResponse(null, { status: 200 });
  response.headers.set("Access-Control-Allow-Origin", corsOrigin);
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");

  return response;
}
