import { useEffect, useMemo } from "react";
import React from "react";
import { useEditableNode } from "./useEditableNode";
import { usePillVisibility } from "./usePillVisibility";
import { useConnectableNode } from "./useConnectableNode";
import { useNeighborEmphasis } from "./useNeighborEmphasis";
import { useHoverTracking } from "./useHoverTracking";
import { useAutoFocusNode } from "./useAutoFocusNode";
import { useCursorState } from "./useCursorState";

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

  useAutoFocusNode({
    content,
    createdAt: autoFocus?.createdAt,
    isEditing: editable.isEditing,
    selected,
    startEditingProgrammatically: editable.startEditingProgrammatically,
    isQuestionNode: autoFocus?.isQuestionNode ?? false,
  });

  const shouldShowPill = useMemo(() => {
    if (!pill.pillVisible) return false;
    if (locked) return false;
    if (hidden) return false;
    if (hidePillWhileEditing && editable.isEditing) return false;
    return true;
  }, [
    pill.pillVisible,
    locked,
    hidden,
    hidePillWhileEditing,
    editable.isEditing,
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
