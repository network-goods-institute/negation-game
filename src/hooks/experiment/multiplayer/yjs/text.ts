import * as Y from "yjs";
import { Node } from "@xyflow/react";

export const mergeNodesWithText = (
  nodes: Node[],
  yTextMap: Y.Map<Y.Text> | null,
  prevById?: Map<string, any>
): Node[] => {
  if (!yTextMap) return nodes;
  return nodes.map((n: any) => {
    const t = yTextMap.get(n.id) as Y.Text | undefined;
    const prev = prevById?.get(n.id);
    // Start from a sanitized base: never take 'selected' from incoming Yjs node or bad shit happens
    const base = (() => {
      const { selected: _sel, dragging: _drag, ...rest } = n as any;
      const lockedDrag =
        rest?.type === "group" || Boolean((rest as any)?.parentId);
      return {
        ...(rest as any),
        draggable: lockedDrag ? false : (rest as any)?.draggable,
      } as any;
    })();
    if (t) {
      const textVal = t.toString();
      if (base.type === "statement") {
        const curr = base.data?.statement ?? "";
        const nn =
          curr === textVal
            ? (base as Node)
            : ({ ...base, data: { ...base.data, statement: textVal } } as Node);
        return prev && prev.selected
          ? ({ ...(nn as any), selected: true } as Node)
          : ({ ...(nn as any), selected: false } as Node);
      }
      const curr = base.data?.content ?? "";
      const nn =
        curr === textVal
          ? (base as Node)
          : ({ ...base, data: { ...base.data, content: textVal } } as Node);
      return prev && prev.selected
        ? ({ ...(nn as any), selected: true } as Node)
        : ({ ...(nn as any), selected: false } as Node);
    }
    if (prevById) {
      if (prev && prev.data) {
        if (base.type === "statement") {
          const prevText = prev.data?.statement;
          const nn =
            prevText == null
              ? (base as Node)
              : ({
                  ...base,
                  data: { ...base.data, statement: prevText },
                } as Node);
          return prev && prev.selected
            ? ({ ...(nn as any), selected: true } as Node)
            : ({ ...(nn as any), selected: false } as Node);
        }
        const prevText = prev.data?.content;
        const nn =
          prevText == null
            ? (base as Node)
            : ({ ...base, data: { ...base.data, content: prevText } } as Node);
        return prev && prev.selected
          ? ({ ...(nn as any), selected: true } as Node)
          : ({ ...(nn as any), selected: false } as Node);
      }
    }
    return prev && prev.selected
      ? ({ ...(base as any), selected: true } as Node)
      : ({ ...(base as any), selected: false } as Node);
  });
};
