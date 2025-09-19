import { toast } from "sonner";

export const createDeleteInversePair = (
  nodes: any[],
  edges: any[],
  yNodesMap: any,
  yEdgesMap: any,
  yTextMap: any,
  ydoc: any,
  canWrite: boolean,
  localOrigin: object,
  setNodes: (updater: (nodes: any[]) => any[]) => void,
  setEdges: (updater: (edges: any[]) => any[]) => void,
  isLockedForMe?: (nodeId: string) => boolean,
  getLockOwner?: (nodeId: string) => { name?: string } | null
) => {
  return (inverseNodeId: string) => {
    if (!canWrite) {
      toast.warning("Read-only mode: Changes won't be saved");
      return;
    }

    const inverse = nodes.find((n: any) => n.id === inverseNodeId);
    const groupId = inverse?.parentId;
    if (!inverse || !groupId) {
      return;
    }
    const children = nodes.filter((n: any) => n.parentId === groupId);
    const original = children.find((n: any) => n.id !== inverseNodeId) || null;
    if (!original) {
      return;
    }
    if (isLockedForMe?.(original.id)) {
      const owner = getLockOwner?.(original.id);
      toast.warning(`Locked by ${owner?.name || "another user"}`);
      return;
    }
    const group = nodes.find((n: any) => n.id === groupId);
    const groupPos = group?.position || { x: 0, y: 0 };
    const origRel = original?.position || { x: 0, y: 0 };
    const abs = {
      x: (groupPos.x || 0) + (origRel.x || 0),
      y: (groupPos.y || 0) + (origRel.y || 0),
    };

    if (yNodesMap && yEdgesMap && ydoc) {
      let closeTs: number | null = null;
      try {
        const gBase = yNodesMap.get(groupId);
        if (gBase) {
          const ts = Date.now();
          closeTs = ts;
          ydoc.transact(() => {
            // First, animate the inverse node sliding back to the original position
            const inverseBase = yNodesMap.get(inverseNodeId);
            if (inverseBase) {
              yNodesMap.set(inverseNodeId, {
                ...inverseBase,
                data: {
                  ...(inverseBase.data || {}),
                  closingAnimation: true,
                  closingSince: ts,
                },
              });
            }

            const updatedGroup = {
              ...gBase,
              data: {
                ...(gBase.data || {}),
                closing: true,
                closingSince: ts,
              },
            };
            yNodesMap.set(groupId, updatedGroup);
          }, localOrigin);
          setNodes((nds: any[]) =>
            nds.map((n: any) => {
              if (n.id === inverseNodeId) {
                return {
                  ...n,
                  data: {
                    ...(n.data || {}),
                    closingAnimation: true,
                    closingSince: closeTs || Date.now(),
                  },
                };
              }
              if (n.id === groupId) {
                return {
                  ...n,
                  data: {
                    ...(n.data || {}),
                    closing: true,
                    closingSince: closeTs || Date.now(),
                  },
                } as any;
              }
              return n;
            })
          );
        }
      } catch (error) {}
      const finalize = () => {
        ydoc.transact(() => {
          // Update original node to stand-alone
          if (yNodesMap.has(original.id)) {
            const base = yNodesMap.get(original.id);
            let inverseTextStr = "";
            try {
              const t = yTextMap?.get(inverseNodeId);
              if (t && typeof (t as any).toString === "function") {
                inverseTextStr = (t as any).toString();
              }
            } catch {}
            if (!inverseTextStr) {
              try {
                const invBase = yNodesMap.get(inverseNodeId);
                inverseTextStr = (invBase?.data?.content as string) || "";
              } catch {}
            }
            const updated = {
              ...base,
              parentId: undefined,
              position: abs,
              extent: undefined,
              expandParent: undefined,
              draggable: true,
              data: {
                ...(base?.data || {}),
                originalInPair: undefined,
                directInverse: undefined,
                groupId: undefined,
                originalDetached: undefined,
                pairHeight: undefined,
                inverseGenerated: true,
                inverseContent:
                  inverseTextStr || base?.data?.inverseContent || "",
              },
            } as any;
            yNodesMap.set(original.id, updated);
          }

          // Remove inverse node and its Y.Text (if any)
          if (yNodesMap.has(inverseNodeId)) {
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            yNodesMap.delete(inverseNodeId as any);
          }
          if (yTextMap && yTextMap.get(inverseNodeId)) {
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            yTextMap.delete(inverseNodeId as any);
          }

          // Remove group node
          if (yNodesMap.has(groupId)) {
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            yNodesMap.delete(groupId as any);
          }

          // Remove edges connected to inverse
          if (typeof yEdgesMap?.forEach === "function") {
            yEdgesMap.forEach((e: any, eid: string) => {
              if (!e) return;
              if (e.source === inverseNodeId || e.target === inverseNodeId) {
                // eslint-disable-next-line drizzle/enforce-delete-with-where
                yEdgesMap.delete(eid as any);
              }
            });
          } else {
            for (const [eid, e] of yEdgesMap as any) {
              if (!e) continue;
              if (e.source === inverseNodeId || e.target === inverseNodeId) {
                // eslint-disable-next-line drizzle/enforce-delete-with-where
                (yEdgesMap as any).delete(eid);
              }
            }
          }
        }, localOrigin);

        // Update local state after Yjs sync (defer slightly to allow CSS to animate)
        window.setTimeout(() => {
          setEdges((eds: any[]) =>
            eds.filter(
              (e: any) =>
                e.source !== inverseNodeId && e.target !== inverseNodeId
            )
          );
          setNodes((nds: any[]) =>
            nds
              .filter((n: any) => n.id !== groupId && n.id !== inverseNodeId)
              .map((n: any) =>
                n.id === original.id
                  ? {
                      ...n,
                      parentId: undefined,
                      position: abs,
                      extent: undefined,
                      expandParent: undefined,
                      draggable: true,
                      data: {
                        ...(n?.data || {}),
                        originalInPair: undefined,
                        directInverse: undefined,
                        groupId: undefined,
                        originalDetached: undefined,
                        pairHeight: undefined,
                      },
                    }
                  : n
              )
          );
        }, 120);
      };
      const remaining = Math.max(
        0,
        600 - (Date.now() - (closeTs ?? Date.now()))
      );
      window.setTimeout(finalize, remaining);
    }
  };
};
