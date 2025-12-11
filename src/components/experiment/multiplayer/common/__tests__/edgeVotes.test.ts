import { getTargetVoteIds, normalizeVoteIds } from "../edgeVotes";

describe("edge vote utilities", () => {
  it("normalizes string and object vote identifiers", () => {
    expect(
      normalizeVoteIds([
        "user-1",
        { id: "user-2" },
        { userId: "user-3" },
        { id: "" },
        null as any,
      ])
    ).toEqual(["user-1", "user-2", "user-3"]);
  });

  it("merges parent edge votes for objection targets", () => {
    const merged = getTargetVoteIds({
      edgeType: "objection",
      targetVotes: ["user-1"],
      parentEdgeVotes: [{ id: "user-2" }, "user-1"],
    });
    expect(merged).toEqual(["user-1", "user-2"]);
  });

  it("ignores parent edge votes for non-objection edges", () => {
    const merged = getTargetVoteIds({
      edgeType: "support",
      targetVotes: ["user-1"],
      parentEdgeVotes: ["user-2"],
    });
    expect(merged).toEqual(["user-1"]);
  });
});
