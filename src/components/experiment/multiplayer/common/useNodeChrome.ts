import { useEffect, useMemo } from "react";
import React from "react";
import { useReactFlow } from "@xyflow/react";
import { useEditableNode } from "./useEditableNode";
import { usePillVisibility } from "./usePillVisibility";
import { useConnectableNode } from "./useConnectableNode";
import { useNeighborEmphasis } from "./useNeighborEmphasis";
import { useHoverTracking } from "./useHoverTracking";
import { useAutoFocusNode } from "./useAutoFocusNode";
import { useCursorState } from "./useCursorState";

const HOVER_ELEVATION_Z_INDEX = 1000;

const stylesAreEqual = (a?: React.CSSProperties, b?: React.CSSProperties) => {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) {
    return false;
  }
  return keysA.every(
    (key) =>
      a[key as keyof React.CSSProperties] ===
      b[key as keyof React.CSSProperties]
  );
};

interface UseNodeChromeOptions {
  id: string;
  selected?: boolean;
  content: string;
  updateNodeContent: (nodeId: string, content: string) => void;
  startEditingNode?: (nodeId: string) => void;
  stopEditingNode?: (nodeId: string) => void;
  locked: boolean;
  hidden?: boolean;
  pillDelay?: number;
  neighborScale?: number;
  hidePillWhileEditing?: boolean;
  autoFocus?: {
    createdAt?: number;
    isQuestionNode?: boolean;
  };
}

export const useNodeChrome = ({
  id,
  selected,
  content,
  updateNodeContent,
  startEditingNode,
  stopEditingNode,
  locked,
  hidden,
  pillDelay,
  neighborScale = 1.06,
  hidePillWhileEditing = true,
  autoFocus,
}: UseNodeChromeOptions) => {
  const reactFlow = useReactFlow();
  const hoverElevationAppliedRef = React.useRef(false);
  const originalZIndexRef =
    React.useRef<React.CSSProperties["zIndex"]>(undefined);

  const elevateNodeZIndex = React.useCallback(
    (shouldElevate: boolean) => {
      if (!reactFlow) {
        return;
      }

      reactFlow.setNodes((nodes) => {
        let changed = false;

        const nextNodes = nodes.map((node) => {
          if (node.id !== id) {
            return node;
          }

          const currentStyle = (node.style ?? {}) as React.CSSProperties;
          const nextStyle: React.CSSProperties = { ...currentStyle };

          if (shouldElevate) {
            if (!hoverElevationAppliedRef.current) {
              originalZIndexRef.current = currentStyle.zIndex;
            }

            const styleZ = currentStyle.zIndex;
            const numericZ =
              typeof styleZ === "number"
                ? styleZ
                : Number.parseInt(`${styleZ}`, 10);
            const targetZ = Number.isFinite(numericZ)
              ? Math.max(numericZ as number, HOVER_ELEVATION_Z_INDEX)
              : HOVER_ELEVATION_Z_INDEX;

            if (nextStyle.zIndex === targetZ) {
              return node;
            }

            nextStyle.zIndex = targetZ;
          } else {
            const original = originalZIndexRef.current;

            if (original === undefined) {
              if (nextStyle.zIndex === undefined) {
                return node;
              }
              delete nextStyle.zIndex;
            } else {
              if (nextStyle.zIndex === original) {
                return node;
              }
              nextStyle.zIndex = original;
            }
          }

          const finalStyle =
            Object.keys(nextStyle).length === 0 ? undefined : nextStyle;
          if (
            stylesAreEqual(
              node.style as React.CSSProperties | undefined,
              finalStyle
            )
          ) {
            return node;
          }

          changed = true;
          return {
            ...node,
            style: finalStyle,
          };
        });

        if (!changed) {
          return nodes;
        }

        return nextNodes;
      });

      if (!shouldElevate) {
        originalZIndexRef.current = undefined;
      }
      hoverElevationAppliedRef.current = shouldElevate;
    },
    [id, reactFlow]
  );

  const editable = useEditableNode({
    id,
    content,
    updateNodeContent,
    startEditingNode,
    stopEditingNode,
    isSelected: selected,
  });

  const cursorClass = useCursorState({ isEditing: editable.isEditing, locked });

  const hover = useHoverTracking(id);
  const pill = usePillVisibility(pillDelay);
  const connect = useConnectableNode({ id, locked });
  const isActive = Boolean(selected || hover.hovered);
  const innerScaleStyle = useNeighborEmphasis({
    id,
    wrapperRef: editable.wrapperRef,
    isActive,
    scale: neighborScale,
  });

  useEffect(() => {
    if (hover.hovered) {
      if (!hoverElevationAppliedRef.current) {
        elevateNodeZIndex(true);
      }
    } else if (hoverElevationAppliedRef.current) {
      elevateNodeZIndex(false);
    }

    return () => {
      if (hoverElevationAppliedRef.current) {
        elevateNodeZIndex(false);
      }
    };
  }, [hover.hovered, elevateNodeZIndex]);

  const clearNodeSelection = React.useCallback(() => {
    if (!reactFlow) return;
    reactFlow.setNodes((nodes) =>
      nodes.map((node) => ({ ...node, selected: false }))
    );
  }, [reactFlow]);

  useAutoFocusNode({
    content,
    createdAt: autoFocus?.createdAt,
    isEditing: editable.isEditing,
    selected,
    startEditingProgrammatically: editable.startEditingProgrammatically,
    isQuestionNode: autoFocus?.isQuestionNode ?? false,
    clearNodeSelection,
  });

  const shouldShowPill = useMemo(() => {
    if (!pill.pillVisible) return false;
    if (locked) return false;
    if (hidden) return false;
    if (hidePillWhileEditing && editable.isEditing) return false;
    if (editable.isConnectMode) return false;
    // Allow pills to show even when multiple nodes are selected
    return true;
  }, [
    pill.pillVisible,
    locked,
    hidden,
    hidePillWhileEditing,
    editable.isEditing,
    editable.isConnectMode,
  ]);

  // Edge-triggered visibility: react only to state transitions.
  const prevActiveRef = React.useRef<boolean>(false);
  useEffect(() => {
    if (locked || hidden || (hidePillWhileEditing && editable.isEditing)) {
      pill.hideNow?.();
      prevActiveRef.current = false;
      return;
    }

    const wasActive = prevActiveRef.current;

    if (isActive) {
      pill.cancelHide?.();
      pill.handleMouseEnter?.();
    } else if (wasActive) {
      pill.scheduleHide?.();
    }

    prevActiveRef.current = isActive;
  }, [
    isActive,
    locked,
    hidden,
    hidePillWhileEditing,
    editable.isEditing,
    pill,
  ]);

  return {
    editable,
    hover,
    pill: {
      ...pill,
      shouldShowPill,
    },
    connect,
    innerScaleStyle,
    isActive,
    cursorClass,
  };
};

export type UseNodeChromeReturn = ReturnType<typeof useNodeChrome>;
