'use client';

import React, { useMemo } from 'react';
import { GraphProvider } from '../GraphContext';
import { PerfProvider } from '../PerformanceContext';
import { Provider as JotaiProvider } from 'jotai';

export function TutorialGraphProvider({ children }: { children: React.ReactNode }) {
  const mockGraphActions = useMemo(() => ({
    globalMarketOverlays: false,
    currentUserId: undefined,
    updateNodeContent: () => {},
    updateNodePosition: () => {},
    ensureEdgeAnchor: () => {},
    updateNodeHidden: () => {},
    toggleNodeVote: () => {},
    toggleEdgeVote: () => {},
    addPointBelow: () => {},
    preferredEdgeType: 'support' as const,
    deleteNode: () => {},
    beginConnectFromNode: () => {},
    beginConnectFromEdge: () => {},
    completeConnectToNode: () => {},
    completeConnectToEdge: () => {},
    cancelConnect: () => {},
    isConnectingFromNodeId: null,
    connectMode: false,
    addObjectionForEdge: () => {},
    hoveredEdgeId: null,
    setHoveredEdge: () => {},
    updateEdgeRelevance: () => {},
    updateEdgeType: () => {},
    selectedEdgeId: null,
    setSelectedEdge: () => {},
    overlayActiveEdgeId: null,
    setOverlayActiveEdge: () => {},
    updateEdgeAnchorPosition: () => {},
    startEditingNode: () => {},
    stopEditingNode: () => {},
    startEditingNodeProgrammatically: () => {},
    getEditorsForNode: () => [],
    lockNode: () => {},
    unlockNode: () => {},
    isLockedForMe: () => false,
    getLockOwner: () => null,
    markNodeActive: () => {},
    proxyMode: false,
    undo: () => {},
    redo: () => {},
    stopCapturing: () => {},
    addNodeAtPosition: () => '',
    updateNodeType: () => {},
    openTypeSelector: () => {},
    duplicateNodeWithConnections: () => null,
    isAnyNodeEditing: false,
    hoveredNodeId: null,
    setHoveredNodeId: () => {},
    grabMode: false,
    clearNodeSelection: () => {},
    blurNodesImmediately: () => {},
  }), []);

  const mockPerfContext = useMemo(() => ({ perfMode: false }), []);

  return (
    <JotaiProvider>
      <PerfProvider value={mockPerfContext}>
        <GraphProvider value={mockGraphActions}>
          {children}
        </GraphProvider>
      </PerfProvider>
    </JotaiProvider>
  );
}
