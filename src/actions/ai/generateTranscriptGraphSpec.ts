"use server";

import { geminiService } from "@/services/ai/geminiService";
import {
  buildFallbackTranscriptGraphSpec,
  normalizeTranscriptGraphSpec,
  type TranscriptGraphSpec,
} from "@/lib/experiment/multiplayer/transcriptGraph";
import { logger } from "@/lib/logger";

const MAX_TRANSCRIPT_INPUT_CHARS = 24000;

const readStreamAsText = async (stream: ReadableStream<string>) => {
  const reader = stream.getReader();
  let content = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    content += value;
  }
  return content.trim();
};

const extractJsonObject = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fenced = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  return null;
};

export async function generateTranscriptGraphSpec(
  transcriptText: string
): Promise<TranscriptGraphSpec> {
  const safeText = `${transcriptText || ""}`.trim();
  const fallback = buildFallbackTranscriptGraphSpec(safeText);
  if (!safeText) return fallback;

  const truncatedTranscript = safeText.slice(0, MAX_TRANSCRIPT_INPUT_CHARS);
  const prompt = `Convert this transcript into a graph seed spec.
Return only strict JSON.
Schema:
{
  "title": "short neutral topic for the board",
  "points": ["claim one", "claim two", "claim three"],
  "relations": [
    { "sourceIndex": 0, "targetIndex": null, "type": "option" },
    { "sourceIndex": 1, "targetIndex": 0, "type": "support" },
    { "sourceIndex": 2, "targetIndex": 1, "type": "negation" }
  ]
}

Rules:
- title must be <= 120 characters
- points should usually be 6 to 14 unique entries when transcript content supports it
- for short transcripts, return at least 4 strong points
- each point should be a concise claim between 10 and 240 characters
- relations should use only types: option, support, negation
- every point index should appear once as a relation source
- option relations must use targetIndex: null
- support/negation relations must target another point index
- include at least 2 option relations
- include at least 2 support and 2 negation relations when enough points exist
- points must capture concrete tradeoffs, constraints, objections, and unresolved questions from the transcript
- avoid generic placeholders like "claim one" or "point two"
- avoid self-links and cycles
- do not include markdown or explanation
- use language from the transcript where possible

Transcript:
${truncatedTranscript}`;

  try {
    const responseStream = await geminiService.generateStream(
      [
        {
          role: "system",
          content:
            "You convert transcripts into concise argument graph seed specs.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      { truncateHistory: false }
    );

    const raw = await readStreamAsText(responseStream);
    const json = extractJsonObject(raw);
    if (!json) return fallback;
    const parsed = JSON.parse(json);
    return normalizeTranscriptGraphSpec(parsed, fallback);
  } catch (error) {
    logger.warn("[generateTranscriptGraphSpec] Falling back to deterministic extraction", {
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}
