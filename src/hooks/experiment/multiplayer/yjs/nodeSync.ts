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
  localOriginRef?: MutableRefObject<unknown>,
  isUndoRedoRef?: MutableRefObject<boolean>,
  isLockedForMe?: (nodeId: string) => boolean,
  onRemoteNodesAdded?: (nodeIds: string[]) => void
) => {
  const knownNodeIds = new Set<string>();

  return (_event: Y.YMapEvent<Node>, transaction: Y.Transaction) => {
    const isLocalOrigin =
      localOriginRef && transaction.origin === localOriginRef.current;
    const wasEmpty = knownNodeIds.size === 0;

    const nodes = Array.from(yNodes.values());
    const migrations: Array<{ migrated: Node; seedText: string | null }> = [];

    const normalised = nodes.map((node) => {
      if (node.type === "question" || node.type === "title") {
        const data = (node as any)?.data ?? {};
        const legacyStatement = typeof data.statement === 'string' ? String(data.statement) : '';
        const legacyContent = typeof data.content === 'string' ? String(data.content) : '';
        const textForStatement = (legacyStatement || legacyContent || '').trim();

        const migrated: Node = {
          ...node,
          type: "statement",
          data: {
            ...data,
            statement: textForStatement || legacyStatement || data.statement,
          },
        } as Node;
        migrations.push({ migrated, seedText: textForStatement || null });
        return migrated;
      }
      return node;
    });

    if (migrations.length > 0) {
      try {
        const doc = yNodes.doc;
        if (doc) {
          doc.transact(() => {
            migrations.forEach(({ migrated, seedText }) => {
              yNodes.set(migrated.id, migrated);
              const yTextMap = yTextMapRef.current;
              if (yTextMap && typeof (yTextMap as any).get === 'function' && seedText) {
                const existing = yTextMap.get(migrated.id);
                if (existing instanceof (require('yjs') as typeof import('yjs')).Text) {
                  const current = existing.toString();
                  if (!current) {
                    existing.insert(0, seedText);
                  }
                } else {
                  const Y = require('yjs') as typeof import('yjs');
                  const t = new Y.Text();
                  t.insert(0, seedText);
                  yTextMap.set(migrated.id, t);
                }
              }
            });
          }, localOriginRef?.current ?? "migration:nodes");
        } else {
          migrations.forEach(({ migrated }) => yNodes.set(migrated.id, migrated));
        }
      } catch {}
    }

    let addedIds: string[] = [];
    try {
      const currentIds = new Set(normalised.map((node) => node.id));
      const toDelete: string[] = [];
      knownNodeIds.forEach((id) => {
        if (!currentIds.has(id)) toDelete.push(id);
      });
      for (const id of toDelete) {
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        knownNodeIds.delete(id);
      }
      const newlyAdded: string[] = [];
      currentIds.forEach((id) => {
        if (!knownNodeIds.has(id)) newlyAdded.push(id);
      });
      for (const id of newlyAdded) knownNodeIds.add(id);
      if (!isLocalOrigin && !wasEmpty && newlyAdded.length > 0) {
        const addedSet = new Set(newlyAdded);
        addedIds = normalised
          .filter((n) => addedSet.has(n.id) && (n.type === 'point' || n.type === 'objection'))
          .map((n) => n.id);
      }
    } catch {}

    const sorted = [...normalised].sort((a, b) =>
      (a.id || "").localeCompare(b.id || "")
    );
    const signature = JSON.stringify(sorted.map(toComparableNode));

    if (signature === lastNodesSigRef.current) {
      if (isLocalOrigin && !isUndoRedoRef?.current) {
        return;
      }
    }

    lastNodesSigRef.current = signature;

    if (isLocalOrigin && !isUndoRedoRef?.current) {
      return;
    }

    setNodes((previous) =>
      mergeNodesWithText(
        sorted,
        yTextMapRef.current,
        new Map(previous.map((node) => [node.id, node])),
        isLockedForMe
      )
    );

    if (addedIds.length > 0) {
      try { onRemoteNodesAdded?.(addedIds); } catch {}
    }
  };
};
