import { NextRequest, NextResponse } from "next/server";
import { db } from "@/services/db";
import { topicsTable } from "@/db/tables/topicsTable";
import { encodeId } from "@/lib/negation-game/encodeId";
import { checkRateLimit } from "@/lib/rateLimit";
import { createSecureErrorResponse } from "@/lib/security/headers";

const ALLOWED_ORIGINS = [
  "https://forum.scroll.io",
  "https://negationgame.com",
  "https://play.negationgame.com",
  "https://scroll.negationgame.com",
  "https://localhost:3000",
  "http://localhost:3000",
  "https://localhost:3001",
  "http://localhost:3001",
];

function isValidOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return (
    ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".negationgame.com")
  );
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsOrigin = isValidOrigin(origin)
    ? origin!
    : "https://forum.scroll.io";

  try {
    const { sourceUrl, title } = await request.json();

    const rateLimitResult = await checkRateLimit(
      `scroll-${sourceUrl}`,
      50,
      24 * 60 * 60 * 1000,
      "scroll-topic-creation"
    );

    if (!rateLimitResult.allowed) {
      const response = createSecureErrorResponse(
        "Rate limit exceeded. Maximum 50 topics per day.",
        429,
        corsOrigin
      );
      response.headers.set("X-RateLimit-Limit", "50");
      response.headers.set(
        "X-RateLimit-Remaining",
        rateLimitResult.remaining.toString()
      );
      response.headers.set(
        "X-RateLimit-Reset",
        rateLimitResult.resetTime.toString()
      );
      return response;
    }

    function isValidSourceUrl(url: string): boolean {
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

    if (!isValidSourceUrl(sourceUrl)) {
      return createSecureErrorResponse(
        "Invalid source URL. Only forum.scroll.io URLs are allowed.",
        400,
        corsOrigin
      );
    }

    const topicTitle = title && typeof title === "string" ? title : sourceUrl;

    const [topic] = await db
      .insert(topicsTable)
      .values({
        name: topicTitle,
        discourseUrl: sourceUrl,
        space: "scroll",
        restrictedRationaleCreation: false,
      })
      .returning({ id: topicsTable.id });

    const encodedId = encodeId(topic.id);

    return new NextResponse(JSON.stringify({ topicId: encodedId }), {
      status: 201,
      headers: {
        "Access-Control-Allow-Origin": corsOrigin,
        "Content-Type": "application/json",
        "X-RateLimit-Limit": "50",
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
      },
    });
  } catch (error) {
    console.error("Error creating topic:", error);
    return createSecureErrorResponse("Internal server error", 500, corsOrigin);
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsOrigin = isValidOrigin(origin)
    ? origin!
    : "https://forum.scroll.io";

  const response = new NextResponse(null, { status: 200 });
  response.headers.set("Access-Control-Allow-Origin", corsOrigin);
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");

  return response;
}
