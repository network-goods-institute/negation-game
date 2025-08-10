import { NextRequest, NextResponse } from "next/server";
import { geminiService } from "@/services/ai/geminiService";
import { getUserId } from "@/actions/users/getUserId";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentText, instruction, originalText, topicId, selectedUserIds } =
      await request.json();

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

    let parsed: any;
    try {
      parsed = JSON.parse(cleanText);
    } catch (_) {
      parsed = {
        proposal: improvedText,
        summary: "Updated proposal",
        reasoning: "AI returned unstructured output; treating as full proposal",
        diffs: [],
      };
    }

    try {
      console.log("[improve-proposal] output", {
        hasProposal: !!parsed?.proposal,
        proposalLen: parsed?.proposal ? String(parsed.proposal).length : 0,
        diffsCount: Array.isArray(parsed?.diffs) ? parsed.diffs.length : 0,
        summaryPreview: parsed?.summary
          ? String(parsed.summary).slice(0, 180)
          : null,
      });
    } catch {}

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Error improving proposal:", error);
    return NextResponse.json(
      { error: "Failed to improve proposal" },
      { status: 500 }
    );
  }
}
