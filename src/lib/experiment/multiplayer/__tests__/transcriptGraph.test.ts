import * as Y from "yjs";
import {
  buildFallbackTranscriptGraphSpec,
  normalizeTranscriptGraphSpec,
  buildTranscriptBoardLayout,
  encodeTranscriptGraphUpdate,
} from "../transcriptGraph";

describe("transcriptGraph", () => {
  it("builds a fallback spec from transcript lines with indexed relations", () => {
    const transcript = `
      Moderator: Should we ship this quarter?
      Alex: We should ship because adoption is growing.
      Blair: We should delay because reliability issues are unresolved.
      Casey: We need to decide whether speed or certainty matters more.
    `;

    const spec = buildFallbackTranscriptGraphSpec(transcript);

    expect(spec.title).toContain("Should we ship this quarter?");
    expect(spec.points.length).toBeGreaterThanOrEqual(3);
    expect(new Set(spec.points.map((point) => point.toLowerCase())).size).toBe(
      spec.points.length
    );
    expect(spec.relations?.length).toBe(spec.points.length);
    expect(spec.relations?.every((relation) => relation.sourceIndex >= 0)).toBe(
      true
    );
    expect(
      new Set(spec.relations?.map((relation) => relation.sourceIndex)).size
    ).toBe(spec.points.length);
  });

  it("normalizes ai output with mixed relation shapes and backfills points", () => {
    const fallback = buildFallbackTranscriptGraphSpec(
      "Alpha: Claim one with enough detail for extraction.\nBeta: Claim two with enough detail for extraction.\nGamma: Claim three with enough detail for extraction."
    );
    const normalized = normalizeTranscriptGraphSpec(
      {
        title: "   Proposed board title   ",
        points: [
          "short",
          "Claim one with enough detail for this test",
          "Claim one with enough detail for this test",
          { content: "Claim four with enough detail for this test" },
        ],
        relations: [
          { sourceIndex: 0, targetIndex: null, type: "option" },
          { source: 1, target: 0, relation: "support" },
          { sourceIndex: 2, targetIndex: 1, type: "negation" },
          { sourceIndex: 999, targetIndex: null, type: "option" },
        ],
      },
      fallback
    );

    expect(normalized.title).toBe("Proposed board title");
    expect(normalized.points.length).toBeGreaterThanOrEqual(3);
    expect(
      new Set(normalized.points.map((point) => point.toLowerCase())).size
    ).toBe(normalized.points.length);
    expect(normalized.relations?.length).toBeGreaterThanOrEqual(3);
    expect(
      normalized.relations?.some((relation) => relation.type === "support")
    ).toBe(true);
    expect(
      normalized.relations?.some((relation) => relation.type === "negation")
    ).toBe(true);
  });

  it("expands sparse ai point output when transcript has enough material", () => {
    const fallback = buildFallbackTranscriptGraphSpec(`
      Moderator: Should the city launch a congestion pricing pilot in September or delay to January?
      Transit Director: Launching sooner improves bus travel time reliability.
      Small Business Owner: A fast launch could reduce downtown customer visits.
      Data Scientist: Equity metrics by zip code should be tracked monthly.
      Civil Liberties Attorney: Plate data retention needs strict limits.
      City Controller: Revenue should be earmarked to transit service improvements.
      Neighborhood Representative: Boundary diversion must be mitigated before launch.
      Emergency Services Chief: Exempt lanes and fail-open safety are required.
      Council Member: Add automatic suspension thresholds for diversion spikes.
      Mayor: We can launch with safeguards if protections are codified in writing.
    `);

    const normalized = normalizeTranscriptGraphSpec(
      {
        title: "Congestion pilot",
        points: [
          "Launch in September to improve bus speeds",
          "Delay until January to complete mitigation safeguards",
          "Equity outcomes must be tracked publicly by neighborhood",
        ],
      },
      fallback
    );

    expect(normalized.points.length).toBeGreaterThanOrEqual(6);
    expect(
      normalized.points.some((point) =>
        point.toLowerCase().includes("retention")
      )
    ).toBe(true);
  });

  it("builds depth-based layout with option, support and negation edges", () => {
    const { nodes, edges } = buildTranscriptBoardLayout({
      title: "Policy Tradeoffs",
      points: [
        "Claim A is strong enough for launch",
        "Claim B is weak due to unresolved reliability concerns",
        "Claim C supports claim A with adoption data",
        "Claim D negates claim C with contradictory evidence",
      ],
      relations: [
        { sourceIndex: 0, targetIndex: null, type: "option" },
        { sourceIndex: 1, targetIndex: null, type: "option" },
        { sourceIndex: 2, targetIndex: 0, type: "support" },
        { sourceIndex: 3, targetIndex: 2, type: "negation" },
      ],
    });

    expect(nodes).toHaveLength(5);
    expect(edges).toHaveLength(4);
    expect(nodes[0].id).toBe("title");
    expect(nodes[0].type).toBe("statement");
    expect(edges.some((edge) => edge.type === "support")).toBe(true);
    expect(edges.some((edge) => edge.type === "negation")).toBe(true);

    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const supportEdge = edges.find((edge) => edge.type === "support");
    const negationEdge = edges.find((edge) => edge.type === "negation");
    expect(supportEdge?.target).toBe("tp-1");
    expect(negationEdge?.target).toBe("tp-3");
    expect(
      (nodeById.get("tp-3")?.position.y || 0) >
        (nodeById.get("tp-1")?.position.y || 0)
    ).toBe(true);
    expect(
      (nodeById.get("tp-4")?.position.y || 0) >
        (nodeById.get("tp-3")?.position.y || 0)
    ).toBe(true);
  });

  it("encodes transcript graph into yjs update with relation metadata", () => {
    const update = encodeTranscriptGraphUpdate({
      title: "Roadmap Debate",
      points: [
        "Ship now to capture demand",
        "Delay to reduce reliability risk",
        "Compare cost of delay versus outage",
        "Evidence suggests sequencing can lower launch risk",
      ],
      relations: [
        { sourceIndex: 0, targetIndex: null, type: "option" },
        { sourceIndex: 1, targetIndex: null, type: "option" },
        { sourceIndex: 2, targetIndex: 1, type: "negation" },
        { sourceIndex: 3, targetIndex: 0, type: "support" },
      ],
    });

    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(update));

    const yNodes = doc.getMap("nodes");
    const yEdges = doc.getMap("edges");
    const yText = doc.getMap<Y.Text>("node_text");
    const yMeta = doc.getMap("meta");

    expect(yNodes.size).toBe(5);
    expect(yEdges.size).toBe(4);
    expect(yMeta.get("createdFromDocument")).toBe(true);
    expect(yText.get("title")?.toString()).toBe("Roadmap Debate");
    expect(yMeta.get("transcriptPointCount")).toBe(4);
    expect(yMeta.get("transcriptRelationCount")).toBe(4);
    const edgeTypes = Array.from(yEdges.values()).map((edge: any) => edge.type);
    expect(edgeTypes).toEqual(
      expect.arrayContaining(["option", "support", "negation"])
    );
  });

  it("upgrades all-option relation plans to include multiple non-option edges", () => {
    const points = [
      "Launch in September with safeguards",
      "Delay until January for mitigation completion",
      "Boundary diversion should be monitored weekly",
      "Data retention should be capped at 30 days",
      "Commercial delivery windows need constrained exemptions",
      "Equity outcomes require neighborhood-level monthly dashboards",
      "Operator hiring must begin in July",
      "Automatic suspension thresholds should guard against harm",
    ];

    const allOptionRelations = points.map((_point, sourceIndex) => ({
      sourceIndex,
      targetIndex: null as number | null,
      type: "option" as const,
    }));

    const { edges } = buildTranscriptBoardLayout({
      title: "Pilot launch debate",
      points,
      relations: allOptionRelations,
    });

    const nonOptionEdges = edges.filter((edge) => edge.type !== "option");
    expect(nonOptionEdges.length).toBeGreaterThanOrEqual(3);
  });
});
