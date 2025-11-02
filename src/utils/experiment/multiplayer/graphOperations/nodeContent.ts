/* eslint-disable drizzle/enforce-delete-with-where */
import * as Y from "yjs";
import { ORIGIN } from "@/hooks/experiment/multiplayer/yjs/origins";
import { toast } from "sonner";

import { getDefaultContentForType } from "./shared";

export const createUpdateNodeContent = (
  yTextMap: any,
  ydoc: any,
  canWrite: boolean,
  localOrigin: object,
  setNodes: (updater: (nodes: any[]) => any[]) => void
) => {
  return (nodeId: string, content: string) => {
    if (!canWrite) {
      toast.warning("Read-only mode: Changes won't be saved");
      return;
    }

    if (yTextMap && ydoc && canWrite) {
      ydoc.transact(() => {
        let t = yTextMap.get(nodeId);
        if (!t) {
          t = new Y.Text();
          if (t) {
            yTextMap.set(nodeId, t);
          }
        }
        if (t) {
          const curr = t.toString();
          if (curr === content) return;
          let start = 0;
          while (
            start < curr.length &&
            start < content.length &&
            curr[start] === content[start]
          )
            start++;
          let endCurr = curr.length - 1;
          let endNew = content.length - 1;
          while (
            endCurr >= start &&
            endNew >= start &&
            curr[endCurr] === content[endNew]
          ) {
            endCurr--;
            endNew--;
          }
          const deleteLen = Math.max(0, endCurr - start + 1);
          if (deleteLen > 0) t.delete(start, deleteLen);
          const insertText = content.slice(start, endNew + 1);
          if (insertText.length > 0) t.insert(start, insertText);
        }
      }, localOrigin);
    } else {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data:
                  n.type === "statement"
                    ? { ...n.data, statement: content }
                    : { ...n.data, content },
              }
            : n
        )
      );
    }
  };
};

export const createUpdateNodeHidden = (
  yNodesMap: any,
  ydoc: any,
  canWrite: boolean,
  localOrigin: object,
  setNodes: (updater: (nodes: any[]) => any[]) => void
) => {
  return (nodeId: string, hidden: boolean) => {
    if (!canWrite) {
      toast.warning("Read-only mode: Changes won't be saved");
      return;
    }
    let nextFromState: any | null = null;
    setNodes((nds) => {
      const updated = nds.map((n: any) => {
        if (n.id !== nodeId) return n;
        const nn = { ...n, data: { ...(n.data || {}), hidden } };
        nextFromState = nn;
        return nn;
      });
      return updated;
    });
    if (yNodesMap && ydoc && canWrite) {
      const base = nextFromState || yNodesMap.get(nodeId);
      if (base) {
        ydoc.transact(() => {
          yNodesMap.set(nodeId, base);
        }, localOrigin);
      }
    }
  };
};

export const createUpdateNodePosition = (
  yNodesMap: any,
  ydoc: any,
  canWrite: boolean,
  localOrigin: object,
  setNodes: (updater: (nodes: any[]) => any[]) => void,
  connectMode?: boolean
) => {
  const eps = 0.01;
  return (nodeId: string, x: number, y: number) => {
    if (!canWrite) {
      toast.warning("Read-only mode: Changes won't be saved");
      return;
    }
    if (connectMode) {
      return;
    }
    let changedLocally = false;
    setNodes((nds) =>
      nds.map((n: any) => {
        if (n.id !== nodeId) return n;
        const px = n.position?.x ?? 0;
        const py = n.position?.y ?? 0;
        if (Math.abs(px - x) < eps && Math.abs(py - y) < eps) return n;
        changedLocally = true;
        return { ...n, position: { x, y } };
      })
    );
    if (!changedLocally) return;
    if (yNodesMap && ydoc && canWrite) {
      ydoc.transact(() => {
        const base = yNodesMap.get(nodeId);
        if (base) {
          yNodesMap.set(nodeId, { ...base, position: { x, y } });
        }
      }, ORIGIN.RUNTIME);
    }
  };
};

const isDefaultMarker = (content: string): boolean => {
  const defaultMarkers = [
    "New point",
    "New Question",
    "New Title",
    "New mitigation",
    "New comment",
  ];
  return defaultMarkers.includes(content);
};

export const createUpdateNodeType = (
  yNodesMap: any,
  yTextMap: any,
  ydoc: any,
  canWrite: boolean,
  localOrigin: object,
  setNodes: (updater: (nodes: any[]) => any[]) => void
) => {
  return (
    nodeId: string,
    newType: "point" | "statement" | "title" | "objection" | "comment"
  ) => {
    if (!canWrite) {
      toast.warning("Read-only mode: Changes won't be saved");
      return;
    }

    setNodes((nds) =>
      nds.map((n: any) => {
        if (n.id !== nodeId) return n;

        const currentContent =
          n.type === "statement" ? n.data?.statement : n.data?.content;
        const defaultContent = getDefaultContentForType(newType);
        // If switching types and current content is a default marker, use the new default
        const finalContent =
          currentContent && isDefaultMarker(currentContent)
            ? defaultContent
            : currentContent || defaultContent;
        const newData =
          newType === "statement"
            ? {
                statement: finalContent,
                content: undefined,
                nodeType: undefined,
              }
            : {
                content: finalContent,
                statement: undefined,
                nodeType: undefined,
              };

        return {
          ...n,
          type: newType,
          data: { ...newData, createdAt: Date.now() },
          selected: true,
        };
      })
    );

    if (yNodesMap && ydoc && canWrite) {
      ydoc.transact(() => {
        const base = yNodesMap.get(nodeId);
        if (base) {
          const currentContent =
            base.type === "statement"
              ? base.data?.statement
              : base.data?.content;
          const defaultContent = getDefaultContentForType(newType);
          // If switching types and current content is a default marker, use the new default
          const finalContent =
            currentContent && isDefaultMarker(currentContent)
              ? defaultContent
              : currentContent || defaultContent;
          const newData =
            newType === "statement"
              ? {
                  statement: finalContent,
                  content: undefined,
                  nodeType: undefined,
                }
              : {
                  content: finalContent,
                  statement: undefined,
                  nodeType: undefined,
                };

          yNodesMap.set(nodeId, {
            ...base,
            type: newType,
            data: { ...newData, createdAt: Date.now() },
            selected: true,
          });

          if (yTextMap) {
            let t = yTextMap.get(nodeId);
            if (!t) {
              t = new Y.Text();
              yTextMap.set(nodeId, t);
            }
            const newContent =
              newType === "statement" ? newData.statement : newData.content;
            const curr = t.toString();
            if (curr !== newContent) {
              if (curr && curr.length) t.delete(0, curr.length);
              if (newContent) t.insert(0, newContent);
            }
          }
        }
      }, localOrigin);
    }
  };
};
