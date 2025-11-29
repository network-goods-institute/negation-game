import * as Y from "yjs";
import { Node, Edge } from "@xyflow/react";

/**
 * Yjs document type for the multiplayer graph
 */
export type YjsDoc = Y.Doc;

/**
 * Yjs map type for nodes
 */
export type YNodesMap = Y.Map<Node>;

/**
 * Yjs map type for edges
 */
export type YEdgesMap = Y.Map<Edge>;

/**
 * Yjs map type for text content
 */
export type YTextMap = Y.Map<Y.Text>;

/**
 * Yjs map type for metadata
 */
export type YMetaMap = Y.Map<any>;

/**
 * Node update function type
 */
export type NodesUpdater = (updater: (nodes: Node[]) => Node[]) => void;

/**
 * Edge update function type
 */
export type EdgesUpdater = (updater: (edges: Edge[]) => Edge[]) => void;

/**
 * Lock checking function type
 */
export type IsLockedForMe = (nodeId: string) => boolean;

/**
 * Lock owner getter type
 */
export type GetLockOwner = (nodeId: string) => { name?: string } | null;

/**
 * Viewport offset getter type
 */
export type GetViewportOffset = () => { x: number; y: number };

/**
 * Preferred edge type getter
 */
export type GetPreferredEdgeType = (params: {
  parent: Node;
}) => "support" | "negation";

/**
 * Edge created callback type
 */
export type OnEdgeCreated = (result: {
  nodeId: string;
  edgeId: string;
  edgeType: string;
}) => void;

/**
 * Show undo hint callback type
 */
export type OnShowUndoHint = (position: { x: number; y: number }) => void;
