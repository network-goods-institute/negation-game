/* eslint-disable drizzle/enforce-delete-with-where */
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAtom } from "jotai";
import { useReactFlow } from "@xyflow/react";
import {
  expandDialogAtom,
  ExpandablePoint,
} from "@/components/dialogs/expandpointdialog/expandDialogTypes";
import { visitedPointsAtom } from "@/atoms/visitedPointsAtom";

export const useExpandPointDialogState = () => {
  const [dialogState] = useAtom(expandDialogAtom);
  const [selectedPoints, setSelectedPoints] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [manuallyRemovedPoints, setManuallyRemovedPoints] = useState<
    Set<number>
  >(new Set());
  const [visitedPoints] = useAtom(visitedPointsAtom);
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);
  const { getNode, getNodes, getEdges } = useReactFlow();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const nodesRaw = getNodes();
  const edgesRaw = getEdges();

  useEffect(() => {
    if (dialogState.isOpen) {
      setForceUpdateCounter((c) => c + 1);
    }
  }, [nodesRaw.length, edgesRaw.length, dialogState.isOpen]);

  const parentPointId = useMemo(() => {
    if (!dialogState.isOpen || !dialogState.parentNodeId) return null;
    const parentNode = getNode(dialogState.parentNodeId);
    return parentNode?.data?.pointId || null;
  }, [dialogState.isOpen, dialogState.parentNodeId, getNode]);

  const grandparentPointId = useMemo(() => {
    if (!dialogState.isOpen || !parentPointId || !dialogState.parentNodeId)
      return null;
    const parentNode = getNode(dialogState.parentNodeId);
    if (!parentNode?.data?.parentId) return null;
    const grandparentNode = getNodes().find(
      (node) =>
        node.id === parentNode.data.parentId ||
        (typeof parentNode.data.parentId === "number" &&
          node.data.pointId === parentNode.data.parentId)
    );
    return grandparentNode?.data?.pointId || null;
  }, [
    dialogState.isOpen,
    dialogState.parentNodeId,
    parentPointId,
    getNode,
    getNodes,
  ]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const expandedPointIds = useMemo(() => {
    if (!dialogState.isOpen || !dialogState.parentNodeId)
      return new Set<number>();
    const connectedToParent = new Set<number>();
    const nodes = getNodes();
    const edges = getEdges();
    const parentNode = getNode(dialogState.parentNodeId);

    if (parentNode) {
      const incomingEdges = edges.filter(
        (e) => e.target === dialogState.parentNodeId
      );
      incomingEdges.forEach((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        if (sourceNode?.type === "point" && sourceNode?.data?.pointId) {
          connectedToParent.add(sourceNode.data.pointId as number);
        }
      });
    }
    return connectedToParent;
  }, [
    dialogState.isOpen,
    dialogState.parentNodeId,
    getNode,
    getNodes,
    getEdges,
  ]);

  const [localExpandedPointIds, setLocalExpandedPointIds] = useState<
    Set<number>
  >(new Set());

  useEffect(() => {
    setLocalExpandedPointIds(expandedPointIds);
  }, [expandedPointIds]);

  const effectiveExpandedPointIds = useMemo(() => {
    return localExpandedPointIds;
  }, [localExpandedPointIds]);

  const filterValidPoints = useCallback(
    (point: ExpandablePoint) => {
      if (parentPointId && point.pointId === parentPointId) return false;
      return true;
    },
    [parentPointId]
  );

  const filteredPoints = useMemo(() => {
    if (!dialogState.isOpen) return [];
    return dialogState.points.filter(filterValidPoints);
  }, [dialogState.isOpen, dialogState.points, filterValidPoints]);

  useEffect(() => {
    if (dialogState.isOpen && effectiveExpandedPointIds.size > 0) {
      setSelectedPoints((prev) => {
        const newSet = new Set(prev);
        let changed = false;
        for (const id of prev) {
          if (effectiveExpandedPointIds.has(id)) {
            newSet.delete(id);
            changed = true;
          }
        }
        return changed ? newSet : prev;
      });
    }
  }, [dialogState.isOpen, effectiveExpandedPointIds]);

  useEffect(() => {
    if (dialogState.isOpen) {
      setSearchTerm("");
      const initialSelected = new Set<number>();
      dialogState.points.forEach((point: ExpandablePoint) => {
        if (
          point.pointId !== parentPointId &&
          point.pointId !== grandparentPointId &&
          !effectiveExpandedPointIds.has(point.pointId) &&
          !manuallyRemovedPoints.has(point.pointId)
        ) {
          initialSelected.add(point.pointId);
        }
      });
      setSelectedPoints(initialSelected);
    }
  }, [
    dialogState.isOpen,
    dialogState.points,
    dialogState.parentNodeId,
    parentPointId,
    grandparentPointId,
    effectiveExpandedPointIds,
    manuallyRemovedPoints,
  ]);

  const visiblePointsCount = useMemo(() => {
    if (!searchTerm.trim()) return filteredPoints.length;
    return filteredPoints.filter((point: ExpandablePoint) => {
      const node = getNodes().find(
        (n) => n.type === "point" && n.data.pointId === point.pointId
      );
      if (!node?.data?.content) return false;
      return (node.data.content as string)
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    }).length;
  }, [filteredPoints, getNodes, searchTerm]);

  return {
    dialogState,
    selectedPoints,
    setSelectedPoints,
    isSubmitting,
    setIsSubmitting,
    searchTerm,
    setSearchTerm,
    manuallyRemovedPoints,
    setManuallyRemovedPoints,
    visitedPoints,
    isMobile,
    parentPointId,
    grandparentPointId,
    effectiveExpandedPointIds,
    setLocalExpandedPointIds,
    filteredPoints,
    visiblePointsCount,
    setForceUpdateCounter,
  };
};
