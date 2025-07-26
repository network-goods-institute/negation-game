import { NextRequest, NextResponse } from "next/server";
import { db } from "@/services/db";
import { topicsTable } from "@/db/tables/topicsTable";
import { encodeId } from "@/lib/negation-game/encodeId";
import { checkRateLimit } from "@/lib/rateLimit";

const ALLOWED_ORIGINS = [
  "https://forum.scroll.io",
  "https://negationgame.com",
  "https://play.negationgame.com",
  "https://scroll.negationgame.com",
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
      return new NextResponse(
        JSON.stringify({
          error: "Rate limit exceeded. Maximum 50 topics per day.",
          resetTime: rateLimitResult.resetTime,
        }),
        {
          status: 429,
          headers: {
            "Access-Control-Allow-Origin": corsOrigin,
            "Content-Type": "application/json",
            "X-RateLimit-Limit": "50",
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
          },
        }
      );
    }

    const isValidUrl =
      sourceUrl &&
      typeof sourceUrl === "string" &&
      (sourceUrl.includes("forum.scroll.io") ||
        (process.env.NODE_ENV !== "production" &&
          sourceUrl.includes("localhost")));

    if (!isValidUrl) {
      return new NextResponse(JSON.stringify({ error: "Invalid source URL" }), {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": corsOrigin,
          "Content-Type": "application/json",
        },
      });
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
    return new NextResponse(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": corsOrigin,
          "Content-Type": "application/json",
        },
      }
    );
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
