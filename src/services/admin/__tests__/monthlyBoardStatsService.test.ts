import * as Y from "yjs";
import {
  calculateMonthlyPointStatsForUpdates,
  formatMonthlyBoardStatsLabel,
  getMonthlyBoardStatsWindow,
} from "../monthlyBoardStatsService";

type TestNode = {
  id: string;
  type: string;
};

function makeUpdate(mutator: (nodes: Y.Map<TestNode>) => void) {
  const doc = new Y.Doc();
  const nodes = doc.getMap<TestNode>("nodes");
  mutator(nodes);
  const update = Buffer.from(Y.encodeStateAsUpdate(doc));
  doc.destroy();
  return update;
}

describe("monthlyBoardStatsService", () => {
  it("builds UTC month windows from explicit input", () => {
    const window = getMonthlyBoardStatsWindow(
      { month: 3, year: 2026 },
      new Date("2026-10-12T11:00:00.000Z")
    );

    expect(window.month).toBe(3);
    expect(window.year).toBe(2026);
    expect(window.start.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(formatMonthlyBoardStatsLabel(window.month, window.year)).toBe("March 2026");
  });

  it("counts first-seen nodes within the month and ignores repeats or invalid updates", () => {
    const start = new Date("2026-03-01T00:00:00.000Z");
    const end = new Date("2026-04-01T00:00:00.000Z");

    const marchStatementUpdate = makeUpdate((nodes) => {
      nodes.set("s-1", { id: "s-1", type: "statement" });
    });

    const marchPointUpdate = makeUpdate((nodes) => {
      nodes.set("s-1", { id: "s-1", type: "statement" });
      nodes.set("p-1", { id: "p-1", type: "point" });
    });

    const aprilObjectionUpdate = makeUpdate((nodes) => {
      nodes.set("s-1", { id: "s-1", type: "statement" });
      nodes.set("p-1", { id: "p-1", type: "point" });
      nodes.set("o-1", { id: "o-1", type: "objection" });
    });

    const stats = calculateMonthlyPointStatsForUpdates(
      [
        {
          updateBin: marchStatementUpdate,
          createdAt: "2026-03-02T10:00:00.000Z",
        },
        {
          updateBin: marchPointUpdate,
          createdAt: "2026-03-10T10:00:00.000Z",
        },
        {
          updateBin: Buffer.from([1, 2, 3]),
          createdAt: "2026-03-12T10:00:00.000Z",
        },
        {
          updateBin: aprilObjectionUpdate,
          createdAt: "2026-04-02T10:00:00.000Z",
        },
      ],
      start,
      end
    );

    expect(stats.newPoints).toBe(2);
    expect(stats.byType).toEqual({
      statement: 1,
      point: 1,
    });
  });
});
