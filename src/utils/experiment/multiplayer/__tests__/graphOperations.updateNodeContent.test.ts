import * as Y from "yjs";
import { createUpdateNodeContent } from "@/utils/experiment/multiplayer/graphOperations";

const makeYMap = () => {
  const map = new Map<string, any>();
  return {
    set: (k: string, v: any) => map.set(k, v),
    get: (k: string) => map.get(k),
    has: (k: string) => map.has(k),
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    delete: (k: string) => map.delete(k),
    _map: map,
  } as any;
};

describe("graph operations: update node content", () => {
  it("writes content to Y.Text with minimal transaction", () => {
    const yTextMap = makeYMap();
    const ydoc = { transact: (cb: () => void) => cb() } as any;
    const isLeader = true;
    const localOrigin = {};
    let stateNodes: any[] = [
      {
        id: "p1",
        type: "point",
        position: { x: 0, y: 0 },
        data: { content: "" },
      },
    ];
    const setNodes = (updater: any) => {
      stateNodes = updater(stateNodes);
    };
    const register = jest.fn();

    const fn = createUpdateNodeContent(
      yTextMap,
      ydoc,
      isLeader,
      localOrigin,
      setNodes,
      register
    );
    fn("p1", "Hello world");
    const t1 = yTextMap.get("p1") as Y.Text;
    expect(t1).toBeTruthy();
    fn("p1", "Hello brave world");
    const t2 = yTextMap.get("p1") as Y.Text;
    expect(t2).toBeTruthy();
  });
});
