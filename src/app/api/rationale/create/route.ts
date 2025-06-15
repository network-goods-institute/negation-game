export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { generateRationaleCreationResponse } from "@/actions/ai/generateRationaleCreationResponse";
import { getUserId } from "@/actions/users/getUserId";

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { messages, context } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }

    const { textStream, suggestedGraph } =
      await generateRationaleCreationResponse(messages, context);

    return new NextResponse(textStream, {
      headers: {
        "Content-Type": "text/plain",
        "x-graph": JSON.stringify(suggestedGraph),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error in rationale creation API:", error);

    if (error instanceof Error) {
      // Handle specific AI service errors
      if (
        error.message.includes("rate limit") ||
        error.message.includes("busy") ||
        error.message.includes("quota")
      ) {
        return NextResponse.json(
          {
            error: "AI_RATE_LIMITED",
            message: error.message,
            retryable: true,
          },
          { status: 429 }
        );
      }

      if (
        error.message.includes("timeout") ||
        error.message.includes("504") ||
        error.message.includes("gateway")
      ) {
        return NextResponse.json(
          {
            error: "AI_TIMEOUT",
            message: "AI service timed out. Please try again.",
            retryable: true,
          },
          { status: 504 }
        );
      }

      if (error.message.includes("conversation is too long")) {
        return NextResponse.json(
          {
            error: "CONTEXT_TOO_LONG",
            message: error.message,
            retryable: false,
          },
          { status: 413 }
        );
      }

      if (
        error.message.includes("blocked") ||
        error.message.includes("safety")
      ) {
        return NextResponse.json(
          {
            error: "CONTENT_BLOCKED",
            message: error.message,
            retryable: false,
          },
          { status: 400 }
        );
      }

      if (error.message.includes("Authentication required")) {
        return NextResponse.json(
          { error: "AUTHENTICATION_REQUIRED" },
          { status: 401 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "An unexpected error occurred. Please try again.",
        retryable: true,
      },
      { status: 500 }
    );
  }
}
