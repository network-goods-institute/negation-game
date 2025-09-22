import type { MutableRefObject } from "react";
import * as Y from "yjs";
import { Node } from "@xyflow/react";

export const createUpdateNodesFromText = (
  yTextMapRef: MutableRefObject<Y.Map<Y.Text> | null>,
  _localOriginRef: MutableRefObject<unknown>,
  setNodes: (updater: (nodes: Node[]) => Node[]) => void,
  _isUndoRedoRef?: MutableRefObject<boolean>
) => {
  return (_events?: Y.YEvent<Y.Text>[], _transaction?: Y.Transaction) => {
    const textMap = yTextMapRef.current;
    if (!textMap) return;

    let mutated = false;

    setNodes((previous) => {
      const nextNodes = previous.map((node) => {
        const text = textMap.get(node.id);
        if (!text) return node;

        const content = text.toString();
        if (node.type === "statement") {
          if (node.data?.statement === content) return node;
          mutated = true;
          return {
            ...node,
            data: { ...node.data, statement: content },
          };
        }

        if (node.data?.content === content) return node;
        mutated = true;
        return {
          ...node,
          data: { ...node.data, content },
        };
      });

      return mutated ? nextNodes : previous;
    });
  };
};

export const createOnTextMapChange = (
  textMap: Y.Map<Y.Text>,
  undoManagerRef: MutableRefObject<Y.UndoManager | null>
) => {
  return (event: Y.YMapEvent<Y.Text>) => {
    const manager = undoManagerRef.current;
    if (!manager) return;
    try {
      const keys = Array.from(event.changes.keys.keys());
      keys.forEach((key) => {
        const value = textMap.get(key);
        if (value instanceof Y.Text) {
          manager.addToScope(value);
        }
      });
    } catch {}
  };
};
