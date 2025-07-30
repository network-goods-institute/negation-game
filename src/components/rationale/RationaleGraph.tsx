import React, { useCallback, useMemo } from 'react';
import { GraphView } from '../graph/base/GraphView';
import useScrollToPoint from '@/hooks/graph/useScrollToPoint';
import { useReactFlow } from '@xyflow/react';
import type { ReactFlowInstance } from '@xyflow/react';
import type { AppNode } from '../graph/nodes/AppNode';
import type { ViewpointGraph } from '@/atoms/viewpointAtoms';
import type { NodeChange, EdgeChange } from '@xyflow/react';
import { useGraphPoints } from '@/hooks/graph/useGraphPoints';
import { useQuery } from '@tanstack/react-query';
import type { PointData } from '@/queries/points/usePointData';
import { fetchPoints } from '@/actions/points/fetchPoints';
import { GraphSizingContext } from '@/components/graph/base/GraphSizingContext';

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
    hideSavePanel?: boolean;
    hideComments?: boolean;
    onSave: (graph: ViewpointGraph) => Promise<boolean>;
    onResetContent?: () => void;
    onModifiedChange?: (isModified: boolean) => void;
    nodesDraggable?: boolean;
    topOffsetPx?: number;
    onPublish?: () => void;
    canPublish?: boolean;
    isPublishing?: boolean;
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
    hideSavePanel,
    hideComments,
    onSave,
    onResetContent,
    onModifiedChange,
    nodesDraggable,
    topOffsetPx,
    onPublish,
    canPublish = false,
    isPublishing = false,
}: RationaleGraphProps) {
    const uniquePoints = useGraphPoints();
    const pointIds = useMemo(() => uniquePoints.map((p) => p.pointId), [uniquePoints]);
    const { data: pointsData } = useQuery<PointData[]>({
        queryKey: ['graph-creds', pointIds],
        queryFn: () => fetchPoints(pointIds),
        enabled: pointIds.length > 0,
        staleTime: 5 * 60 * 1000,
    });
    const creds = pointsData?.map((p) => p.cred ?? 0) ?? [];
    const minCred = creds.length > 0 ? Math.min(...creds) : 0;
    const maxCred = creds.length > 0 ? Math.max(...creds) : 0;

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
        <GraphSizingContext.Provider value={{ minCred, maxCred }}>
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
                onModifiedChange={onModifiedChange}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                hideShareButton={hideShareButton}
                isSharing={isSharing}
                toggleSharingMode={toggleSharingMode}
                handleGenerateAndCopyShareLink={handleGenerateAndCopyShareLink}
                originalGraphData={originalGraphData}
                hideSavePanel={hideSavePanel}
                hideComments={hideComments}
                nodesDraggable={nodesDraggable}
                topOffsetPx={topOffsetPx}
                onPublish={onPublish}
                canPublish={canPublish}
                isPublishing={isPublishing}
            />
        </GraphSizingContext.Provider>
    );
} 