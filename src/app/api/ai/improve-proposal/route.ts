import { NextRequest, NextResponse } from "next/server";
import { geminiService } from "@/services/ai/geminiService";
import { getUserId } from "@/actions/users/getUserId";
import { checkRateLimitStrict } from "@/lib/rateLimit";
import { improveProposalBodySchema } from "./schema";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await checkRateLimitStrict(
      userId,
      5,
      60000,
      "ai-improve-proposal"
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const contentLength = request.headers.get("content-length");
    const maxPayloadSize = 1024 * 1024;
    if (contentLength && parseInt(contentLength) > maxPayloadSize) {
      return NextResponse.json(
        { error: "Request payload too large" },
        { status: 413 }
      );
    }

    const json = await request.json();
    const bodyResult = improveProposalBodySchema.safeParse(json);
    if (!bodyResult.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    const { currentText, instruction, originalText, topicId, selectedUserIds } =
      bodyResult.data;

    if (!currentText || !instruction) {
      return NextResponse.json(
        { error: "Current text and instruction are required" },
        { status: 400 }
      );
    }

    let delegatesBlock = "";
    if (
      topicId &&
      Array.isArray(selectedUserIds) &&
      selectedUserIds.length > 0
    ) {
      delegatesBlock = `\nDELEGATES: ${selectedUserIds.join(", ")} (context available from original generation)`;
    }

    const systemPrompt = `You are an expert editor refining a merged proposal with machine-readable diffs.

INPUTS
- ORIGINAL (immutable baseline, first post text):\n${originalText || ""}
- CURRENT PROPOSAL (markdown):\n${currentText}
- USER INSTRUCTION: ${instruction}
${delegatesBlock}

TASK
Return STRICT JSON with an updated proposal and a list of diffs to transform CURRENT into a new version.

RESPONSE FORMAT (STRICT JSON)
{
  "proposal": "<full updated proposal markdown>",
  "summary": "<1-2 sentences summary>",
  "reasoning": "<why these changes better satisfy the delegates per instruction>",
  "diffs": [
    { "type": "Addition" | "Modification" | "Removal", "originalText": "<string optional>", "newText": "<string optional>", "explanation": "<string>" }
  ]
}

RULES
- Return ONLY JSON. No prose outside JSON.
- Capitalize diff types exactly as Addition | Modification | Removal.
- Start from ORIGINAL. Preserve all unchanged content IDENTICALLY (do not paraphrase).
- Only change text necessary per instruction; avoid global rewrites.
- For Modification diffs, include originalText (verbatim from ORIGINAL) and newText.
- For Removal diffs, include originalText (verbatim from ORIGINAL) and omit newText.
- For Addition diffs, include concise newText; do not restate entire sections.
- The final "proposal" MUST equal ORIGINAL with these diffs applied to bring it in line with CURRENT + instruction.`;

    const textStream = await geminiService.generateStream(systemPrompt, {
      truncateHistory: false,
    });

    const reader = textStream.getReader();
    let improvedText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      improvedText += value;
    }

    let cleanText = improvedText.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(cleanText);
    } catch (_) {
      parsedResponse = {
        proposal: improvedText,
        summary: "Updated proposal",
        reasoning: "AI returned unstructured output; treating as full proposal",
        diffs: [],
      };
    }

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error("Error improving proposal:", error);
    return NextResponse.json(
      { error: "Failed to improve proposal" },
      { status: 500 }
    );
  }
}
