import * as Y from "yjs";

export const createUndoManager = (
  yNodes: Y.Map<any>,
  yEdges: Y.Map<any>,
  yTextMap?: Y.Map<any> | null,
  localOrigin?: any
) => {
  // Per-user undo: only track this client's origin; merge quick edits together.
  const trackedOrigins = new Set<any>();
  if (localOrigin) trackedOrigins.add(localOrigin);
  // Also track null-origin transactions so programmatic inserts/initial states are undoable when needed
  trackedOrigins.add(null as any);
  const scope: any[] = [yNodes, yEdges];
  if (yTextMap) scope.push(yTextMap);
  const um = new Y.UndoManager(scope as any, {
    trackedOrigins,
    captureTimeout: 800,
  });
  return um;
};

export const addTextToUndoScope = (um: Y.UndoManager, yTextMap: Y.Map<any>) => {
  try {
    for (const [, val] of yTextMap as any) {
      if (val instanceof (Y as any).Text) um.addToScope(val);
    }
  } catch {}
};
