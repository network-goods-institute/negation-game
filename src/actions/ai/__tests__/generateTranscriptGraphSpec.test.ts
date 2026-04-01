import { generateTranscriptGraphSpec } from "../generateTranscriptGraphSpec";
import { geminiService } from "@/services/ai/geminiService";

jest.mock("@/services/ai/geminiService", () => ({
  geminiService: {
    generateStream: jest.fn(),
  },
}));

const streamFromText = (text: string) =>
  new ReadableStream<string>({
    start(controller) {
      controller.enqueue(text);
      controller.close();
    },
  });

describe("generateTranscriptGraphSpec", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("parses valid strict json response", async () => {
    (geminiService.generateStream as jest.Mock).mockResolvedValueOnce(
      streamFromText(
        JSON.stringify({
          title: "Roadmap tradeoff",
          points: [
            "Ship now to capture market momentum",
            "Delay release to reduce reliability risk",
            "We need to compare cost of delay versus outage",
          ],
          relations: [
            { sourceIndex: 0, targetIndex: null, type: "option" },
            { sourceIndex: 1, targetIndex: null, type: "option" },
            { sourceIndex: 2, targetIndex: 1, type: "negation" },
          ],
        })
      )
    );

    const result = await generateTranscriptGraphSpec(
      "A transcript about roadmap tradeoffs."
    );

    expect(result.title).toBe("Roadmap tradeoff");
    expect(result.points).toHaveLength(3);
    expect(result.relations).toHaveLength(3);
    expect(result.relations?.some((relation) => relation.type === "negation")).toBe(
      true
    );
  });

  it("parses fenced json responses and backfills relations", async () => {
    (geminiService.generateStream as jest.Mock).mockResolvedValueOnce(
      streamFromText(`\`\`\`json
{
  "title": "Fenced output",
  "points": [
    "Point one has sufficient detail",
    "Point two has sufficient detail",
    "Point three has sufficient detail"
  ]
}
\`\`\``)
    );

    const result = await generateTranscriptGraphSpec(
      "Transcript with enough context."
    );

    expect(result.title).toBe("Fenced output");
    expect(result.points).toHaveLength(3);
    expect(result.relations?.length).toBeGreaterThanOrEqual(3);
  });

  it("falls back to deterministic extraction when json is invalid", async () => {
    (geminiService.generateStream as jest.Mock).mockResolvedValueOnce(
      streamFromText("not valid json")
    );

    const result = await generateTranscriptGraphSpec(
      "Moderator: Should we ship now?\nAlex: We should ship for adoption.\nBlair: We should delay for reliability.\nCasey: Compare costs."
    );

    expect(result.title.length).toBeGreaterThan(0);
    expect(result.points.length).toBeGreaterThanOrEqual(3);
    expect(result.relations?.length).toBe(result.points.length);
  });

  it("falls back when ai stream throws", async () => {
    (geminiService.generateStream as jest.Mock).mockRejectedValueOnce(
      new Error("rate limited")
    );

    const result = await generateTranscriptGraphSpec(
      "Moderator: Which policy should we choose?\nA: Option one.\nB: Option two.\nC: Option three."
    );

    expect(result.title.length).toBeGreaterThan(0);
    expect(result.points.length).toBeGreaterThanOrEqual(3);
    expect(result.relations?.length).toBe(result.points.length);
  });

  it("normalizes responses using edges alias fields", async () => {
    (geminiService.generateStream as jest.Mock).mockResolvedValueOnce(
      streamFromText(
        JSON.stringify({
          title: "Edges alias format",
          points: [
            "Option one has clear policy upside",
            "Option two has lower implementation risk",
            "This point supports option one with evidence",
          ],
          edges: [
            { source: 0, target: "title", relation: "option" },
            { source: 1, target: null, relation: "option" },
            { source: 2, target: 0, relation: "support" },
          ],
        })
      )
    );

    const result = await generateTranscriptGraphSpec(
      "Transcript with alternate edge key naming."
    );

    expect(result.title).toBe("Edges alias format");
    expect(result.relations).toHaveLength(3);
    expect(result.relations?.some((relation) => relation.type === "support")).toBe(
      true
    );
  });

  it("truncates transcript passed to ai prompt", async () => {
    (geminiService.generateStream as jest.Mock).mockResolvedValueOnce(
      streamFromText(
        JSON.stringify({
          title: "Trimmed",
          points: [
            "First long but valid point content",
            "Second long but valid point content",
            "Third long but valid point content",
          ],
        })
      )
    );

    const longTranscript = `${"x".repeat(24000)}TAIL_MARKER`;
    await generateTranscriptGraphSpec(longTranscript);
    const callArgs = (geminiService.generateStream as jest.Mock).mock.calls[0];
    const messages = callArgs[0] as Array<{ role: string; content: string }>;
    const userPrompt = messages.find((m) => m.role === "user")?.content || "";

    expect(userPrompt).not.toContain("TAIL_MARKER");
    expect(userPrompt).toContain('"relations"');
    expect(userPrompt).toContain("6 to 14");
  });
});
