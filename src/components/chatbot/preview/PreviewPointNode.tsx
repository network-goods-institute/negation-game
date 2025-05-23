"use client";

import {
  XIcon,
  ArrowDownIcon,
  PencilIcon,
  SaveIcon,
} from "lucide-react";
import { Position, NodeProps, useReactFlow, Node, Handle } from "@xyflow/react";
import { cn } from "@/lib/utils/cn";
import { useCallback, useState, useEffect } from "react";
import { nanoid } from 'nanoid';
import { NegateIcon } from "@/components/icons/NegateIcon";
import { Button } from "@/components/ui/button";
import { PreviewPointEditor } from "./PreviewPointEditor";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { PointInSpace } from "@/actions/points/fetchAllSpacePoints";
import { fetchPointById } from '@/actions/points/fetchPointById';
import type { PointData } from '@/queries/points/usePointData';
import { encodeId } from '@/lib/negation-game/encodeId';
import { PreviewPointNodeEndorsement } from "./PreviewPointNodeEndorsement";
import { PreviewPointNodeStatusIndicators } from "./PreviewPointNodeStatusIndicators";

/**
 * Simplified PointNode for RationaleCreator Preview
 */

export type PreviewPointNodeData = {
  content: string;
  cred?: number;
  allPointsInSpaceFromProps?: PointInSpace[];
  existingPointId?: number | null;
  isNew?: boolean;
};

export type PreviewPointNode = Node<PreviewPointNodeData, "point">;

export interface PreviewPointNodeProps extends Omit<NodeProps, "data"> {
  data: PreviewPointNodeData;
  positionAbsoluteX: number;
  positionAbsoluteY: number;
}

