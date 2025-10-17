import * as Y from "yjs";
import { toast } from "sonner";
import { generateEdgeId } from "../graphSync";

type NodesUpdater = (updater: (nodes: any[]) => any[]) => void;
type EdgesUpdater = (updater: (edges: any[]) => any[]) => void;

export const createDuplicateNodeWithConnections = (
  nodes: any[],
  edges: any[],
  yNodesMap: any,
  yEdgesMap: any,
  yTextMap: any,
  ydoc: any,
  canWrite: boolean,
  localOrigin: object,
  setNodes: NodesUpdater,
  setEdges: EdgesUpdater,
  isLockedForMe?: (nodeId: string) => boolean,
  getLockOwner?: (nodeId: string) => { name?: string } | null
) => {
  return (
    nodeId: string,
    offset?: { x?: number; y?: number }
  ): string | null => {
    const original = nodes.find((n) => n.id === nodeId);
    if (!original) return null;
    if (isLockedForMe?.(nodeId)) {
      const owner = getLockOwner?.(nodeId);
      toast.warning(`Locked by ${owner?.name || "another user"}`);
      return null;
    }
    if (!canWrite) {
      toast.warning("Read-only mode: Changes won't be saved");
      return null;
    }

    const type = String(original.type);
    if (type !== "point" && type !== "objection") {
      return null;
    }

    const now = Date.now();
    const idBase = type === "objection" ? "o" : "p";
    const newId = `${idBase}-${now}-${Math.floor(Math.random() * 1e6)}`;

    const dx =
      typeof offset?.x === "number" && isFinite(offset.x!) ? offset!.x! : 24;
    const dy =
      typeof offset?.y === "number" && isFinite(offset.y!) ? offset!.y! : 24;

    const ox = (original.position?.x ?? 0) + dx;
    const oy = (original.position?.y ?? 0) + dy;

    const baseData = { ...(original.data || {}) } as any;
    delete baseData.createdAt;

    const duplicatedNode: any = {
      id: newId,
      type,
      position: { x: ox, y: oy },
      data: { ...baseData, createdAt: now },
      selected: true,
    };

    const newEdges: any[] = [];
    const oldToNewEdgeId = new Map<string, any>();

    for (const e of edges) {
      const touchesAsSource = String(e.source) === nodeId;
      const touchesAsTarget = String(e.target) === nodeId;
      if (!touchesAsSource && !touchesAsTarget) continue;

      const copy: any = { ...e };
      copy.id = generateEdgeId();
      if (touchesAsSource) {
        copy.source = newId;
        if (copy.sourceHandle && typeof copy.sourceHandle === "string") {
          try {
            copy.sourceHandle =
              (copy.sourceHandle as string).replaceAll?.(nodeId, newId) ??
              (copy.sourceHandle as string).replace(
                new RegExp(nodeId, "g"),
                newId
              );
          } catch {
            copy.sourceHandle = (copy.sourceHandle as string).replace(
              new RegExp(nodeId, "g"),
              newId
            );
          }
        }
      }
      if (touchesAsTarget) {
        copy.target = newId;
        if (copy.targetHandle && typeof copy.targetHandle === "string") {
          try {
            copy.targetHandle =
              (copy.targetHandle as string).replaceAll?.(nodeId, newId) ??
              (copy.targetHandle as string).replace(
                new RegExp(nodeId, "g"),
                newId
              );
          } catch {
            copy.targetHandle = (copy.targetHandle as string).replace(
              new RegExp(nodeId, "g"),
              newId
            );
          }
        }
      }
      newEdges.push(copy);
      oldToNewEdgeId.set(String(e.id), copy);
    }

    setNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      duplicatedNode,
    ]);
    let objectionEdgesToAdd: any[] = [];
    if (oldToNewEdgeId.size > 0) {
      const anchorsByOld = new Map<string, string>();
      oldToNewEdgeId.forEach((val, key) => {
        anchorsByOld.set(`anchor:${key}`, `anchor:${val.id}`);
      });
      const anchoredObjections = edges.filter((e) => {
        if (e?.type !== "objection") return false;
        const s = String(e.source || "");
        const t = String(e.target || "");
        return anchorsByOld.has(s) || anchorsByOld.has(t);
      });
      const newObjections: any[] = [];
      for (const obj of anchoredObjections) {
        const sourceIsAnchor = anchorsByOld.has(String(obj.source));
        const targetIsAnchor = anchorsByOld.has(String(obj.target));
        const next: any = { ...obj, id: generateEdgeId() };
        if (sourceIsAnchor) next.source = anchorsByOld.get(String(obj.source));
        if (targetIsAnchor) next.target = anchorsByOld.get(String(obj.target));
        newObjections.push(next);
      }
      if (newObjections.length > 0) {
        objectionEdgesToAdd = newObjections;
        // Ensure local anchor nodes for new edges exist
        try {
          setNodes((nds) => {
            const next = nds.slice();
            const present = new Set(next.map((n: any) => String(n.id)));
            for (const [, newEdge] of oldToNewEdgeId) {
              const anchorId = `anchor:${newEdge.id}`;
              if (!present.has(anchorId)) {
                const src = nodes.find(
                  (n) => String(n.id) === String(newEdge.source)
                );
                const tgt = nodes.find(
                  (n) => String(n.id) === String(newEdge.target)
                );
                const midX =
                  (((src as any)?.position?.x ?? 0) +
                    ((tgt as any)?.position?.x ?? 0)) /
                  2;
                const midY =
                  (((src as any)?.position?.y ?? 0) +
                    ((tgt as any)?.position?.y ?? 0)) /
                  2;
                next.push({
                  id: anchorId,
                  type: "edge_anchor",
                  position: { x: midX, y: midY },
                  data: { parentEdgeId: newEdge.id },
                });
                present.add(anchorId);
              }
            }
            return next;
          });
        } catch {}
      }
    }
    if (newEdges.length > 0 || objectionEdgesToAdd.length > 0) {
      setEdges((eds) => [...eds, ...newEdges, ...objectionEdgesToAdd]);
    }

    if (yNodesMap && ydoc && canWrite) {
      ydoc.transact(() => {
        yNodesMap.set(newId, duplicatedNode);
        for (const ne of newEdges) {
          if (!yEdgesMap?.has?.(ne.id)) {
            yEdgesMap?.set?.(ne.id, ne);
          }
        }
        for (const oe of objectionEdgesToAdd) {
          if (!yEdgesMap?.has?.(oe.id)) {
            yEdgesMap?.set?.(oe.id, oe);
          }
        }
        if (yTextMap && (type === "point" || type === "objection")) {
          const originalText = yTextMap.get(nodeId) as Y.Text | undefined;
          const t = new Y.Text();
          if (originalText) {
            const content = originalText.toString();
            if (content) t.insert(0, content);
          } else {
            const raw = String(
              (original.data?.content ?? original.data?.statement) || ""
            );
            if (raw) t.insert(0, raw);
          }
          yTextMap.set(newId, t);
        }
      }, localOrigin);
    }

    return newId;
  };
};
