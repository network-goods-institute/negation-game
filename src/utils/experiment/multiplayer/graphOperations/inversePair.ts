import * as Y from "yjs";
import { toast } from "sonner";

import { generateInversePoint } from "@/actions/ai/generateInversePoint";

export const createInversePair = (
  nodes: any[],
  yNodesMap: any,
  yTextMap: any,
  yEdgesMap: any,
  ydoc: any,
  canWrite: boolean,
  localOrigin: object,
  setNodes: (updater: (nodes: any[]) => any[]) => void,
  setEdges: (updater: (edges: any[]) => any[]) => void,
  registerTextInUndoScope?: (t: any) => void,
  isLockedForMe?: (nodeId: string) => boolean,
  getLockOwner?: (nodeId: string) => { name?: string } | null
) => {
  return (pointNodeId: string) => {
    if (isLockedForMe?.(pointNodeId)) {
      const owner = getLockOwner?.(pointNodeId);
      toast.warning(`Locked by ${owner?.name || "another user"}`);
      return;
    }
    if (!canWrite) {
      toast.warning("Read-only mode: Changes won't be saved");
      return;
    }

    const pointNode = nodes.find((n: any) => n.id === pointNodeId);
    if (!pointNode) return;

    if (pointNode.parentId) {
      toast.warning("Point is already in a container");
      return;
    }

    // Prevent creating another inverse if one was already generated (persistent flag)
    if (pointNode?.data?.inverseGenerated) {
      // Reopen previously generated inverse: rebuild group with stored content
      const now = Date.now();
      const groupId = `group-${now}-${Math.floor(Math.random() * 1e6)}`;
      const inverseId = `inverse-${now}-${Math.floor(Math.random() * 1e6)}`;

      const originalContent = pointNode.data?.content || "";
      let storedInverse = "";
      try {
        const base = yNodesMap?.get(pointNodeId);
        storedInverse = (base?.data?.inverseContent as string) || "";
      } catch {}
      if (!storedInverse) {
        storedInverse = (pointNode.data?.inverseContent as string) || "";
      }
      if (!storedInverse) {
        storedInverse = `Not ${originalContent}`;
      }

      // Use measured dimensions from React Flow if available, otherwise use component constraints
      let nodeWidth = 220;
      let nodeHeight = 80;
      if (
        pointNode?.measured?.width &&
        typeof pointNode.measured.width === "number"
      ) {
        nodeWidth = Math.ceil(pointNode.measured.width);
      }
      if (
        pointNode?.measured?.height &&
        typeof pointNode.measured.height === "number"
      ) {
        nodeHeight = Math.ceil(pointNode.measured.height);
      }
      if (nodeWidth === 220) {
        nodeWidth = Math.min(
          280,
          Math.max(200, pointNode?.data?.content?.length * 8 || 200)
        );
      }

      const padding = 8; // Match GroupNode leftPadding
      const gapWidth = 25; // Match GroupNode gap between children
      const containerWidth =
        padding + nodeWidth + gapWidth + nodeWidth + padding;
      const containerHeight = nodeHeight + padding * 8;

      const groupPosition = {
        x: pointNode.position.x - padding,
        y: pointNode.position.y - padding,
      };

      const groupNode: any = {
        id: groupId,
        type: "group",
        position: groupPosition,
        data: { label: "", isNew: true, openingSince: now },
        width: containerWidth,
        height: containerHeight,
        style: { width: containerWidth, height: containerHeight, padding: 8 },
        draggable: true,
        dragHandle: ".group-drag-handle",
        selectable: true,
        resizable: false,
      };

      const inverseNode: any = {
        id: inverseId,
        type: "point",
        parentId: groupId,
        position: { x: padding + nodeWidth + gapWidth, y: padding },
        extent: "parent",
        expandParent: false,
        draggable: false,
        data: {
          content: storedInverse,
          favor: 5,
          createdAt: now,
          directInverse: true,
          groupId,
        },
        selected: false,
      };

      const updatedOriginalNode = {
        id: pointNode.id,
        type: pointNode.type,
        data: {
          ...pointNode.data,
          originalInPair: true,
          groupId,
          inverseGenerated: true,
          inverseContent: storedInverse,
        },
        parentId: groupId,
        position: { x: padding, y: padding },
        extent: "parent",
        expandParent: false,
        draggable: false,
        selected: false,
        measured: undefined,
        width: undefined,
        height: undefined,
        positionAbsolute: undefined,
      };

      if (yNodesMap && ydoc && canWrite) {
        ydoc.transact(() => {
          yNodesMap.set(groupId, groupNode);
          yNodesMap.set(pointNodeId, updatedOriginalNode);
          yNodesMap.set(inverseId, inverseNode);
          if (yTextMap && !yTextMap.get(inverseId)) {
            const t = new (Y as any).Text();
            if (storedInverse) t.insert(0, storedInverse);
            yTextMap.set(inverseId, t);
            try {
              registerTextInUndoScope?.(t);
            } catch {}
          }
        }, localOrigin);
      }

      setNodes((nds) =>
        nds
          .filter((n: any) => n.id !== pointNodeId)
          .concat([groupNode, updatedOriginalNode, inverseNode])
      );

      // equalize heights pass is kept as before
      try {
        setTimeout(() => {
          const origEl = document.querySelector(
            `[data-id="${pointNodeId}"]`
          ) as HTMLElement | null;
          const invEl = document.querySelector(
            `[data-id="${inverseId}"]`
          ) as HTMLElement | null;
          if (!origEl || !invEl) return;
          const h1 = origEl.getBoundingClientRect().height;
          const h2 = invEl.getBoundingClientRect().height;
          const maxH = Math.max(Math.floor(h1), Math.floor(h2));
          if (
            yNodesMap &&
            ydoc &&
            canWrite &&
            Number.isFinite(maxH) &&
            maxH > 0
          ) {
            ydoc.transact(() => {
              const oBase = yNodesMap.get(pointNodeId);
              const iBase = yNodesMap.get(inverseId);
              const gBase = yNodesMap.get(groupId);
              // removed pairHeight writebacks to avoid force-resizing child nodes; group height remains
              if (gBase) {
                const newH = padding * 2 + maxH;
                yNodesMap.set(groupId, {
                  ...gBase,
                  height: newH,
                  style: { ...((gBase as any).style || {}), height: newH },
                } as any);
              }
            }, localOrigin);
          }
        }, 0);
      } catch {}

      return;
    }

    const now = Date.now();
    const groupId = `group-${now}-${Math.floor(Math.random() * 1e6)}`;
    const inverseId = `inverse-${now}-${Math.floor(Math.random() * 1e6)}`;

    const originalContent = pointNode.data?.content || "";
    const inverseContent = "Generating...";

    // Use measured dimensions from React Flow if available, otherwise use component constraints
    let nodeWidth = 220; // fallback
    let nodeHeight = 80; // fallback

    // First try React Flow's measured dimensions (more reliable than DOM queries)
    if (
      pointNode?.measured?.width &&
      typeof pointNode.measured.width === "number"
    ) {
      nodeWidth = Math.ceil(pointNode.measured.width);
    }
    if (
      pointNode?.measured?.height &&
      typeof pointNode.measured.height === "number"
    ) {
      nodeHeight = Math.ceil(pointNode.measured.height);
    }

    // If no measured dimensions, use component constraints to avoid DOM timing issues
    if (nodeWidth === 220) {
      // PointNode has max-w-[320px], so use a reasonable estimate
      nodeWidth = Math.min(
        280,
        Math.max(200, pointNode?.data?.content?.length * 8 || 200)
      );
    }

    const padding = 8; // Match GroupNode leftPadding
    const maxPointWidth = 320; // match PointNode max-w-[320px]
    const gapWidth = 25; // Match GroupNode gap between children
    const containerWidth = padding + nodeWidth + gapWidth + nodeWidth + padding; // left + leftNode + gap + rightNode + right
    const containerHeight = nodeHeight + padding * 8;

    const groupPosition = {
      x: pointNode.position.x - padding,
      y: pointNode.position.y - padding,
    };

    const groupNode: any = {
      id: groupId,
      type: "group",
      position: groupPosition,
      data: { label: "", isNew: true, openingSince: now },
      width: containerWidth,
      height: containerHeight,
      style: { width: containerWidth, height: containerHeight, padding: 8 },
      draggable: true,
      dragHandle: ".group-drag-handle",
      selectable: true,
      resizable: false,
    };

    const inverseNode: any = {
      id: inverseId,
      type: "point",
      parentId: groupId,
      position: { x: padding + nodeWidth + gapWidth, y: padding }, // Right node positioned with gap
      extent: "parent",
      expandParent: false,
      draggable: false,
      data: {
        content: inverseContent,
        favor: 5,
        createdAt: now,
        directInverse: true,
        groupId,
      },
      selected: false,
    };

    const updatedOriginalNode = {
      id: pointNode.id,
      type: pointNode.type,
      data: {
        ...pointNode.data,
        originalInPair: true,
        groupId,
        inverseGenerated: true,
      },
      parentId: groupId,
      position: { x: padding, y: padding }, // Left node at padding
      extent: "parent",
      expandParent: false,
      draggable: false,
      selected: false,
      measured: undefined,
      width: undefined,
      height: undefined,
      positionAbsolute: undefined,
    };

    // Sync to Yjs in correct order (commit shared state first)
    if (yNodesMap && ydoc && canWrite) {
      ydoc.transact(() => {
        // Add group first
        yNodesMap.set(groupId, groupNode);

        // Then add/update children with parentId references
        yNodesMap.set(pointNodeId, updatedOriginalNode);
        yNodesMap.set(inverseId, inverseNode);

        // Create Y.Text for the new inverse node
        if (yTextMap && !yTextMap.get(inverseId)) {
          const t = new Y.Text();
          t.insert(0, inverseContent);
          yTextMap.set(inverseId, t);
          try {
            registerTextInUndoScope?.(t);
          } catch {}
        }
      }, localOrigin);
    }

    // Update local state after shared state has been committed
    setNodes((nds) =>
      nds
        .filter((n: any) => n.id !== pointNodeId)
        .concat([groupNode, updatedOriginalNode, inverseNode])
    );

    generateInversePoint(originalContent)
      .then((aiContent) => {
        if (yTextMap && ydoc && canWrite) {
          ydoc.transact(() => {
            const t = yTextMap.get(inverseId);
            if (t) {
              const curr = t.toString();
              if (curr !== aiContent) {
                // eslint-disable-next-line drizzle/enforce-delete-with-where
                if (curr && curr.length) t.delete(0, curr.length);
                if (aiContent) t.insert(0, aiContent);
              }
            }
            // Persist inverse content on the original node
            const oBase = yNodesMap.get(pointNodeId);
            if (oBase) {
              yNodesMap.set(pointNodeId, {
                ...oBase,
                data: {
                  ...(oBase.data || {}),
                  inverseContent: aiContent,
                  inverseGenerated: true,
                },
              });
            }
          }, localOrigin);
        }
      })
      .catch(() => {
        // Fallback to "Not X"
        if (yTextMap && ydoc && canWrite) {
          ydoc.transact(() => {
            const t = yTextMap.get(inverseId);
            if (t) {
              const fallback = `Not ${originalContent}`;
              const curr = t.toString();
              if (curr !== fallback) {
                // eslint-disable-next-line drizzle/enforce-delete-with-where
                if (curr && curr.length) t.delete(0, curr.length);
                if (fallback) t.insert(0, fallback);
              }
            }
            const oBase = yNodesMap.get(pointNodeId);
            if (oBase) {
              const fallback = `Not ${originalContent}`;
              yNodesMap.set(pointNodeId, {
                ...oBase,
                data: {
                  ...(oBase.data || {}),
                  inverseContent: fallback,
                  inverseGenerated: true,
                },
              });
            }
          }, localOrigin);
        }
      });

    // One-time equalize heights after initial render
    try {
      setTimeout(() => {
        const origEl = document.querySelector(
          `[data-id="${pointNodeId}"]`
        ) as HTMLElement | null;
        const invEl = document.querySelector(
          `[data-id="${inverseId}"]`
        ) as HTMLElement | null;
        if (!origEl || !invEl) return;
        const h1 = origEl.getBoundingClientRect().height;
        const h2 = invEl.getBoundingClientRect().height;
        const maxH = Math.max(Math.floor(h1), Math.floor(h2));
        if (
          yNodesMap &&
          ydoc &&
          canWrite &&
          Number.isFinite(maxH) &&
          maxH > 0
        ) {
          ydoc.transact(() => {
            const gBase = yNodesMap.get(groupId);
            if (gBase) {
              const newH = padding * 2 + maxH;
              yNodesMap.set(groupId, {
                ...gBase,
                height: newH,
                style: { ...((gBase as any).style || {}), height: newH },
              } as any);
            }
          }, localOrigin);
        }
      }, 0);
    } catch {}
  };
};

