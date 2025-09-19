import { Edge, Node } from "@xyflow/react";
import * as Y from "yjs";

export const createUndoManager = (
  yNodes: Y.Map<Node>,
  yEdges: Y.Map<Edge>,
  yTextMap?: Y.Map<Y.Text> | null,
  localOrigin?: unknown
) => {
  // Per-user undo: only track this client's origin; merge quick edits together.
  const trackedOrigins = new Set<unknown>();
  if (localOrigin !== undefined) trackedOrigins.add(localOrigin);
  // Also track null-origin transactions so programmatic inserts/initial states are undoable when needed
  trackedOrigins.add(null);
  const scope: any[] = [yNodes, yEdges];
  if (yTextMap) scope.push(yTextMap);
  const um = new Y.UndoManager(scope as any, {
    trackedOrigins,
    captureTimeout: 800,
  });
  return um;
};

export const addTextToUndoScope = (um: Y.UndoManager, yTextMap: Y.Map<Y.Text>) => {
  try {
    yTextMap.forEach((val) => {
      if (val instanceof Y.Text) um.addToScope(val);
    });
  } catch {}
};
