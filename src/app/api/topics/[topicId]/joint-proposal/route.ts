export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { generateTopicJointProposal } from "@/actions/proposals/generateTopicJointProposal";
import { getUserId } from "@/actions/users/getUserId";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const rateLimitResult = await checkRateLimit(
      userId,
      5,
      60000,
      "joint-proposal"
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          resetTime: rateLimitResult.resetTime,
        },
        { status: 429 }
      );
    }

    const { topicId: topicIdParam } = await params;
    const topicId = parseInt(topicIdParam);
    if (isNaN(topicId)) {
      return NextResponse.json({ error: "Invalid topic ID" }, { status: 400 });
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

    const body = await req.json();
    const { topicName, selectedDelegates, existingProposal, spaceId } = body;

    if (!topicName || !selectedDelegates || !Array.isArray(selectedDelegates)) {
      return NextResponse.json(
        {
          error:
            "Invalid request format. topicName and selectedDelegates are required.",
        },
        { status: 400 }
      );
    }

    if (selectedDelegates.length === 0) {
      return NextResponse.json(
        { error: "At least one delegate must be selected" },
        { status: 400 }
      );
    }

    for (const delegate of selectedDelegates) {
      if (
        !delegate.userId ||
        !delegate.username ||
        !delegate.rationaleId ||
        !delegate.rationaleTitle
      ) {
        return NextResponse.json(
          { error: "Invalid delegate data structure" },
          { status: 400 }
        );
      }
    }

    const { textStream, proposalResult } = await generateTopicJointProposal({
      topicId,
      topicName,
      selectedDelegates,
      existingProposal,
      spaceId,
    });

    const headers: { [key: string]: string } = {
      "Content-Type": "text/plain",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    };

    try {
      const maxHeaderSize = 7 * 1024;

      const metadataJson = JSON.stringify({
        alignment: proposalResult.alignment,
        metadata: proposalResult.metadata,
        ...(proposalResult.changes && { changes: proposalResult.changes }),
      });

      const encodedMetadata = encodeURIComponent(metadataJson);

      if (encodedMetadata.length <= maxHeaderSize) {
        headers["x-proposal-metadata"] = encodedMetadata;
      } else {
        console.warn(
          `Proposal metadata too large: ${(encodedMetadata.length / 1024).toFixed(2)} KB, skipping header`
        );
      }
    } catch (error) {
      console.error("Error encoding proposal metadata:", error);
    }

    return new NextResponse(textStream, { headers });
  } catch (error) {
    console.error("Error in joint proposal API:", error);
    console.error("API Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : "No stack",
      name: error instanceof Error ? error.name : "No name",
    });

    if (error instanceof Error) {
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

    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message:
          "An unexpected error occurred generating the joint proposal. Please try again.",
        retryable: true,
      },
      { status: 500 }
    );
  }
}
