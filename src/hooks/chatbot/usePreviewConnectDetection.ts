import { useCallback, useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { useSetAtom } from "jotai";
import { connectNodesDialogAtom } from "@/atoms/connectNodesAtom";
import { PreviewAppNode } from "@/types/rationaleGraph";
import { PreviewPointNodeData } from "@/components/chatbot/preview/PreviewPointNode";import { logger } from "@/lib/logger";

function findOverlappingForConnect(
  allNodes: PreviewAppNode[],
  targetNodeId: string,
  threshold = 95
): string | null {
  const targetNode = allNodes.find((n) => n.id === targetNodeId);
  if (!targetNode || targetNode.type !== "point") return null;

  const targetData = targetNode.data as PreviewPointNodeData;

  for (const node of allNodes) {
    if (node.id === targetNodeId || node.type !== "point") continue;

    const nodeData = node.data as PreviewPointNodeData;

    // Skip if same content (that would be a merge, not connect)
    if (
      targetData.content &&
      nodeData.content &&
      targetData.content === nodeData.content
    ) {
      continue;
    }

    // Check physical overlap
    const tw = targetNode.measured?.width ?? 250;
    const th = targetNode.measured?.height ?? 160;
    const nw = node.measured?.width ?? 250;
    const nh = node.measured?.height ?? 160;

    const targetCenterX = targetNode.position.x + tw / 2;
    const targetCenterY = targetNode.position.y + th / 2;
    const nodeCenterX = node.position.x + nw / 2;
    const nodeCenterY = node.position.y + nh / 2;

    const distance = Math.sqrt(
      Math.pow(targetCenterX - nodeCenterX, 2) +
        Math.pow(targetCenterY - nodeCenterY, 2)
    );

    if (distance < threshold) {
      return node.id;
    }
  }

  return null;
}

export function usePreviewConnectDetection(nodeId: string) {
  const { getNodes } = useReactFlow<PreviewAppNode>();
  const setConnectDialogState = useSetAtom(connectNodesDialogAtom);
  const connectCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);
  const listenersActiveRef = useRef(false);

  const checkForConnectCandidates = useCallback(() => {
    const allNodes = getNodes();
    const connectTargetId = findOverlappingForConnect(allNodes, nodeId, 95);

    setConnectDialogState((state) => {
      if (connectTargetId) {
        // Open connect dialog
        if (
          !state.isOpen ||
          state.sourceId !== nodeId ||
          state.targetId !== connectTargetId
        ) {
          return {
            isOpen: true,
            sourceId: nodeId,
            targetId: connectTargetId,
            onClose: () => {
              logger.log("Connect dialog closed");
            },
          };
        }
      } else {
        // Close connect dialog if this node was the source
        if (state.isOpen && state.sourceId === nodeId) {
          return { ...state, isOpen: false };
        }
      }
      return state;
    });
  }, [getNodes, nodeId, setConnectDialogState]);

  useEffect(() => {
    const onStart = () => {
      isDraggingRef.current = true;
      clearInterval(connectCheckIntervalRef.current!);
    };
    const onEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      checkForConnectCandidates();
      connectCheckIntervalRef.current = setInterval(
        checkForConnectCandidates,
        500
      );
    };
    const setup = () => {
      if (listenersActiveRef.current) return;
      document.addEventListener("mousedown", onStart);
      document.addEventListener("touchstart", onStart);
      document.addEventListener("mouseup", onEnd);
      document.addEventListener("touchend", onEnd);
      checkForConnectCandidates();
      connectCheckIntervalRef.current = setInterval(
        checkForConnectCandidates,
        500
      );
      listenersActiveRef.current = true;
    };
    const teardown = () => {
      if (!listenersActiveRef.current) return;
      clearInterval(connectCheckIntervalRef.current!);
      document.removeEventListener("mousedown", onStart);
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchend", onEnd);
      listenersActiveRef.current = false;
    };

    setup();
    return teardown;
  }, [checkForConnectCandidates]);

  return { checkForConnectCandidates };
}
