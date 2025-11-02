import { useEffect } from "react";
import { RefObject } from "react";

interface UseAutoFocusNodeProps {
  content: string;
  createdAt?: number;
  isEditing: boolean;
  selected?: boolean;
  startEditingProgrammatically?: () => void;
  isQuestionNode?: boolean;
  contentRef?: RefObject<HTMLDivElement | null>;
  setIsEditing?: (editing: boolean) => void;
  startEditingNode?: (nodeId: string) => void;
  nodeId?: string;
  clearNodeSelection?: () => void;
}

export const useAutoFocusNode = ({
  content,
  createdAt,
  isEditing,
  selected,
  startEditingProgrammatically,
  isQuestionNode = false,
  contentRef,
  setIsEditing,
  startEditingNode,
  nodeId,
  clearNodeSelection,
}: UseAutoFocusNodeProps) => {
  useEffect(() => {
    const defaultMarkers = new Set([
      "New objection",
      "New mitigation",
      "New point",
      "New Point",
      "New Support",
      "New Negation",
      "New Option",
      "New Question",
      "New comment",
      "New mitigate",
      "mitigation",
      "objection",
    ]);
    const isDefaultContent = defaultMarkers.has(content);

    // Check if node was recently created (within last 2 seconds)
    const wasRecentlyCreated = createdAt && Date.now() - createdAt < 2000;

    if (
      isDefaultContent &&
      !isEditing &&
      wasRecentlyCreated &&
      selected === true
    ) {
      setTimeout(() => {
        startEditingProgrammatically?.();
        setTimeout(() => {
          clearNodeSelection?.();
        }, 50);
      }, 150);
    }
  }, [
    content,
    createdAt,
    isEditing,
    selected,
    startEditingProgrammatically,
    isQuestionNode,
    contentRef,
    setIsEditing,
    startEditingNode,
    clearNodeSelection,
    nodeId,
  ]);
};