export const PreviewPointNode = ({
  data: { content, cred, allPointsInSpaceFromProps, existingPointId, isNew },
  id,
  positionAbsoluteX,
  positionAbsoluteY,
}: PreviewPointNodeProps) => {
  const { deleteElements, addNodes, addEdges, updateNodeData, getEdges, getNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [localExistingPointId, setLocalExistingPointId] = useState<number | undefined>();
  const [localIsNew, setLocalIsNew] = useState<boolean>(true);
  const [existingPointDetails, setExistingPointDetails] = useState<PointData | null>(null);
  const [currentSpacePath, setCurrentSpacePath] = useState<string>("global");
  const [isDuplicateOnCanvas, setIsDuplicateOnCanvas] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const spaceMatch = window.location.pathname.match(/\/s\/([^/]+)/);
      if (spaceMatch && spaceMatch[1]) {
        setCurrentSpacePath(spaceMatch[1]);
      }
    }
  }, []);

  useEffect(() => {
    const fetchDetails = async (pointIdToFetch: number) => {
      try {
        const details = await fetchPointById(pointIdToFetch);
        setExistingPointDetails(details);
      } catch (error) {
        console.error(`Error fetching details for point ${pointIdToFetch}:`, error);
        setExistingPointDetails(null);
      }
    };

    if (!content) {
      setLocalExistingPointId(undefined);
      setLocalIsNew(true);
      setExistingPointDetails(null);
      return;
    }

    // If an existingPointId is already provided (e.g., by AI or user disambiguation via RationaleCreator),
    // prioritize it for setting local state.
    if (existingPointId !== undefined && existingPointId !== null) {
      setLocalExistingPointId(existingPointId);
      // If isNew is explicitly passed with existingPointId, respect it, otherwise assume false.
      setLocalIsNew(isNew === undefined ? false : isNew);
      if (existingPointId) fetchDetails(existingPointId);
      else setExistingPointDetails(null); // Clear details if existingPointId became null
      return;
    }

    // Fallback: if no existingPointId provided directly via data prop,
    // check allPointsInSpaceFromProps for a *single* match to update UI indicator.
    // The comprehensive multi-match check and disambiguation is handled by useRationaleCreation.
    if (allPointsInSpaceFromProps) {
      const matchedPoint = allPointsInSpaceFromProps.find(
        (p) => p.content === content
      );

      if (matchedPoint) {
        setLocalExistingPointId(matchedPoint.id);
        setLocalIsNew(false);
        fetchDetails(matchedPoint.id);
      } else {
        setLocalExistingPointId(undefined);
        setLocalIsNew(true);
        setExistingPointDetails(null);
      }
    } else {
      setLocalExistingPointId(undefined);
      setLocalIsNew(true);
      setExistingPointDetails(null);
    }
  }, [content, allPointsInSpaceFromProps, id, existingPointId, isNew]);

  const hasPositiveCred = cred !== undefined && cred > 0;

  // Determine if the database check is pending
  const isPendingCheck = allPointsInSpaceFromProps === undefined;

  // Determine status based on DB check (only if not pending)
  const dbPointStatus = !isPendingCheck && localExistingPointId !== undefined ? "existing" : "new";

  const encodedLocalId = localExistingPointId ? encodeId(localExistingPointId) : null;

  useEffect(() => {
    if (!content) {
      setIsDuplicateOnCanvas(false);
      return;
    }
    const nodesInGraph = getNodes();
    const otherNodesWithSameContent = nodesInGraph.filter(
      (n) => n.id !== id && (n.data as PreviewPointNodeData).content === content
    );
    setIsDuplicateOnCanvas(otherNodesWithSameContent.length > 0);
  }, [content, id, getNodes]);

  useEffect(() => {
    if (!content) return;
    const nodesInGraph = getNodes();
    // find any node with a data payload and a numeric cred > 0
    const peerNode = nodesInGraph.find((n) => {
      if (!n.data) return false;
      const d = n.data as PreviewPointNodeData;
      return d.content === content && typeof d.cred === 'number' && d.cred > 0;
    });
    if (peerNode && peerNode.data) {
      const peerCred = (peerNode.data as PreviewPointNodeData).cred!;
      if (cred !== peerCred) {
        updateNodeData(id, { cred: peerCred });
      }
    }
  }, [content, id, getNodes, cred, updateNodeData]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const edges = getEdges();
    const collectDescendants = (nodeId: string, collected: Set<string>) => {
      collected.add(nodeId);
      edges.forEach(edge => {
        if (edge.source === nodeId && edge.type === 'negation' && !collected.has(edge.target)) {
          collectDescendants(edge.target, collected);
        }
      });
    };
    const toDeleteSet = new Set<string>();
    collectDescendants(id, toDeleteSet);
    const nodesToDelete = Array.from(toDeleteSet).map(nodeId => ({ id: nodeId }));
    deleteElements({ nodes: nodesToDelete });
  }, [deleteElements, getEdges, id]);

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newNodeId = `previewaddpoint-${nanoid()}`;
    addNodes({
      id: newNodeId,
      type: "addPoint",
      position: {
        x: positionAbsoluteX,
        y: positionAbsoluteY + 100,
      },
      data: {
        parentId: id,
      },
    });
    addEdges({
      id: `edge-${nanoid()}`,
      source: id,
      sourceHandle: `${id}-add-handle`,
      target: newNodeId,
      targetHandle: `${newNodeId}-target`,
      type: 'negation',
    });
  }, [addNodes, addEdges, id, positionAbsoluteX, positionAbsoluteY]);

  const handleEndorse = (newCred: number, _selling: boolean) => {
    const currentCred = cred || 0;
    if (newCred !== currentCred) {
      const allNodes = getNodes();
      allNodes.forEach((node) => {
        const nodeData = node.data as PreviewPointNodeData;
        if (nodeData.content === content) {
          updateNodeData(node.id, { cred: newCred });
        }
      });
    }
  };

  const handleEditToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) {
      updateNodeData(id, { content: editedContent });
    }
    setIsEditing(!isEditing);
  };

  return (
    <>
      <TooltipProvider>
        <div
          className={cn(
            "relative bg-background border-2 rounded-lg p-4 min-h-28 w-64",
            "border-muted-foreground/60 dark:border-muted-foreground/40",
            hasPositiveCred && "border-yellow-500 dark:border-yellow-500",
            "select-none",
            "pb-10"
          )}
        >
          <Handle
            type="target"
            position={Position.Top}
            id={`${id}-target`}
            className="opacity-0 pointer-events-none"
            isConnectable={true}
          />

          <Handle
            id={`${id}-delete-handle`}
            type="source"
            position={Position.Top}
            className="pt-1 pb-0.5 px-2 translate-y-[-100%] -translate-x-1/2 size-fit bg-muted text-center border-2 border-b-0 rounded-t-full pointer-events-auto !cursor-pointer"
            isConnectable={false}
            onClick={handleDelete}
          >
            <XIcon className="size-4" />
          </Handle>

          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full hover:bg-accent"
            onClick={handleEditToggle}
          >
            {isEditing ? (
              <SaveIcon className="h-4 w-4" />
            ) : (
              <PencilIcon className="h-4 w-4" />
            )}
          </Button>

          <div className="text-sm break-words">
            {isEditing ? (
              <PreviewPointEditor
                content={editedContent}
                setContent={setEditedContent}
                className="min-h-[80px]"
                textareaProps={{
                  autoFocus: true,
                  onClick: (e) => e.stopPropagation()
                }}
                compact
                extraCompact
              />
            ) : (
              content
            )}
          </div>

          <div className="absolute bottom-1.5 left-1.5 flex gap-sm text-muted-foreground">
            <Button
              variant="ghost"
              className="p-1 rounded-full size-fit hover:bg-negated/30"
              onClick={handleAddClick}
            >
              <NegateIcon />
            </Button>

            <PreviewPointNodeEndorsement
              cred={cred}
              hasPositiveCred={hasPositiveCred}
              onEndorse={handleEndorse}
            />
          </div>

          <Handle
            type="source"
            position={Position.Bottom}
            id={`${id}-add-handle`}
            className="pb-1 pt-0.5 px-2 translate-y-[100%] -translate-x-1/2 size-fit bg-muted text-center border-border border-2 rounded-b-full pointer-events-auto !cursor-pointer"
            isConnectable={false}
            onClick={handleAddClick}
          >
            <ArrowDownIcon className="size-4" />
          </Handle>

          <PreviewPointNodeStatusIndicators
            isDuplicateOnCanvas={isDuplicateOnCanvas}
            isPendingCheck={isPendingCheck}
            dbPointStatus={dbPointStatus}
            localExistingPointId={localExistingPointId}
            encodedLocalId={encodedLocalId}
            existingPointDetails={existingPointDetails}
            currentSpacePath={currentSpacePath}
          />
        </div>
      </TooltipProvider>
    </>
  );
};


