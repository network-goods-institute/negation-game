"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { useTopicPoints, type TopicPointData } from "@/queries/topics/useTopicPoints";
import RationaleGraph from "@/components/rationale/RationaleGraph";
import { ReactFlowProvider } from "@xyflow/react";
import { Dynamic } from "@/components/utils/Dynamic";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils/cn";
import type { ViewpointGraph } from "@/atoms/viewpointAtoms";
import type { AppNode } from "@/components/graph/nodes/AppNode";
import type { AppEdge } from "@/components/graph/edges/AppEdge";

export interface GlobalTopicGraphProps {
    topicId: number;
    topicName: string;
    className?: string;
    showDynamicSizingToggle?: boolean;
}

function createTopicViewpointGraph(points: TopicPointData[]): ViewpointGraph {
    if (points.length === 0) {
        return { nodes: [], edges: [] };
    }

    const nodes: AppNode[] = [];
    const edges: AppEdge[] = [];
    const addedEdges = new Set<string>();
    const pointsMap = new Map(points.map(p => [p.pointId, p]));

    const children = new Map<number, number[]>();
    const parents = new Map<number, number>();

    for (const point of points) {
        for (const negationId of point.negations) {
            if (pointsMap.has(negationId)) {
                const olderPointId = Math.min(point.pointId, negationId);
                const newerPointId = Math.max(point.pointId, negationId);

                if (!children.has(olderPointId)) {
                    children.set(olderPointId, []);
                }
                children.get(olderPointId)!.push(newerPointId);
                parents.set(newerPointId, olderPointId);

                const edgeKey1 = `${olderPointId}-${newerPointId}`;
                const edgeKey2 = `${newerPointId}-${olderPointId}`;

                if (!addedEdges.has(edgeKey1) && !addedEdges.has(edgeKey2)) {
                    edges.push({
                        id: `negation-${newerPointId}-${olderPointId}`,
                        source: `point-${newerPointId}`,
                        target: `point-${olderPointId}`,
                        type: "negation",
                    });
                    addedEdges.add(edgeKey1);
                }
            }
        }
    }

    const rootPoints = points.filter(p => !parents.has(p.pointId));

    const LEVEL_HEIGHT = 400;
    const NODE_SPACING = 400;
    const ROOT_SPACING = 500;
    const GRID_SIZE = 50;
    const NODE_WIDTH = 300;
    const NODE_HEIGHT = 150;
    const PADDING = 25;

    const positioned = new Set<number>();
    const levels = new Map<number, number>();
    const occupiedGrid = new Set<string>();

    const halfWidth = (NODE_WIDTH + PADDING) / 2;
    const halfHeight = (NODE_HEIGHT + PADDING) / 2;

    const wouldOverlap = (x: number, y: number): boolean => {
        for (let checkX = x - halfWidth; checkX <= x + halfWidth; checkX += GRID_SIZE) {
            for (let checkY = y - halfHeight; checkY <= y + halfHeight; checkY += GRID_SIZE) {
                const gridX = Math.round(checkX / GRID_SIZE) * GRID_SIZE;
                const gridY = Math.round(checkY / GRID_SIZE) * GRID_SIZE;
                const key = `${gridX},${gridY}`;
                if (occupiedGrid.has(key)) {
                    return true;
                }
            }
        }
        return false;
    };

    const markAsOccupied = (x: number, y: number): void => {
        for (let checkX = x - halfWidth; checkX <= x + halfWidth; checkX += GRID_SIZE) {
            for (let checkY = y - halfHeight; checkY <= y + halfHeight; checkY += GRID_SIZE) {
                const gridX = Math.round(checkX / GRID_SIZE) * GRID_SIZE;
                const gridY = Math.round(checkY / GRID_SIZE) * GRID_SIZE;
                const key = `${gridX},${gridY}`;
                occupiedGrid.add(key);
            }
        }
    };

    const findAvailablePosition = (targetX: number, targetY: number): { x: number; y: number } => {
        const roundToGrid = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;

        let testX = roundToGrid(targetX);
        let testY = roundToGrid(targetY);

        if (!wouldOverlap(testX, testY)) {
            markAsOccupied(testX, testY);
            return { x: testX, y: testY };
        }

        for (let radius = 1; radius <= 20; radius++) {
            const searchDistance = radius * GRID_SIZE;

            for (let angle = 0; angle < 360; angle += 45) {
                const radians = (angle * Math.PI) / 180;
                const dx = Math.round(Math.cos(radians) * searchDistance);
                const dy = Math.round(Math.sin(radians) * searchDistance);

                testX = roundToGrid(targetX + dx);
                testY = roundToGrid(targetY + dy);

                if (!wouldOverlap(testX, testY)) {
                    markAsOccupied(testX, testY);
                    return { x: testX, y: testY };
                }
            }
        }

        for (let offset = 3000; offset <= 10000; offset += 1000) {
            testX = roundToGrid(targetX + offset);
            testY = roundToGrid(targetY);
            if (!wouldOverlap(testX, testY)) {
                markAsOccupied(testX, testY);
                return { x: testX, y: testY };
            }
        }

        markAsOccupied(testX, testY);
        return { x: testX, y: testY };
    };

    rootPoints.forEach((point, index) => {
        const targetX = (index - (rootPoints.length - 1) / 2) * ROOT_SPACING;
        const targetY = -600;
        const { x, y } = findAvailablePosition(targetX, targetY);

        const node: AppNode = {
            id: `point-${point.pointId}`,
            type: "point",
            position: { x, y },
            data: {
                pointId: point.pointId,
                initialPointData: point,
            },
        };

        nodes.push(node);
        positioned.add(point.pointId);
        levels.set(point.pointId, 0);
    });

    const queue = [...rootPoints.map(p => p.pointId)];
    const processedParents = new Set<number>();

    while (queue.length > 0) {
        const currentId = queue.shift()!;

        if (processedParents.has(currentId)) {
            continue;
        }
        processedParents.add(currentId);

        const currentLevel = levels.get(currentId)!;
        const currentChildren = children.get(currentId) || [];

        if (currentChildren.length > 0) {
            const parentNode = nodes.find(n => n.id === `point-${currentId}`);
            if (parentNode) {
                const childLevel = currentLevel + 1;
                const childY = -600 + (childLevel * LEVEL_HEIGHT);

                const unpositionedChildren = currentChildren.filter(childId => !positioned.has(childId));

                for (let i = 0; i < unpositionedChildren.length; i++) {
                    const childId = unpositionedChildren[i];
                    const childPoint = pointsMap.get(childId);
                    const targetX = parentNode.position.x + (i - (unpositionedChildren.length - 1) / 2) * NODE_SPACING;
                    const targetY = childY;
                    const { x, y } = findAvailablePosition(targetX, targetY);

                    const childNode: AppNode = {
                        id: `point-${childId}`,
                        type: "point",
                        position: { x, y },
                        data: {
                            pointId: childId,
                            parentId: `point-${currentId}`,
                            initialPointData: childPoint,
                        },
                    };

                    nodes.push(childNode);
                    positioned.add(childId);
                    levels.set(childId, childLevel);
                    queue.push(childId);
                }
            }
        }
    }

    const unpositioned = points.filter(p => !positioned.has(p.pointId));
    if (unpositioned.length > 0) {
        const maxLevel = Math.max(...Array.from(levels.values()), -1);
        const disconnectedY = -600 + ((maxLevel + 2) * LEVEL_HEIGHT);

        unpositioned.forEach((point, index) => {
            const x = (index - (unpositioned.length - 1) / 2) * NODE_SPACING;
            const y = disconnectedY;

            const node: AppNode = {
                id: `point-${point.pointId}`,
                type: "point",
                position: { x, y },
                data: {
                    pointId: point.pointId,
                    initialPointData: point,
                },
            };

            nodes.push(node);
        });
    }

    return { nodes, edges };
}

