type EdgeLike = {
  id: string;
  type?: string;
  source?: string;
  target?: string;
  data?: { type?: string; edgeType?: string } | null;
};

type StoreLike = {
  edges?: EdgeLike[] | Map<string, EdgeLike>;
  edgeLookup?: Map<string, EdgeLike>;
  connectionLookup?: Map<string, Map<string, { edgeId: string }>>;
};

const normalizeEdgeType = (edge: EdgeLike | undefined): string =>
  String(edge?.type ?? edge?.data?.type ?? edge?.data?.edgeType ?? '').toLowerCase();

const getEdgesList = (store: StoreLike): EdgeLike[] => {
  const edgesRaw = store.edges;
  if (Array.isArray(edgesRaw)) return edgesRaw;
  if (edgesRaw && typeof (edgesRaw as Map<string, EdgeLike>).values === 'function') {
    return Array.from((edgesRaw as Map<string, EdgeLike>).values());
  }
  if (store.edgeLookup) return Array.from(store.edgeLookup.values());
  return [];
};

type ConnectionRole = 'any' | 'source' | 'target';

export const getConnectedEdgesForNode = (
  store: StoreLike,
  nodeId: string,
  role: ConnectionRole = 'any'
): EdgeLike[] => {
  const nodeKey = String(nodeId);
  const connectionLookup = store.connectionLookup;
  const edgeLookup = store.edgeLookup;
  const connected = new Map<string, EdgeLike>();

  if (connectionLookup && edgeLookup) {
    const lookupKey = role === 'any' ? nodeKey : `${nodeKey}-${role}`;
    const connections = connectionLookup.get(lookupKey);
    if (connections && connections.size > 0) {
      connections.forEach((conn) => {
        const edge = edgeLookup.get(conn.edgeId);
        if (edge) connected.set(edge.id, edge);
      });
    }
  }

  const edges = getEdgesList(store);
  if (!edges.length) return [];

  edges.forEach((edge) => {
    const sourceId = String(edge?.source ?? '');
    const targetId = String(edge?.target ?? '');
    if (role === 'source' && sourceId !== nodeKey) return;
    if (role === 'target' && targetId !== nodeKey) return;
    if (role === 'any' && sourceId !== nodeKey && targetId !== nodeKey) return;
    connected.set(edge.id, edge);
  });
  return Array.from(connected.values());
};

export const nodeHasConnectedEdgeType = (
  store: StoreLike,
  nodeId: string,
  edgeType: string,
  role: ConnectionRole = 'any'
): boolean => {
  const desired = String(edgeType).toLowerCase();
  return getConnectedEdgesForNode(store, nodeId, role).some(
    (edge) => normalizeEdgeType(edge) === desired
  );
};

export const nodeIsPointLikeByObjectionRules = (
  store: StoreLike,
  nodeId: string
): boolean => {
  if (nodeHasConnectedEdgeType(store, nodeId, 'negation')) return true;
  return !nodeHasConnectedEdgeType(store, nodeId, 'objection');
};
