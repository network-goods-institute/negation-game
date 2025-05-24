/* eslint-disable drizzle/enforce-delete-with-where */
import { useCallback, useRef, useEffect, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { nanoid } from "nanoid";
import {
  ExpandablePoint,
  ExpandDialogState,
} from "@/components/dialogs/expandpointdialog/expandDialogTypes";
import { useVisitedPoints } from "@/hooks/points/useVisitedPoints";
import { calculateInitialLayout } from "./useExpandPointDialogLayout";

interface UseExpandPointDialogEventsProps {
  dialogState: ExpandDialogState;
  setDialogState: (
    update: ExpandDialogState | ((prev: ExpandDialogState) => ExpandDialogState)
  ) => void;
  selectedPoints: Set<number>;
  setSelectedPoints: React.Dispatch<React.SetStateAction<Set<number>>>;
  manuallyRemovedPoints: Set<number>;
  setManuallyRemovedPoints: React.Dispatch<React.SetStateAction<Set<number>>>;
  effectiveExpandedPointIds: Set<number>;
  setLocalExpandedPointIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  setForceUpdateCounter: React.Dispatch<React.SetStateAction<number>>;
  position: { x: number; y: number };
  setPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  modalRef: React.RefObject<HTMLDivElement | null>;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useExpandPointDialogEvents = ({
  dialogState,
  setDialogState,
  selectedPoints,
  setSelectedPoints,
  setManuallyRemovedPoints,
  effectiveExpandedPointIds,
  setLocalExpandedPointIds,
  setForceUpdateCounter,
  position,
  setPosition,
  modalRef,
  setIsSubmitting,
}: UseExpandPointDialogEventsProps) => {
  const reactFlow = useReactFlow();
  const { getNode, addNodes, addEdges, getNodes, getEdges, deleteElements } =
    reactFlow;
  const { markPointAsRead } = useVisitedPoints();
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [lastZoomedIndices, setLastZoomedIndices] = useState<
    Record<number, number>
  >({});

  const handleClose = useCallback(() => {
    if (dialogState.onClose) {
      dialogState.onClose();
    }
    setDialogState((state: ExpandDialogState) => ({ ...state, isOpen: false }));
    setSelectedPoints(new Set());
    setManuallyRemovedPoints(new Set());
  }, [
    dialogState,
    setDialogState,
    setSelectedPoints,
    setManuallyRemovedPoints,
  ]);

  const handleAddPoint = useCallback(
    (point: ExpandablePoint) => {
      if (
        effectiveExpandedPointIds.has(point.pointId) ||
        !dialogState.parentNodeId
      )
        return;

      const parentNode = getNode(dialogState.parentNodeId);
      if (!parentNode) return;

      setLocalExpandedPointIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(point.pointId);
        return newSet;
      });

      setManuallyRemovedPoints((prev) => {
        if (prev.has(point.pointId)) {
          const newSet = new Set(prev);
          newSet.delete(point.pointId);
          return newSet;
        }
        return prev;
      });

      const layout = calculateInitialLayout(
        parentNode.position.x,
        parentNode.position.y,
        parentNode?.measured?.height ?? 200,
        1
      )[0];

      const uniqueId = `${nanoid()}-${Date.now()}`;

      addNodes({
        id: uniqueId,
        data: {
          pointId: point.pointId,
          parentId: parentNode.data.pointId,
          _lastModified: Date.now(),
          isExpanding: true,
        },
        type: "point",
        position: layout,
      });

      addEdges({
        id: nanoid(),
        target: dialogState.parentNodeId,
        source: uniqueId,
        type:
          parentNode.data.parentId === "statement" ? "statement" : "negation",
      });

      setDialogState((prev: ExpandDialogState) => ({ ...prev }));
      setForceUpdateCounter((c) => c + 1);
    },
    [
      effectiveExpandedPointIds,
      dialogState.parentNodeId,
      getNode,
      setLocalExpandedPointIds,
      setManuallyRemovedPoints,
      addNodes,
      addEdges,
      setDialogState,
      setForceUpdateCounter,
    ]
  );

  const handleRemovePoint = useCallback(
    (point: ExpandablePoint) => {
      if (!dialogState.parentNodeId) return;
      const nodes = getNodes();
      const edges = getEdges();

      const nodeToRemove = nodes.find((node) => {
        const nodeData = node.data as Record<string, unknown>;
        return (
          nodeData.pointId === point.pointId &&
          edges.some(
            (edge) =>
              edge.source === node.id &&
              edge.target === dialogState.parentNodeId
          )
        );
      });

      if (nodeToRemove) {
        setLocalExpandedPointIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(point.pointId);
          return newSet;
        });

        deleteElements({
          nodes: [nodeToRemove],
          edges: edges.filter((edge) => edge.source === nodeToRemove.id),
        });

        setSelectedPoints((prev) => {
          const newSet = new Set(prev);
          newSet.delete(point.pointId);
          return newSet;
        });

        setManuallyRemovedPoints((prev) => {
          const newSet = new Set(prev);
          newSet.add(point.pointId);
          return newSet;
        });

        setForceUpdateCounter((c) => c + 1);
      }
    },
    [
      dialogState.parentNodeId,
      getNodes,
      getEdges,
      setLocalExpandedPointIds,
      deleteElements,
      setSelectedPoints,
      setManuallyRemovedPoints,
      setForceUpdateCounter,
    ]
  );

  const handlePointToggle = useCallback(
    (point: ExpandablePoint) => {
      if (effectiveExpandedPointIds.has(point.pointId)) return;

      setSelectedPoints((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(point.pointId)) {
          newSet.delete(point.pointId);
        } else {
          newSet.add(point.pointId);
        }
        return newSet;
      });
    },
    [effectiveExpandedPointIds, setSelectedPoints]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest(".modal-header")) {
        if (!(e.target as HTMLElement).closest("button")) {
          isDragging.current = true;
          dragStart.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
          };
          e.preventDefault();
        }
      }
    },
    [position.x, position.y]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest(".modal-header")) {
        if (
          !(e.target as HTMLElement).closest("button") &&
          e.touches.length === 1
        ) {
          isDragging.current = true;
          dragStart.current = {
            x: e.touches[0].clientX - position.x,
            y: e.touches[0].clientY - position.y,
          };
        }
      }
    },
    [position.x, position.y]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging.current) {
        const newX = e.clientX - dragStart.current.x;
        const newY = e.clientY - dragStart.current.y;
        const maxX = window.innerWidth - (modalRef.current?.offsetWidth || 400);
        const maxY =
          window.innerHeight - (modalRef.current?.offsetHeight || 500);
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY)),
        });
      }
    },
    [modalRef, setPosition]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (isDragging.current && e.touches.length === 1) {
        const newX = e.touches[0].clientX - dragStart.current.x;
        const newY = e.touches[0].clientY - dragStart.current.y;
        const maxX = window.innerWidth - (modalRef.current?.offsetWidth || 400);
        const maxY =
          window.innerHeight - (modalRef.current?.offsetHeight || 500);
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY)),
        });
      }
    },
    [modalRef, setPosition]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    if (dialogState.isOpen) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, {
        passive: true,
      });
      document.addEventListener("touchend", handleTouchEnd);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [
    dialogState.isOpen,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
  ]);

  const handleZoomToNode = useCallback(
    (pointId: number) => {
      const nodes = reactFlow.getNodes();
      const matchingNodes = nodes.filter(
        (node) => node.type === "point" && node.data?.pointId === pointId
      );
      if (matchingNodes.length === 0) return;
      const lastIndex = lastZoomedIndices[pointId] ?? -1;
      const nextIndex = (lastIndex + 1) % matchingNodes.length;
      setLastZoomedIndices((prev) => ({ ...prev, [pointId]: nextIndex }));
      const targetNode = matchingNodes[nextIndex];
      reactFlow.fitView({
        nodes: [{ id: targetNode.id }],
        duration: 600,
        padding: 0.3,
        maxZoom: 1.2,
      });
    },
    [reactFlow, lastZoomedIndices]
  );

  const handleSubmit = useCallback(() => {
    setIsSubmitting(true);
    try {
      if (!dialogState.parentNodeId) return;
      const parentNode = getNode(dialogState.parentNodeId);
      if (!parentNode) return;

      const pointsToAdd = dialogState.points
        .filter((point) => selectedPoints.has(point.pointId))
        .filter((point) => !effectiveExpandedPointIds.has(point.pointId));

      if (pointsToAdd.length === 0) {
        handleClose();
        return;
      }

      const layouts = calculateInitialLayout(
        parentNode.position.x,
        parentNode.position.y,
        parentNode?.measured?.height ?? 200,
        pointsToAdd.length
      );

      pointsToAdd.forEach((point, index) => {
        const uniqueId = `${nanoid()}-${Date.now()}-${index}`;
        const position = layouts[index];

        addNodes({
          id: uniqueId,
          data: {
            pointId: point.pointId,
            parentId: parentNode.data.pointId,
            _lastModified: Date.now(),
            isExpanding: true,
          },
          type: "point",
          position,
        });

        addEdges({
          id: nanoid(),
          target: dialogState.parentNodeId!,
          source: uniqueId,
          type:
            parentNode.data.parentId === "statement" ? "statement" : "negation",
        });
      });

      setSelectedPoints(new Set());
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    dialogState.parentNodeId,
    dialogState.points,
    selectedPoints,
    effectiveExpandedPointIds,
    getNode,
    addNodes,
    addEdges,
    handleClose,
    setSelectedPoints,
    setIsSubmitting,
  ]);

  return {
    handleClose,
    handleAddPoint,
    handleRemovePoint,
    handlePointToggle,
    handleMouseDown,
    handleTouchStart,
    markPointAsRead,
    handleZoomToNode,
    handleSubmit,
  };
};
