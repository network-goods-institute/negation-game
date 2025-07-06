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

    const contentLength = req.headers.get("content-length");
    const maxPayloadSize = 1024 * 1024;

    if (contentLength && parseInt(contentLength) > maxPayloadSize) {
      console.warn(`Request payload too large: ${contentLength} bytes`);
      return NextResponse.json(
        { error: "Request payload too large" },
        { status: 413 }
      );
    }

    const { messages, context } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }

    const { textStream, suggestedGraph, commands } =
      await generateRationaleCreationResponse(messages, context);

    const headers: { [key: string]: string } = {
      "Content-Type": "text/plain",
      "Cache-Control": "no-cache",
    };

    const maxHeaderSize = 7 * 1024; // 7KB limit
    let graphHeaderValue = "";
    let commandsHeaderValue = "";

    try {
      const graphJson = JSON.stringify(suggestedGraph);
      const encodedGraph = encodeURIComponent(graphJson);

      if (encodedGraph.length > maxHeaderSize) {
        console.warn(
          `Graph header too large: ${(encodedGraph.length / 1024).toFixed(2)} KB, skipping header`
        );
      } else {
        headers["x-graph"] = encodedGraph;
        graphHeaderValue = encodedGraph;
      }

      if (commands && commands.length > 0) {
        const commandsJson = JSON.stringify(commands);

        const encodedCommands = encodeURIComponent(commandsJson);

        if (encodedCommands.length > maxHeaderSize) {
          console.warn(
            `Commands header too large: ${(encodedCommands.length / 1024).toFixed(2)} KB, skipping header`
          );
        } else {
          headers["x-commands"] = encodedCommands;
          commandsHeaderValue = encodedCommands;
        }
      }
    } catch (error) {
      console.error("Error encoding headers:", error);
    }

    return new NextResponse(textStream, { headers });
  } catch (error) {
    console.error("Error in rationale creation API:", error);
    console.error("API Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "No stack",
      name: error instanceof Error ? error.name : "No name",
      constructor:
        error instanceof Error ? error.constructor.name : "No constructor",
      cause: error instanceof Error ? error.cause : "No cause",
    });

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
