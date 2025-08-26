import * as Y from "yjs";

export const createUndoManager = (
  yNodes: Y.Map<any>,
  yEdges: Y.Map<any>,
  localOrigin?: any
) => {
  const trackedOrigins = new Set<any>();
  if (localOrigin) trackedOrigins.add(localOrigin);
  trackedOrigins.add(null as any);
  const um = new Y.UndoManager([yNodes, yEdges], { trackedOrigins });
  return um;
};

export const addTextToUndoScope = (um: Y.UndoManager, yTextMap: Y.Map<any>) => {
  try {
    for (const [, val] of yTextMap as any) {
      if (val instanceof (Y as any).Text) um.addToScope(val);
    }
  } catch {}
};
