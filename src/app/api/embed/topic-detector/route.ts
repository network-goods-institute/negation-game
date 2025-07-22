import { NextRequest, NextResponse } from "next/server";
import { db } from "@/services/db";
import { topicsTable } from "@/db/tables/topicsTable";
import {
  viewpointsTable,
  activeViewpointsFilter,
} from "@/db/tables/viewpointsTable";
import { eq, and } from "drizzle-orm";

const ALLOWED_ORIGINS = [
  "https://forum.scroll.io",
  "https://negationgame.com",
  "https://play.negationgame.com",
  "https://scroll.negationgame.com",
  "https://localhost:3000",
  "http://localhost:3000",
];

function isValidOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return (
    ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".negationgame.com")
  );
}

function isValidScrollUrl(url: string): boolean {
  return Boolean(url && url.includes("forum.scroll.io"));
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
      const response = NextResponse.json(
        { error: "Missing source parameter" },
        { status: 400 }
      );
      response.headers.set("Access-Control-Allow-Origin", corsOrigin);
      response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type");
      return response;
    }

    if (!isValidScrollUrl(sourceUrl)) {
      const response = NextResponse.json(
        { error: "Invalid source URL. Only forum.scroll.io URLs are allowed." },
        { status: 400 }
      );
      response.headers.set("Access-Control-Allow-Origin", corsOrigin);
      response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type");
      return response;
    }

    const topic = await db
      .select({
        id: topicsTable.id,
        name: topicsTable.name,
        space: topicsTable.space,
      })
      .from(topicsTable)
      .where(eq(topicsTable.discourseUrl, sourceUrl))
      .limit(1);

    if (topic.length === 0) {
      const response = NextResponse.json({
        found: false,
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
      topicId: topicData.id,
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
    const response = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    return response;
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsOrigin = isValidOrigin(origin)
    ? origin!
    : "https://forum.scroll.io";

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
