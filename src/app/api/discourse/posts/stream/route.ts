// yes i'm making up this for user feedback lol

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const discourseUrl = searchParams.get("url");

  if (!username || !discourseUrl) {
    return NextResponse.json(
      { error: "Missing username or discourse url" },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  let streamClosed = false;
  const stream = new ReadableStream({
    start(controller) {
      try {
        if (!streamClosed) {
          // 1. Stream Started
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ progress: 10 })}\n\n`)
          );

          // 2. Simulating Fetch (short delay)
          setTimeout(() => {
            if (!streamClosed) {
              try {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ progress: 50 })}\n\n`
                  )
                );

                // 3. Simulating Completion (another short delay)
                setTimeout(() => {
                  if (!streamClosed) {
                    try {
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ progress: 100, done: true })}\n\n`
                        )
                      );
                      controller.close();
                      streamClosed = true;
                    } catch (error) {
                      console.error(
                        "[Discourse API Stream] Error sending completion message:",
                        error
                      );
                      if (!streamClosed) controller.close();
                      streamClosed = true;
                    }
                  }
                }, 800); // Delay for completion message
              } catch (error) {
                console.error(
                  "[Discourse API Stream] Error sending fetch message:",
                  error
                );
                if (!streamClosed) controller.close();
                streamClosed = true;
              }
            }
          }, 500); // Delay for fetch message
        }
      } catch (error) {
        console.error(
          "[Discourse API Stream] Error sending initial message:",
          error
        );
        if (!streamClosed) controller.close();
        streamClosed = true;
      }
    },
    cancel() {
      console.log("[Discourse API Stream] Stream cancelled by client.");
      streamClosed = true;
    },
  });

  // Note: Removed the external setTimeout and setInterval as the logic is now within the stream controller

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
