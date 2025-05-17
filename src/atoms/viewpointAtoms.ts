"use client";

import { AppEdge } from "@/components/graph/AppEdge";
import { AppNode } from "@/components/graph/AppNode";
import { PLACEHOLDER_STATEMENT } from "@/constants/config";
import { getSpaceFromPathname } from "@/lib/negation-game/getSpaceFromPathname";
import { ReactFlowJsonObject, Edge } from "@xyflow/react";
import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";

const createSpaceSpecificStorage = () => {
  const baseStorage = typeof window !== "undefined" ? localStorage : null;

  return createJSONStorage<string>(() => ({
    getItem: (key: string) => {
      if (!baseStorage) return null;

      const pathname =
        typeof window !== "undefined" ? window.location.pathname : "";
      const space = getSpaceFromPathname(pathname);
      const spaceKey = space ? `${space}:${key}` : key;

      return baseStorage.getItem(spaceKey);
    },
    setItem: (key: string, value: string) => {
      if (!baseStorage) return;

      const pathname =
        typeof window !== "undefined" ? window.location.pathname : "";
      const space = getSpaceFromPathname(pathname);
      const spaceKey = space ? `${space}:${key}` : key;

      baseStorage.setItem(spaceKey, value);
    },
    removeItem: (key: string) => {
      if (!baseStorage) return;

      const pathname =
        typeof window !== "undefined" ? window.location.pathname : "";
      const space = getSpaceFromPathname(pathname);
      const spaceKey = space ? `${space}:${key}` : key;

      baseStorage.removeItem(spaceKey);
    },
  }));
};

const storage = createSpaceSpecificStorage();

export const viewpointStatementAtom = atomWithStorage<string>(
  "viewpointStatement",
  "",
  storage,
  { getOnInit: true }
);

export const viewpointReasoningAtom = atomWithStorage<string>(
  "viewpointReasoning",
  "",
  storage,
  { getOnInit: true }
);

export type ViewpointGraph = Pick<
  ReactFlowJsonObject<AppNode, AppEdge>,
  "nodes" | "edges"
> & {
  /** Optional free-form description attached to the graph */
  description?: string;
  /** Optional linked URL for source material */
  linkUrl?: string;
  /** Optional topic tag for the rationale */
  topic?: string;
};

export const initialViewpointGraph: ViewpointGraph = {
  nodes: [
    {
      id: "statement",
      type: "statement",
      position: { x: 250, y: 250 },
      data: { statement: PLACEHOLDER_STATEMENT },
    },
  ],
  edges: [],
  description: "",
  linkUrl: "",
  topic: "",
};

export const viewpointGraphAtom = atom(
  (get) => {
    const graph = get(viewpointGraphStorageAtom);
    return graph
      ? (JSON.parse(graph) as ViewpointGraph)
      : initialViewpointGraph;
  },
  (_get, set, graph: ViewpointGraph) => {
    set(viewpointGraphStorageAtom, JSON.stringify(graph));
  }
);

export const viewpointGraphStorageAtom = atomWithStorage<string>(
  "viewpointGraph",
  JSON.stringify(initialViewpointGraph),
  storage,
  { getOnInit: true }
);

export const collapsedPointIdsAtom = atom<Set<number>>(new Set<number>());

export interface CollapsedNodePosition {
  pointId: number;
  x: number;
  y: number;
  parentId?: string | number;
}

export const collapsedNodePositionsAtom = atom<CollapsedNodePosition[]>([]);

export const selectedPointIdsAtom = atom<Set<number>>(new Set<number>());

// Atom to store undo information for node collapses
export interface UndoCollapseState {
  topLevelNodeId: string; // ID of the node the user actually clicked to collapse
  nodesToRestore: AppNode[]; // All nodes removed (including descendants)
  edgesToRestore: Edge[]; // All edges removed
  expandedNodeIds: string[]; // Add array of node IDs that had expanded children
}
export const undoCollapseStackAtom = atom<UndoCollapseState[]>([]);

export const clearViewpointState = (isPublishing = true) => {
  // If we have access to the window, handle the justPublished flag
  if (typeof window !== "undefined") {
    // Only set justPublished when actually publishing
    if (isPublishing) {
      window.localStorage.setItem("justPublished", "true");
    }

    // The actual clearing of atom state should be done by the
    // component that calls this function by using the atom setters:
    //   setStatement("")
    //   setReasoning("")
    //   setGraph(initialViewpointGraph)
    //   setCollapsedPointIds(new Set())
    //   setTopic("")
    //
    // This ensures a single source of truth through the atoms
  }
};

export const copiedFromIdAtom = atom<string | undefined>(undefined);

export const viewpointTopicAtom = atomWithStorage<string>(
  "viewpointTopic",
  "",
  storage,
  { getOnInit: true }
);
