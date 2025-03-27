"use client";

import { AppEdge } from "@/components/graph/AppEdge";
import { AppNode } from "@/components/graph/AppNode";
import { PLACEHOLDER_STATEMENT } from "@/constants/config";
import { getSpaceFromPathname } from "@/lib/negation-game/getSpaceFromPathname";
import { ReactFlowJsonObject } from "@xyflow/react";
import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";

const createSpaceSpecificStorage = () => {
  // Use the built-in JSON storage as the base
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
>;

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
    //
    // This ensures a single source of truth through the atoms
  }
};
