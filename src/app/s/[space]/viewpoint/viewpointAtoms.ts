"use client";

import { AppEdge } from "@/components/graph/AppEdge";
import { AppNode } from "@/components/graph/AppNode";
import { PLACEHOLDER_STATEMENT } from "@/constants/config";
import { ReactFlowJsonObject } from "@xyflow/react";
import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";

const storage = createJSONStorage<string>(() => {
  if (typeof window !== "undefined") {
    return localStorage;
  }
  // Return a dummy storage for SSR
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
});

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
      position: { x: 100, y: 100 },
      type: "statement",
      data: { statement: PLACEHOLDER_STATEMENT },
    },
  ],
  edges: [],
};

export const viewpointGraphAtom = atom(
  (get) => {
    const graph = get(viewpointGraphStorageAtom);
    return JSON.parse(graph) as ViewpointGraph;
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
