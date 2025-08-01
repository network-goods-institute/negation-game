import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { timingSafeEqual } from "crypto";
import { createSecureErrorResponse } from "@/lib/security/headers";

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

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIP) {
    return realIP.trim();
  }

  return "unknown";
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsOrigin = isValidOrigin(origin)
    ? origin!
    : "https://forum.scroll.io";

  const clientIP = getClientIP(request);

  const rateLimitResult = await checkRateLimit(
    `embed-auth-${clientIP}`,
    5,
    15 * 60 * 1000, // 15 minutes
    "embed-auth"
  );

  if (!rateLimitResult.allowed) {
    const response = createSecureErrorResponse(
      "Too many authentication attempts. Please try again later.",
      429,
      corsOrigin
    );
    response.headers.set("X-RateLimit-Limit", "5");
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

  try {
    const body = await request.json();

    if (!body || typeof body.password !== "string") {
      return createSecureErrorResponse("Invalid request body", 400, corsOrigin);
    }

    const { password } = body;

    if (password.length > 100) {
      return createSecureErrorResponse("Password too long", 400, corsOrigin);
    }

    const correctPassword = process.env.EMBED_TEST_PASSWORD;

    if (!correctPassword) {
      console.error("EMBED_TEST_PASSWORD environment variable not set");
      return createSecureErrorResponse(
        "Server configuration error",
        500,
        corsOrigin
      );
    }

    let isPasswordValid = false;
    try {
      if (password.length === correctPassword.length) {
        const passwordBuffer = Buffer.from(password, "utf8");
        const correctPasswordBuffer = Buffer.from(correctPassword, "utf8");
        isPasswordValid = timingSafeEqual(
          passwordBuffer,
          correctPasswordBuffer
        );
      }
    } catch (error) {
      isPasswordValid = false;
    }

    if (isPasswordValid) {
      const response = NextResponse.json({
        success: true,
        message: "Authentication successful",
      });

      response.headers.set("Access-Control-Allow-Origin", corsOrigin);
      response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type");
      response.headers.set("X-RateLimit-Limit", "5");
      response.headers.set(
        "X-RateLimit-Remaining",
        rateLimitResult.remaining.toString()
      );
      response.headers.set(
        "X-RateLimit-Reset",
        rateLimitResult.resetTime.toString()
      );

      return response;
    } else {
      console.warn(
        `Failed authentication attempt from IP: ${clientIP}, Origin: ${origin}`
      );

      const response = createSecureErrorResponse(
        "Invalid credentials",
        401,
        corsOrigin
      );

      response.headers.set("X-RateLimit-Limit", "5");
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
  } catch (error) {
    console.error("Auth error:", error);
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
