import { toast } from "sonner";

export const createDeleteNode = (
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
  return (nodeId: string) => {
    if (!canWrite) {
      toast.warning("Read-only mode: Changes won't be saved");
      return;
    }

    if (isLockedForMe?.(nodeId)) {
      const owner = getLockOwner?.(nodeId);
      toast.warning(`Locked by ${owner?.name || "another user"}`);
      return;
    }
    const edge = edges.find((e: any) => e.id === nodeId);
    if (edge) {
      const edgesToDelete = [edge];
      const nodesToDelete: string[] = [];

      const anchorNode = nodes.find((n: any) => n.id === `anchor:${edge.id}`);
      if (anchorNode) {
        nodesToDelete.push(anchorNode.id);

        const objectionEdges = edges.filter(
          (e: any) =>
            e.type === "objection" &&
            (e.source === anchorNode.id || e.target === anchorNode.id)
        );
        edgesToDelete.push(...objectionEdges);

        for (const objEdge of objectionEdges) {
          const objectionNodeId =
            objEdge.source === anchorNode.id ? objEdge.target : objEdge.source;
          const objectionNode = nodes.find(
            (n: any) => n.id === objectionNodeId && n.type === "objection"
          );
          if (objectionNode) {
            nodesToDelete.push(objectionNode.id);
          }
        }
      }

      // First sync to Yjs, then update local state
      if (yEdgesMap && yNodesMap && ydoc) {
        ydoc.transact(() => {
          for (const e of edgesToDelete) {
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            yEdgesMap.delete(e.id as any);
          }
          for (const nodeId of nodesToDelete) {
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            yNodesMap.delete(nodeId as any);
            try {
              // eslint-disable-next-line drizzle/enforce-delete-with-where
              yTextMap?.delete(nodeId as any);
            } catch {}
          }
        }, localOrigin);

        // Update local state after Yjs sync
        setEdges((eds) =>
          eds.filter((e: any) => !edgesToDelete.some((del) => del.id === e.id))
        );
        setNodes((nds) =>
          nds.filter((n: any) => !nodesToDelete.includes(n.id))
        );
      } else {
        // Fallback for non-multiplayer mode
        setEdges((eds) =>
          eds.filter((e: any) => !edgesToDelete.some((del) => del.id === e.id))
        );
        setNodes((nds) =>
          nds.filter((n: any) => !nodesToDelete.includes(n.id))
        );
      }
      return;
    }

    const node = nodes.find((n: any) => n.id === nodeId);
    if (!node) {
      return;
    }

    // Prevent deletion of title nodes
    if (node.type === "title") {
      toast?.warning?.("Cannot delete the title node");
      return;
    }

    // Handle container deletion - convert children back to standalone nodes
    if (node.type === "group") {
      const children = nodes.filter((n: any) => n.parentId === nodeId);
      const childrenToStandalone = children.map((child: any) => {
        const parent = nodes.find((n: any) => n.id === nodeId);
        const absoluteX = (parent?.position?.x || 0) + (child.position?.x || 0);
        const absoluteY = (parent?.position?.y || 0) + (child.position?.y || 0);

        return {
          id: child.id,
          type: child.type,
          data: { ...child.data },
          position: { x: absoluteX, y: absoluteY },
          parentId: undefined,
          extent: undefined,
          expandParent: undefined,
          selected: false,
          measured: undefined,
          width: undefined,
          height: undefined,
          positionAbsolute: undefined,
        };
      });

      // Update local state immediately
      setNodes((nds) =>
        nds
          .filter((n: any) => n.id !== nodeId)
          .map((n: any) => {
            const standalone = childrenToStandalone.find(
              (s: any) => s.id === n.id
            );
            return standalone || n;
          })
      );

      // Sync to Yjs
      if (yNodesMap && ydoc) {
        ydoc.transact(() => {
          // Delete the container

          // eslint-disable-next-line drizzle/enforce-delete-with-where
          yNodesMap.delete(nodeId as any);
          try {
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            yTextMap?.delete(nodeId as any);
          } catch {}

          // Update children to standalone
          for (const child of childrenToStandalone) {
            yNodesMap.set(child.id, child);
          }
        }, localOrigin);
      }
      return;
    }

    const incidentEdges = edges.filter(
      (e: any) => e.source === nodeId || e.target === nodeId
    );

    const allEdgesToDelete = [...incidentEdges];
    const allNodesToDelete: string[] = [];

    for (const incidentEdge of incidentEdges) {
      const anchorNode = nodes.find(
        (n: any) => n.id === `anchor:${incidentEdge.id}`
      );
      if (anchorNode) {
        allNodesToDelete.push(anchorNode.id);

        const objectionEdges = edges.filter(
          (e: any) =>
            e.type === "objection" &&
            (e.source === anchorNode.id || e.target === anchorNode.id)
        );
        allEdgesToDelete.push(...objectionEdges);

        for (const objEdge of objectionEdges) {
          const objectionNodeId =
            objEdge.source === anchorNode.id ? objEdge.target : objEdge.source;
          const objectionNode = nodes.find(
            (n: any) => n.id === objectionNodeId && n.type === "objection"
          );
          if (objectionNode) {
            allNodesToDelete.push(objectionNode.id);
          }
        }
      }
    }

    // First sync to Yjs, then update local state to ensure consistency
    if (yNodesMap && yEdgesMap && ydoc) {
      ydoc.transact(() => {
        for (const e of allEdgesToDelete) {
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          yEdgesMap.delete(e.id as any);
        }

        // eslint-disable-next-line drizzle/enforce-delete-with-where
        yNodesMap.delete(nodeId as any);
        try {
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          yTextMap?.delete(nodeId as any);
        } catch {}
        // Delete objection nodes
        for (const objectionNodeId of allNodesToDelete) {
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          yNodesMap.delete(objectionNodeId as any);
          try {
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            yTextMap?.delete(objectionNodeId as any);
          } catch {}
        }
      }, localOrigin);

      // Update local state after Yjs sync
      setEdges((eds) =>
        eds.filter((e: any) => !allEdgesToDelete.some((del) => del.id === e.id))
      );
      setNodes((nds) =>
        nds.filter(
          (n: any) => n.id !== nodeId && !allNodesToDelete.includes(n.id)
        )
      );
    } else {
      // Fallback for non-multiplayer mode
      setEdges((eds) =>
        eds.filter((e: any) => !allEdgesToDelete.some((del) => del.id === e.id))
      );
      setNodes((nds) =>
        nds.filter(
          (n: any) => n.id !== nodeId && !allNodesToDelete.includes(n.id)
        )
      );
    }
  };
};

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
