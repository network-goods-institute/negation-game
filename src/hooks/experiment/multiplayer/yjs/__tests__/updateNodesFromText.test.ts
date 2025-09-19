import * as Y from "yjs";
import { createUpdateNodesFromText } from "@/hooks/experiment/multiplayer/yjs/textSync";

describe("createUpdateNodesFromText", () => {
  it("updates statement and point content from Y.Text", () => {
    const doc = new Y.Doc();
    const yText = doc.getMap<Y.Text>("node_text");
    const tStmt = new Y.Text();
    tStmt.insert(0, "S");
    const tPoint = new Y.Text();
    tPoint.insert(0, "P");
    yText.set("s1", tStmt);
    yText.set("p1", tPoint);
    const yTextMapRef = { current: yText } as any;
    const localOriginRef = { current: {} } as any;

    let nodes = [
      { id: "s1", type: "statement", data: { statement: "" } },
      { id: "p1", type: "point", data: { content: "" } },
    ] as any[];
    const setNodes = (updater: any) => { nodes = updater(nodes); };
    const handler = createUpdateNodesFromText(
      yTextMapRef as any,
      localOriginRef as any,
      setNodes as any
    );
    handler([]);
    const s = nodes.find((n) => n.id === "s1");
    const p = nodes.find((n) => n.id === "p1");
    expect(s?.data?.statement).toBe("S");
    expect(p?.data?.content).toBe("P");
  });
});
