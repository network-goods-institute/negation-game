import React, { useCallback, useEffect, useRef } from 'react';
import { GraphView } from '../graph/base/GraphView';
import useScrollToPoint from '@/hooks/graph/useScrollToPoint';
import { useReactFlow } from '@xyflow/react';
import type { ReactFlowInstance } from '@xyflow/react';
import type { AppNode } from '../graph/nodes/AppNode';
import type { ViewpointGraph } from '@/atoms/viewpointAtoms';
import type { NodeChange, EdgeChange } from '@xyflow/react';
import { toast } from 'sonner';
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
    onSave: (graph: ViewpointGraph) => Promise<boolean>;
    onResetContent?: () => void;
    onModifiedChange?: (isModified: boolean) => void;
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
    onModifiedChange,
}: RationaleGraphProps) {
    const uniquePoints = useGraphPoints();
    const pointIds = uniquePoints.map((p) => p.pointId);
    const { data: pointsData } = useQuery<PointData[]>({
        queryKey: ['graph-creds', pointIds],
        queryFn: () => fetchPoints(pointIds),
        enabled: pointIds.length > 0,
    });
    const creds = pointsData?.map((p) => p.cred ?? 0) ?? [];
    const minCred = creds.length > 0 ? Math.min(...creds) : 0;
    const maxCred = creds.length > 0 ? Math.max(...creds) : 0;

    const toastIdRef = useRef<string | number | null>(null);
    useEffect(() => {
        if (toastIdRef.current) {
            toast.dismiss(toastIdRef.current);
        }
        const id = toast(
            "Node expansions, sharing, and other features may take a few seconds to become available as detailed node data loads.",
            {
                position: 'bottom-right',
                duration: 30000,
                action: {
                    label: 'Dismiss',
                    onClick: () => toast.dismiss(id),
                },
            }
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
            />
        </GraphSizingContext.Provider>
    );
} 