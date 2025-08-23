'use client';

import React, { useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/queries/users/useUser';

import { CursorOverlay } from '@/components/experiment/multiplayer/CursorOverlay';
import { CursorReporter } from '@/components/experiment/multiplayer/CursorReporter';
import { useYjsMultiplayer } from '@/hooks/experiment/multiplayer/useYjsMultiplayer';
import { useMultiplayerCursors } from '@/hooks/experiment/multiplayer/useMultiplayerCursors';
import { createGraphChangeHandlers, createNodeDragHandler } from '@/utils/experiment/multiplayer/graphSync';
import {
  initialNodes,
  initialEdges,
  nodeTypes,
  edgeTypes,
  generateRandomUser
} from '@/data/experiment/multiplayer/sampleData';


export default function MultiplayerRationalePage() {
  const { authenticated, ready, login } = usePrivy();
  const { data: user, isLoading: isUserLoading, isFetching: isUserFetching } = useUser();

  const [userColor, setUserColor] = useState<string>("#3b82f6");

  useEffect(() => {
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    setUserColor(colors[Math.floor(Math.random() * colors.length)]);
  }, []);

  const username = user?.username || 'Anonymous';

  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    provider,
    ydoc,
    yNodesMap,
    yEdgesMap,
    syncYMapFromArray,
    connectionError,
    isConnected,
  } = useYjsMultiplayer({
    roomName: 'rationale-multiplayer',
    initialNodes,
    initialEdges,
    enabled: ready && authenticated && !isUserLoading && !isUserFetching,
  });

  const cursors = useMultiplayerCursors({
    provider,
    username,
    userColor,
  });

  const { onNodesChange, onEdgesChange, onConnect } = createGraphChangeHandlers(
    setNodes,
    setEdges,
    yNodesMap,
    yEdgesMap,
    ydoc,
    syncYMapFromArray
  );

  const handleNodeDrag = createNodeDragHandler(setNodes, username);

  if (!ready || (authenticated && (isUserLoading || isUserFetching))) {
    return (
      <div className="fixed inset-0 top-16 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="fixed inset-0 top-16 bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg border text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Login Required
          </h1>
          <p className="text-gray-600 mb-6">
            You need to be logged in to access the multiplayer rationale system.
          </p>
          <button
            onClick={login}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-16 bg-gray-50">
      <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded-lg shadow-lg border">
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Multiplayer Rationale System
        </h1>
        <p className="text-sm text-gray-600">
          You are: <span className="font-semibold" style={{ color: userColor }}>{username}</span>
        </p>
        <div className="flex items-center gap-2 text-xs mt-1">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-gray-500">
            {isConnected ? 'Connected to multiplayer' : 'Offline mode'}
          </span>
        </div>
        {connectionError && (
          <p className="text-xs text-orange-600 mt-1 bg-orange-50 p-2 rounded">
            {connectionError}
          </p>
        )}
      </div>

      <ReactFlowProvider>
        <div className="w-full h-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={authenticated ? onNodesChange : undefined}
            onEdgesChange={authenticated ? onEdgesChange : undefined}
            onConnect={authenticated ? onConnect : undefined}
            onNodeDrag={authenticated ? handleNodeDrag : undefined}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            className="w-full h-full bg-gray-50"
          >
            <Background />
            <Controls />
            <MiniMap
              nodeColor={() => '#dbeafe'}
              className="bg-white"
            />
          </ReactFlow>
          {authenticated && <CursorOverlay cursors={cursors} />}
          {authenticated && (
            <CursorReporter
              provider={provider}
              username={username}
              userColor={userColor}
            />
          )}
        </div>
      </ReactFlowProvider>
    </div>
  );
}