const GlobalTopicGraphContent = React.memo(function GlobalTopicGraphContent({ topicId, topicName, className, showDynamicSizingToggle }: GlobalTopicGraphProps) {
    const { data: points, isLoading, error } = useTopicPoints(topicId);
    const lastGraphRef = useRef<ViewpointGraph | null>(null);
    const lastPointsKeyRef = useRef<string>('');
    const [localGraph, setLocalGraph] = useState<ViewpointGraph>({ nodes: [], edges: [] });

    const pointsKey = useMemo(() => {
        if (!points || points.length === 0) return '';
        return points.map(p => p.pointId).sort((a, b) => a - b).join(',');
    }, [points]);

    const initialGraph = useMemo(() => {
        if (pointsKey === lastPointsKeyRef.current && lastGraphRef.current) {
            return lastGraphRef.current;
        }

        if (!points || points.length === 0) {
            const emptyGraph = { nodes: [], edges: [] };
            lastGraphRef.current = emptyGraph;
            lastPointsKeyRef.current = pointsKey;
            return emptyGraph;
        }

        const newGraph = createTopicViewpointGraph(points);
        lastGraphRef.current = newGraph;
        lastPointsKeyRef.current = pointsKey;
        return newGraph;
    }, [pointsKey, points]);

    useEffect(() => {
        setLocalGraph(initialGraph);
    }, [initialGraph]);

    const statement = useMemo(() => `Global Topic Graph: ${topicName}`, [topicName]);
    const description = useMemo(() =>
        `All ${points?.length || 0} unique points from rationales in this topic with their negation relationships`,
        [points?.length]
    );

    if (isLoading) {
        return (
            <div className={cn("h-full border rounded-lg flex items-center justify-center", className)}>
                <div className="text-center">
                    <Loader className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading topic graph...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn("h-full border rounded-lg flex items-center justify-center", className)}>
                <div className="text-center text-muted-foreground">
                    <p>Failed to load topic graph</p>
                    <p className="text-sm mt-1">Error: {String(error)}</p>
                </div>
            </div>
        );
    }

    if (!points || points.length === 0) {
        return (
            <div className={cn("h-full border rounded-lg flex items-center justify-center", className)}>
                <div className="text-center text-muted-foreground">
                    <p>No points found for this topic</p>
                    <p className="text-sm mt-1">Points will appear here when rationales are created</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("h-full", className)}>
            <RationaleGraph
                graph={localGraph}
                setGraph={() => { }} // No-op for global state
                setLocalGraph={setLocalGraph} // Update local graph
                statement={statement}
                description={description}
                canModify={true} // Allow full interactions including negation expansion
                canvasEnabled={true}
                hideShareButton={true} // Hide sharing panel
                hideSavePanel={true} // Hide save/discard panel
                hideComments={true} // Hide comment functionality
                isNew={false}
                isSaving={false} // Never in saving state
                isContentModified={false} // Never show as modified
                isSharing={false} // Never in sharing mode
                onSave={async () => false} // Disable saving - always return false
                onResetContent={() => { }} // No-op reset
                onModifiedChange={() => { }} // No-op modified change
                nodesDraggable={false} // Disable node movement for optimized panning
                showDynamicSizingToggle={showDynamicSizingToggle}
                className="h-full"
            />
        </div>
    );
});

export default function GlobalTopicGraph(props: GlobalTopicGraphProps) {
    return (
        <ReactFlowProvider>
            <Dynamic>
                <GlobalTopicGraphContent {...props} />
            </Dynamic>
        </ReactFlowProvider>
    );
} 