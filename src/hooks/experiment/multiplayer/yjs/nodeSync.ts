import type { CSSProperties, MutableRefObject } from "react";
import * as Y from "yjs";
import { Node } from "@xyflow/react";
import { mergeNodesWithText } from "./text";

const toComparableNode = (node: Node) => {
  const { id, type, position, data, width, height, style } = node;
  const { content, statement, ...rest } = data ?? {};
  const styleObj = style as CSSProperties | undefined;
  const widthValue =
    typeof width === "number"
      ? width
      : typeof styleObj?.width === "number"
        ? styleObj.width
        : null;
  const heightValue =
    typeof height === "number"
      ? height
      : typeof styleObj?.height === "number"
        ? styleObj.height
        : null;
  return {
    id,
    type,
    position,
    width: widthValue,
    height: heightValue,
    data: rest,
  };
};

export const createUpdateNodesFromY = (
  yNodes: Y.Map<Node>,
  yTextMapRef: MutableRefObject<Y.Map<Y.Text> | null>,
  lastNodesSigRef: MutableRefObject<string>,
  setNodes: (updater: (nodes: Node[]) => Node[]) => void,
  localOriginRef?: MutableRefObject<unknown>
) => {
  const knownNodeIds = new Set<string>();

  return (_event: Y.YMapEvent<Node>, transaction: Y.Transaction) => {
    if (localOriginRef && transaction.origin === localOriginRef.current) {
      return;
    }

    const nodes = Array.from(yNodes.values());
    const migrations: Node[] = [];

    const normalised = nodes.map((node) => {
      if (node.type === "question") {
        const migrated: Node = { ...node, type: "statement" };
        migrations.push(migrated);
        return migrated;
      }
      return node;
    });

    if (migrations.length > 0) {
      try {
        const doc = yNodes.doc;
        if (doc) {
          doc.transact(() => {
            migrations.forEach((node) => yNodes.set(node.id, node));
          }, localOriginRef?.current ?? "migration:nodes");
        } else {
          migrations.forEach((node) => yNodes.set(node.id, node));
        }
      } catch {}
    }

    try {
      const currentIds = new Set(normalised.map((node) => node.id));
      knownNodeIds.forEach((id) => {
        if (!currentIds.has(id)) {
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          knownNodeIds.delete(id);
        }
      });
      currentIds.forEach((id) => knownNodeIds.add(id));
    } catch {}

    const sorted = [...normalised].sort((a, b) => (a.id || "").localeCompare(b.id || ""));
    const signature = JSON.stringify(sorted.map(toComparableNode));

    if (signature === lastNodesSigRef.current) {
      return;
    }

    lastNodesSigRef.current = signature;

    setNodes((previous) =>
      mergeNodesWithText(
        sorted,
        yTextMapRef.current,
        new Map(previous.map((node) => [node.id, node]))
      )
    );
  };
};
