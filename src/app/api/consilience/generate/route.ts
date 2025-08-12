import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { geminiService } from "@/services/ai/geminiService";
import { db } from "@/services/db";
import { viewpointsTable, topicsTable } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getDiscourseContent } from "@/actions/search/getDiscourseContent";
import { z } from "zod";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bodySchema = z.object({
      topicId: z.number().int().positive(),
      selectedUserIds: z.array(z.string()).min(1).max(10),
      manualOriginal: z.string().max(50000).optional().nullable(),
    });

    const parsedBody = bodySchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { topicId, selectedUserIds, manualOriginal } = parsedBody.data;

    const topic = await db.query.topicsTable.findFirst({
      where: eq(topicsTable.id, topicId),
    });

    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    const rationales = await db
      .select({
        id: viewpointsTable.id,
        userId: viewpointsTable.createdBy,
        title: viewpointsTable.title,
        description: viewpointsTable.description,
        graph: viewpointsTable.graph,
      })
      .from(viewpointsTable)
      .where(
        and(
          eq(viewpointsTable.topicId, topicId),
          inArray(viewpointsTable.createdBy, selectedUserIds),
          eq(viewpointsTable.isActive, true)
        )
      );

    if (rationales.length < 1) {
      return NextResponse.json(
        {
          error: "Could not find published rationales from selected users",
        },
        { status: 400 }
      );
    }

    let discourseContent =
      typeof manualOriginal === "string" && manualOriginal.trim().length > 0
        ? manualOriginal.trim()
        : "";
    if (topic.discourseUrl) {
      try {
        if (!discourseContent) {
          const content = await getDiscourseContent(topic.discourseUrl, {
            firstPostOnly: true,
          });
          discourseContent = content || "";
        }
      } catch (error) {
        console.warn("Could not fetch discourse content:", error);
      }
    }

    if (!discourseContent || discourseContent.trim().length === 0) {
      return NextResponse.json(
        {
          code: "manual_original_required",
          message:
            "Could not fetch the original discourse post after multiple attempts. Please paste the original proposal text and try again.",
        },
        { status: 422 }
      );
    }

    const rationaleInputs = rationales
      .map(
        (r, i) =>
          `### DELEGATE ${i + 1}
TITLE: ${r.title}
RATIONALE:
${r.description}`
      )
      .join("\n\n");

    const systemPrompt = `You are an expert editor generating a merged proposal.

INPUTS
- ORIGINAL (first post text, immutable baseline):\n${discourseContent || ""}
${rationaleInputs}

TASK
Produce an updated proposal that reflects all selected delegates' perspectives, and a machine-readable list of diffs from ORIGINAL.

RESPONSE FORMAT (STRICT JSON)
{
  "proposal": "<full updated proposal markdown>",
  "summary": "<1-2 sentences summary>",
  "reasoning": "<why these changes satisfy both delegates>",
  "diffs": [
    { "type": "Addition" | "Modification" | "Removal", "originalText": "<string optional>", "newText": "<string optional>", "explanation": "<string>" }
  ]
}

RULES
- Return ONLY JSON. No prose outside JSON.
- Capitalize diff types exactly as Addition | Modification | Removal.
- Start from ORIGINAL. Preserve all unchanged content IDENTICALLY (do not paraphrase).
- Only change text necessary to reflect the selected delegates' perspectives, referencing the DELEGATE blocks.
- Diffs must be granular and human-auditable.
- For Modification diffs, include both originalText (verbatim from ORIGINAL) and newText.
- For Removal diffs, include originalText (verbatim from ORIGINAL) and omit newText.
- For Addition diffs, include newText and keep additions minimal; do not re-state entire sections. Additions should be anchored ("insert after ..." in explanation) when feasible.
- The final "proposal" MUST equal ORIGINAL with these diffs applied. If no changes are needed, return ORIGINAL as proposal and an empty diffs array.
- NEVER delete or rewrite the entire proposal. Limit changes to specific sentences/sections with clear explanations.`;

    const encoder = new TextEncoder();
    const maxBytes = 512 * 1024; // 512KB safety cap
    let sentBytes = 0;
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              '{"status":"starting","message":"Preparing inputs"}\n'
            )
          );

          if (!discourseContent) {
            controller.enqueue(
              encoder.encode(
                '{"status":"warning","message":"Original discourse content missing. Using manual input if provided."}\n'
              )
            );
          } else {
            const chunk = JSON.stringify({
              status: "original",
              original: discourseContent,
            });
            controller.enqueue(encoder.encode(chunk + "\n"));
          }

          const textStream = await geminiService.generateStream(systemPrompt, {
            truncateHistory: false,
          });

          const reader = textStream.getReader();
          let rawOut = "";
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const v: any = value as any;
            if (typeof v === "string") {
              rawOut += v;
              const chunk = encoder.encode(v);
              sentBytes += chunk.byteLength;
              if (sentBytes > maxBytes)
                throw new Error("stream_limit_exceeded");
              controller.enqueue(chunk);
            } else if (v && typeof v.byteLength === "number") {
              rawOut += decoder.decode(v as Uint8Array, { stream: true });
              sentBytes += (v as Uint8Array).byteLength;
              if (sentBytes > maxBytes)
                throw new Error("stream_limit_exceeded");
              controller.enqueue(v as Uint8Array);
            } else {
              const asString = String(v ?? "");
              rawOut += asString;
              const chunk = encoder.encode(asString);
              sentBytes += chunk.byteLength;
              if (sentBytes > maxBytes)
                throw new Error("stream_limit_exceeded");
              controller.enqueue(chunk);
            }
          }

          try {
            let cleanText = rawOut.trim();
            if (cleanText.startsWith("```json")) {
              cleanText = cleanText
                .replace(/^```json\s*/, "")
                .replace(/\s*```$/, "");
            } else if (cleanText.startsWith("```")) {
              cleanText = cleanText
                .replace(/^```\s*/, "")
                .replace(/\s*```$/, "");
            }
            const parsed = JSON.parse(cleanText);
            console.log("[consilience-generate] output", {
              hasProposal: !!parsed?.proposal,
              proposalLen: parsed?.proposal
                ? String(parsed.proposal).length
                : 0,
              diffsCount: Array.isArray(parsed?.diffs)
                ? parsed.diffs.length
                : 0,
              summaryPreview: parsed?.summary
                ? String(parsed.summary).slice(0, 180)
                : null,
            });
          } catch {}

          controller.close();
        } catch (error: any) {
          console.error("Error in stream:", error);
          if (error?.message === "stream_limit_exceeded") {
            controller.enqueue(
              encoder.encode(
                '{"status":"error","code":"stream_limit_exceeded"}\n'
              )
            );
          }
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "X-Topic-Id": topicId.toString(),
        "X-Topic-Name": encodeURIComponent(topic.name),
        "X-Selected-Users": encodeURIComponent(JSON.stringify(selectedUserIds)),
      },
    });
  } catch (error) {
    console.error("Error generating consilience:", error);
    return NextResponse.json(
      { error: "Failed to generate consilience" },
      { status: 500 }
    );
  }
}
