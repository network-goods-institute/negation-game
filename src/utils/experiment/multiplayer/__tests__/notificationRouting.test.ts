import { buildEdgeNotificationCandidates } from "@/utils/experiment/multiplayer/notificationRouting";

describe("buildEdgeNotificationCandidates", () => {
  const baseNodes: any[] = [
    {
      id: "n1",
      type: "point",
      data: { content: "Target point", createdBy: "owner-1", createdByName: "Owner" },
    },
  ];

  it("returns notification for new negation edge authored by actor", () => {
    const edges: any[] = [
      {
        id: "e1",
        type: "negation",
        target: "n1",
        data: { createdBy: "actor-1" },
      },
    ];

    const results = buildEdgeNotificationCandidates(
      edges as any,
      baseNodes as any,
      "actor-1",
      null
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      edgeId: "e1",
      targetNodeId: "n1",
      type: "negation",
      recipientUserId: "owner-1",
      title: "Target point",
    });
  });

  it("skips edges authored by someone else", () => {
    const edges: any[] = [
      {
        id: "e1",
        type: "negation",
        target: "n1",
        data: { createdBy: "someone-else" },
      },
    ];

    const results = buildEdgeNotificationCandidates(
      edges as any,
      baseNodes as any,
      "actor-1",
      null
    );

    expect(results).toHaveLength(0);
  });

  it("allows notifications when actor differs from edge creator if required is false", () => {
    const edges: any[] = [
      {
        id: "e1",
        type: "negation",
        target: "n1",
        data: { createdBy: "someone-else" },
      },
    ];

    const results = buildEdgeNotificationCandidates(
      edges as any,
      baseNodes as any,
      "actor-1",
      null,
      { requireCreatorMatch: false }
    );

    expect(results).toHaveLength(1);
    expect(results[0].recipientUserId).toBe("owner-1");
  });

  it("routes objection edges through anchor parent edge targets", () => {
    const nodes: any[] = [
      ...baseNodes,
      {
        id: "anchor:e-base",
        type: "edge_anchor",
        data: { parentEdgeId: "e-base" },
      },
    ];
    const edges: any[] = [
      {
        id: "e-base",
        type: "support",
        target: "n1",
        data: { createdBy: "actor-1" },
      },
      {
        id: "e-obj",
        type: "objection",
        target: "anchor:e-base",
        data: { createdBy: "actor-1" },
      },
    ];

    const results = buildEdgeNotificationCandidates(
      edges as any,
      nodes as any,
      "actor-1",
      null
    );

    const objection = results.find((row) => row.edgeId === "e-obj");
    expect(objection).toMatchObject({
      edgeId: "e-obj",
      targetNodeId: "n1",
      type: "objection",
      recipientUserId: "owner-1",
    });
  });
});
