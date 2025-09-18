/* eslint-disable drizzle/enforce-delete-with-where */
import * as Y from "yjs";
import { toast } from "sonner";

import { getDefaultContentForType } from "./shared";

export const createUpdateNodeContent = (
  yTextMap: any,
  ydoc: any,
  canWrite: boolean,
  localOrigin: object,
  setNodes: (updater: (nodes: any[]) => any[]) => void,
  registerTextInUndoScope?: (t: any) => void
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
            try {
              registerTextInUndoScope?.(t);
            } catch {}
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

export const createUpdateNodeType = (
  yNodesMap: any,
  yTextMap: any,
  ydoc: any,
  canWrite: boolean,
  localOrigin: object,
  setNodes: (updater: (nodes: any[]) => any[]) => void,
  registerTextInUndoScope?: (t: any) => void
) => {
  return (
    nodeId: string,
    newType: "point" | "statement" | "title" | "objection"
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
        const newData =
          newType === "statement"
            ? {
                statement: currentContent || defaultContent,
                content: undefined,
                nodeType: undefined,
              }
            : {
                content: currentContent || defaultContent,
                statement: undefined,
                nodeType: undefined,
              };

        return {
          ...n,
          type: newType,
          data: newData,
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
          const newData =
            newType === "statement"
              ? {
                  statement: currentContent || defaultContent,
                  content: undefined,
                  nodeType: undefined,
                }
              : {
                  content: currentContent || defaultContent,
                  statement: undefined,
                  nodeType: undefined,
                };

          yNodesMap.set(nodeId, {
            ...base,
            type: newType,
            data: newData,
          });

          if (yTextMap) {
            let t = yTextMap.get(nodeId);
            if (!t) {
              t = new Y.Text();
              yTextMap.set(nodeId, t);
              try {
                registerTextInUndoScope?.(t);
              } catch {}
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

/* eslint-enable drizzle/enforce-delete-with-where */
