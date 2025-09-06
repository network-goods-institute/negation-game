import { createDeleteNode } from "@/utils/experiment/multiplayer/graphOperations";

class YMapLike<V> implements Iterable<[string, V]> {
  map = new Map<string, V>();
  set(id: string, v: V) { this.map.set(id, v); }
  get(id: string) { return this.map.get(id) as any; }
  has(id: string) { return this.map.has(id); }
  // eslint-disable-next-line drizzle/enforce-delete-with-where
  delete(id: string) { this.map.delete(id); }
  [Symbol.iterator](): Iterator<[string, V]> { return this.map[Symbol.iterator](); }
}

describe("createDeleteNode group Yjs path", () => {
  it("promotes group children to standalone and deletes group", () => {
    const yNodes = new YMapLike<any>();
    const yEdges = new YMapLike<any>();
    const yText = new YMapLike<any>();
    const ydoc = { transact: (fn: () => void) => fn() } as any;
    const groupId = "g1";
    const c1 = { id: "a", type: "point", parentId: groupId, position: { x: 5, y: 7 }, data: {} };
    const c2 = { id: "b", type: "point", parentId: groupId, position: { x: 10, y: 11 }, data: {} };
    const grp = { id: groupId, type: "group", position: { x: 100, y: 200 }, data: {}, width: 200, height: 120 } as any;
    yNodes.set(groupId, grp);
    yNodes.set("a", c1 as any);
    yNodes.set("b", c2 as any);

    let nodes = [grp, c1, c2] as any[];
    let edges: any[] = [];
    const setNodes = (u: any) => { nodes = u(nodes); };
    const setEdges = (u: any) => { edges = u(edges); };

    const del = createDeleteNode(
      nodes,
      edges,
      yNodes as any,
      yEdges as any,
      yText as any,
      ydoc as any,
      true,
      {},
      setNodes as any,
      setEdges as any
    );

    del(groupId);
    expect(yNodes.has(groupId)).toBe(false);
    const a = yNodes.get("a");
    const b = yNodes.get("b");
    expect(a.parentId).toBeUndefined();
    expect(b.parentId).toBeUndefined();
    expect(a.position).toEqual({ x: 105, y: 207 });
    expect(b.position).toEqual({ x: 110, y: 211 });
  });
});
