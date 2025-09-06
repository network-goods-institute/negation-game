import * as Y from "yjs";
import { createUpdateNodeType } from "@/utils/experiment/multiplayer/graphOperations";

describe("createUpdateNodeType", () => {
  it("changes type and updates Y.Text content", () => {
    const ydoc = new Y.Doc();
    const yNodes = ydoc.getMap<any>("nodes");
    const yText = ydoc.getMap<Y.Text>("node_text");
    const local = {};
    const setNodes = (u: any) => u([]);

    ydoc.transact(() => {
      yNodes.set("n1", { id: "n1", type: "statement", data: { statement: "A" }, position: { x: 0, y: 0 } } as any);
      const t = new Y.Text();
      t.insert(0, "A");
      yText.set("n1", t);
    });

    const updateType = createUpdateNodeType(
      yNodes as any,
      yText as any,
      ydoc as any,
      true,
      local,
      setNodes as any
    );

    updateType("n1", "point");
    const n1 = yNodes.get("n1");
    const t1 = yText.get("n1") as Y.Text;
    expect(n1.type).toBe("point");
    expect((n1.data || {}).content).toBe("A");
    expect(t1.toString()).toBe("A");
  });
});
