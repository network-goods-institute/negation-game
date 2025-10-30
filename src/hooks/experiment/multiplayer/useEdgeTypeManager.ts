import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import * as Y from 'yjs';
import { Node, Edge } from '@xyflow/react';
import { createUpdateEdgeType } from '@/utils/experiment/multiplayer/graphOperations';
import type {
  YjsDoc,
  YNodesMap,
  YEdgesMap,
  YTextMap,
  NodesUpdater,
  EdgesUpdater,
  IsLockedForMe,
  GetLockOwner,
} from '@/types/multiplayer';

interface UseEdgeTypeManagerProps {
  nodes: Node[];
  edges: Edge[];
  yNodesMap: YNodesMap | null;
  yEdgesMap: YEdgesMap | null;
  yTextMap: YTextMap | null;
  ydoc: YjsDoc | null;
  canWrite: boolean;
  localOrigin: object;
  setNodes: NodesUpdater;
  setEdges: EdgesUpdater;
  isLockedForMe?: IsLockedForMe;
  getLockOwner?: GetLockOwner;
}

/**
 * Manages edge type switching between support and negation edges.
 * Automatically updates connected node content when edge type changes
 * (e.g., "New Support" → "New Negation" when toggling edge type).
 *
 * @returns Edge type state and update function
 */

const recognizedPlaceholderStrings = new Set(['new option', 'new support', 'new negation', 'new point']);

const getDefaultPointContent = (edgeTypeValue: string, parentType?: string) => {
  if (parentType === 'statement') {
    return 'New Option';
  }
  if (edgeTypeValue === 'support') {
    return 'New Support';
  }
  if (edgeTypeValue === 'negation') {
    return 'New Negation';
  }
  return 'New Point';
};

export const useEdgeTypeManager = ({
  nodes,
  edges,
  yNodesMap,
  yEdgesMap,
  yTextMap,
  ydoc,
  canWrite,
  localOrigin,
  setNodes,
  setEdges,
  isLockedForMe,
  getLockOwner,
}: UseEdgeTypeManagerProps) => {
  const preferredEdgeTypeRef = useRef<'support' | 'negation'>('support');

  const updateEdgeTypeBase = createUpdateEdgeType(
    nodes,
    edges,
    yNodesMap,
    yEdgesMap,
    ydoc,
    canWrite,
    localOrigin,
    setNodes,
    setEdges,
    isLockedForMe,
    getLockOwner
  );

  const updateEdgeType = useCallback((edgeId: string, newType: 'negation' | 'support') => {
    if (!canWrite) {
      toast.warning('Read-only mode: Changes won\'t be saved');
      return;
    }

    const edge = edges.find((edgeItem) => edgeItem.id === edgeId);
    if (!edge) return;
    if (edge.type !== 'support' && edge.type !== 'negation') return;
    if (edge.type === newType) return;

    const parentNode = nodes.find((nodeItem) => nodeItem.id === edge.target);
    const parentType = parentNode?.type;
    const previousDefault = getDefaultPointContent(edge.type, parentType);
    const nextDefault = getDefaultPointContent(newType, parentType);

    updateEdgeTypeBase(edgeId, newType);
    preferredEdgeTypeRef.current = newType;

    const normalizePlaceholder = (value: string) => value.trim().toLowerCase();
    const previousNormalized = normalizePlaceholder(previousDefault);

    setNodes((current) => current.map((nodeItem) => {
      if (nodeItem.id !== edge.source) return nodeItem;
      const currentContent = nodeItem.data?.content;
      if (typeof currentContent !== 'string') return nodeItem;
      const currentNormalized = normalizePlaceholder(currentContent);
      const isRecognizedPlaceholder =
        currentNormalized === previousNormalized ||
        (recognizedPlaceholderStrings.has(currentNormalized) && recognizedPlaceholderStrings.has(previousNormalized));

      if (!isRecognizedPlaceholder) {
        return nodeItem;
      }

      return {
        ...nodeItem,
        data: { ...nodeItem.data, content: nextDefault },
      };
    }));

    if (yTextMap && ydoc) {
      ydoc.transact(() => {
        const textEntry = yTextMap.get(edge.source);
        if (textEntry instanceof Y.Text) {
          const currentText = textEntry.toString().trim().toLowerCase();
          const isRecognizedPlaceholder =
            currentText === previousNormalized ||
            (recognizedPlaceholderStrings.has(currentText) && recognizedPlaceholderStrings.has(previousNormalized));

          if (!isRecognizedPlaceholder) {
            return;
          }
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          textEntry.delete(0, textEntry.length);
          textEntry.insert(0, nextDefault);
        } else if (textEntry == null) {
          const text = new Y.Text();
          text.insert(0, nextDefault);
          yTextMap.set(edge.source, text);
        }
      }, localOrigin);
    }
  }, [canWrite, edges, nodes, updateEdgeTypeBase, setNodes, yTextMap, ydoc, localOrigin]);

  return {
    preferredEdgeTypeRef,
    updateEdgeType,
  };
};
