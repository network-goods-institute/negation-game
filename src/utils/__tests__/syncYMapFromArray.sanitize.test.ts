import { syncYMapFromArray } from "@/hooks/experiment/multiplayer/yjs/sync";

class YMapLike<V> {
  map = new Map<string, V>();
  keys() { return this.map.keys(); }
  get(id: string) { return this.map.get(id) as any; }
  set(id: string, v: V) { this.map.set(id, v); }
  // eslint-disable-next-line drizzle/enforce-delete-with-where
  delete(id: string) { this.map.delete(id); }
}

describe("syncYMapFromArray sanitize", () => {
  it("strips selected, dragging, and editedBy fields", () => {
    const ymap = new YMapLike<any>();
    ymap.set("n1", { id: "n1", type: "point", data: { content: "X" } });
    const incoming = [
      { id: "n1", type: "point", selected: true, dragging: true, data: { content: "Y", editedBy: "u1" } },
      { id: "n2", type: "point", selected: true, data: { content: "Z", editedBy: "u2" } },
    ];
    syncYMapFromArray(ymap as any, incoming as any);
    const n1 = ymap.get("n1");
    const n2 = ymap.get("n2");
    expect((n1 as any).selected).toBeUndefined();
    expect((n1 as any).dragging).toBeUndefined();
    expect(n1.data.editedBy).toBeUndefined();
    expect((n2 as any).selected).toBeUndefined();
    expect(n2.data.editedBy).toBeUndefined();
  });
});
