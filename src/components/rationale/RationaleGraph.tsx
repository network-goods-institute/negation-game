import React, { useCallback, useEffect, useRef } from 'react';
import { GraphView } from '../graph/base/GraphView';
import useScrollToPoint from '@/hooks/graph/useScrollToPoint';
import { useReactFlow } from '@xyflow/react';
import type { ReactFlowInstance } from '@xyflow/react';
import type { AppNode } from '../graph/nodes/AppNode';
import type { ViewpointGraph } from '@/atoms/viewpointAtoms';
import type { NodeChange, EdgeChange } from '@xyflow/react';
import { toast } from 'sonner';

export interface RationaleGraphProps {
    graph: ViewpointGraph;
    setGraph?: (graph: ViewpointGraph) => void;
    setLocalGraph?: (graph: ViewpointGraph) => void;
    statement: string;
    description: string;
    canModify?: boolean;
    canvasEnabled: boolean;
    className?: string;
    isNew?: boolean;
    isSaving?: boolean;
    isContentModified?: boolean;
    isSharing?: boolean;
    toggleSharingMode?: () => void;
    handleGenerateAndCopyShareLink?: () => void;
    originalGraphData?: ViewpointGraph;
    hideShareButton?: boolean;
    onSave: (graph: ViewpointGraph) => Promise<boolean>;
    onResetContent?: () => void;
}

export default function RationaleGraph({
    graph,
    setGraph,
    setLocalGraph,
    statement,
    description,
    canModify = false,
    canvasEnabled,
    className,
    isNew = false,
    isSaving = false,
    isContentModified = false,
    isSharing = false,
    toggleSharingMode,
    handleGenerateAndCopyShareLink,
    originalGraphData,
    hideShareButton,
    onSave,
    onResetContent,
}: RationaleGraphProps) {
    const toastIdRef = useRef<string | number | null>(null);
    useEffect(() => {
        if (toastIdRef.current) {
            toast.dismiss(toastIdRef.current);
        }
        const id = toast(
            "Node expansions, sharing, and other features may take a few seconds to become available as detailed node data loads.",
            { position: 'bottom-right', duration: 30000 }
        );
        toastIdRef.current = id;
        return () => {
            if (toastIdRef.current) {
                toast.dismiss(toastIdRef.current);
            }
        };
    }, []);
    const scrollHandler = useScrollToPoint();
    const reactFlow = useReactFlow<AppNode>();
    const onInit = (instance: ReactFlowInstance<AppNode>) => {
    };

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            const { viewport, ...g } = reactFlow.toObject();
            if (setLocalGraph) setLocalGraph(g);
            if (setGraph) setGraph(g);
        },
        [reactFlow, setGraph, setLocalGraph]
    );

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            const { viewport, ...g } = reactFlow.toObject();
            if (setLocalGraph) setLocalGraph(g);
            if (setGraph) setGraph(g);
        },
        [reactFlow, setGraph, setLocalGraph]
    );

    return (
        <GraphView
            onNodeClick={scrollHandler}
            onInit={onInit}
            defaultNodes={graph.nodes}
            defaultEdges={graph.edges}
            statement={statement}
            description={description}
            canModify={canModify}
            canvasEnabled={canvasEnabled}
            className={className}
            isNew={isNew}
            isSaving={isSaving}
            isContentModified={isContentModified}
            onSaveChanges={onSave}
            onResetContent={onResetContent}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            hideShareButton={hideShareButton}
            isSharing={isSharing}
            toggleSharingMode={toggleSharingMode}
            handleGenerateAndCopyShareLink={handleGenerateAndCopyShareLink}
            originalGraphData={originalGraphData}
        />
    );
} 