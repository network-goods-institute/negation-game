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
    if (t) {
      const textVal = t.toString();
      if (n.type === "statement") {
        const curr = n.data?.statement ?? "";
        return curr === textVal
          ? (n as Node)
          : ({ ...n, data: { ...n.data, statement: textVal } } as Node);
      }
      const curr = n.data?.content ?? "";
      return curr === textVal
        ? (n as Node)
        : ({ ...n, data: { ...n.data, content: textVal } } as Node);
    }
    if (prevById) {
      const prev = prevById.get(n.id);
      if (prev && prev.data) {
        if (n.type === "statement") {
          const prevText = prev.data?.statement;
          return prevText == null
            ? (n as Node)
            : ({ ...n, data: { ...n.data, statement: prevText } } as Node);
        }
        const prevText = prev.data?.content;
        return prevText == null
          ? (n as Node)
          : ({ ...n, data: { ...n.data, content: prevText } } as Node);
      }
    }
    return n as Node;
  });
};
