import { NextRequest, NextResponse } from "next/server";

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
    const { password } = await request.json();

    const correctPassword = process.env.EMBED_TEST_PASSWORD;

    if (!correctPassword) {
      console.error("EMBED_TEST_PASSWORD environment variable not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (password === correctPassword) {
      const response = NextResponse.json({ success: true });

      response.headers.set("Access-Control-Allow-Origin", corsOrigin);
      response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type");

      return response;
    } else {
      const response = NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );

      response.headers.set("Access-Control-Allow-Origin", corsOrigin);
      response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type");

      return response;
    }
  } catch (error) {
    console.error("Auth error:", error);
    const response = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );

    response.headers.set("Access-Control-Allow-Origin", corsOrigin);
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
