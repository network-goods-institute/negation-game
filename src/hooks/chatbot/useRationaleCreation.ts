import { useState, useCallback } from "react";
import { useReactFlow, Node as RFNode } from "@xyflow/react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useUser } from "@/queries/users/useUser";
import { useTopics } from "@/queries/topics/useTopics";
import { toast } from "sonner";
import { fetchPointsByExactContent } from "@/actions/points/fetchPointsByExactContent";
import { createRationaleFromPreview } from "@/actions/viewpoints/createRationaleFromPreview";
import { POINT_MIN_LENGTH, POINT_MAX_LENGTH } from "@/constants/config";
import {
  ConflictingPoint,
  ResolvedMappings,
} from "@/components/chatbot/dialogs/DuplicatePointSelectionDialog";
import { PreviewAppNode, PreviewAppEdge } from "@/types/rationaleGraph";
import { PreviewStatementNodeData } from "@/components/chatbot/preview/PreviewStatementNode";
import { PreviewPointNodeData } from "@/components/chatbot/preview/PreviewPointNode";

interface UseRationaleCreationProps {
  isAuthenticated: boolean;
  currentSpace: string | null;
  description: string;
  topic: string;
  persistedGraphNodes: RFNode[];
  persistedGraphEdges: PreviewAppEdge[];
}

export function useRationaleCreation({
  isAuthenticated,
  currentSpace,
  description,
  topic,
}: UseRationaleCreationProps) {
  const router = useRouter();
  const { user: privyUser } = usePrivy();
  const { data: userData } = useUser(privyUser?.id);
  if (!currentSpace) {
    throw new Error("Space is required to fetch topics");
  }
  const { data: topicsData } = useTopics(currentSpace);
  const reactFlowInstance = useReactFlow<PreviewAppNode, PreviewAppEdge>();

  const [duplicateDialogState, setDuplicateDialogState] = useState<{
    isOpen: boolean;
    conflicts: ConflictingPoint[];
  }>({ isOpen: false, conflicts: [] });
  const [resolvedMappings, setResolvedMappings] = useState<ResolvedMappings>(
    new Map()
  );
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRationale = useCallback(
    async (_maybeUseResolvedMappings: boolean | unknown = false) => {
      const useResolvedMappings =
        typeof _maybeUseResolvedMappings === "boolean" &&
        _maybeUseResolvedMappings;

      if (
        !isAuthenticated ||
        !currentSpace ||
        !privyUser ||
        !userData ||
        !reactFlowInstance
      ) {
        toast.error("Cannot create rationale: Missing user data or context.");
        return;
      }

      const currentNodes = reactFlowInstance.getNodes();
      const currentEdges = reactFlowInstance.getEdges();
      setIsCreating(true);

      const pointNodes = currentNodes.filter(
        (node) => node.type === "point"
      ) as RFNode<PreviewPointNodeData>[];

      for (const node of pointNodes) {
        const contentLength = node.data.content.length;
        if (
          contentLength < POINT_MIN_LENGTH ||
          contentLength > POINT_MAX_LENGTH
        ) {
          toast.error(
            `Point content length invalid (must be ${POINT_MIN_LENGTH}-${POINT_MAX_LENGTH} chars): "${
              node.data.content.length > 50
                ? node.data.content.substring(0, 47) + "..."
                : node.data.content
            }"`
          );
          setIsCreating(false);
          return;
        }
      }

      let totalRequiredCred = 0;
      pointNodes.forEach((node) => {
        totalRequiredCred += node.data.cred || 0;
      });

      const userCred = userData.cred ?? 0;
      if (totalRequiredCred > userCred) {
        toast.error(
          `Insufficient cred to create rationale. Required: ${totalRequiredCred}, Available: ${userCred}`
        );
        setIsCreating(false);
        return;
      }

      let mappingsForAction = resolvedMappings;
      if (!useResolvedMappings) {
        const uniqueContentStrings = Array.from(
          new Set(pointNodes.map((node) => node.data.content).filter(Boolean))
        );

        let existingPoints: { id: number; content: string }[] = [];
        if (uniqueContentStrings.length > 0) {
          try {
            existingPoints = await fetchPointsByExactContent(
              uniqueContentStrings,
              currentSpace
            );
          } catch (error) {
            toast.error(
              "Failed to check for existing points. Please try again."
            );
            setIsCreating(false);
            return;
          }
        }

        const contentToExistingPointsMap = new Map<
          string,
          { id: number; content: string }[]
        >();
        existingPoints.forEach((p) => {
          const points = contentToExistingPointsMap.get(p.content) || [];
          points.push(p);
          contentToExistingPointsMap.set(p.content, points);
        });

        const contentToPreviewNodeIds = new Map<string, string[]>();
        pointNodes.forEach((node) => {
          const arr = contentToPreviewNodeIds.get(node.data.content) || [];
          arr.push(node.id);
          contentToPreviewNodeIds.set(node.data.content, arr);
        });

        const conflictsRequiringResolution: ConflictingPoint[] = [];
        const autoResolvedMappingsForThisCheck = new Map<
          string,
          number | null
        >();

        pointNodes.forEach((node) => {
          if (node.data.existingPointId == null) {
            const matchingDbPoints =
              contentToExistingPointsMap.get(node.data.content) || [];
            const duplicateIds =
              contentToPreviewNodeIds.get(node.data.content) || [];

            if (duplicateIds.length > 1) {
              conflictsRequiringResolution.push({
                previewNodeId: node.id,
                content: node.data.content,
                existingPoints: matchingDbPoints,
              });
            } else if (matchingDbPoints.length > 1) {
              conflictsRequiringResolution.push({
                previewNodeId: node.id,
                content: node.data.content,
                existingPoints: matchingDbPoints,
              });
            } else if (matchingDbPoints.length === 1) {
              autoResolvedMappingsForThisCheck.set(
                node.id,
                matchingDbPoints[0].id
              );
            }
          }
        });

        if (conflictsRequiringResolution.length > 0) {
          setDuplicateDialogState({
            isOpen: true,
            conflicts: conflictsRequiringResolution,
          });

          setResolvedMappings(
            (currentMappings) =>
              new Map([
                ...Array.from(currentMappings.entries()),
                ...Array.from(autoResolvedMappingsForThisCheck.entries()),
              ])
          );
          setIsCreating(false);
          return;
        }

        mappingsForAction = new Map([
          ...resolvedMappings,
          ...autoResolvedMappingsForThisCheck,
        ]);
      }

      toast.info("Creating rationale...");

      const statementNode = currentNodes.find((n) => n.type === "statement") as
        | RFNode<PreviewStatementNodeData>
        | undefined;
      const rationaleTitle =
        statementNode?.data?.statement || "Untitled Rationale";
      const rationaleDescription = description || "";

      try {
        const spaceIdToUse = currentSpace;
        let topicIdToUse: number | undefined = undefined;
        if (topic && topicsData) {
          const matched = topicsData.find((t) => t.name === topic);
          if (matched) topicIdToUse = matched.id;
        }

        const result = await createRationaleFromPreview({
          userId: privyUser.id,
          spaceId: spaceIdToUse,
          title: rationaleTitle,
          description: rationaleDescription,
          topicId: topicIdToUse,
          nodes: currentNodes,
          edges: currentEdges,
          resolvedMappings: mappingsForAction,
        });

        if (result.success && result.rationaleId) {
          toast.success("Rationale created successfully!");
          router.push(`/s/${currentSpace}/rationale/${result.rationaleId}`);
        } else {
          toast.error(
            `Failed to create rationale: ${result.error || "Unknown error"}`
          );
        }
      } catch (error: any) {
        toast.error(
          `An error occurred: ${error.message || "Please try again"}`
        );
      } finally {
        setIsCreating(false);
      }
    },
    [
      isAuthenticated,
      currentSpace,
      privyUser,
      userData,
      reactFlowInstance,
      router,
      resolvedMappings,
      description,
      topic,
      topicsData,
    ]
  );

  const handleResolveDuplicates = useCallback(
    (newlyResolvedMappings: ResolvedMappings) => {
      setResolvedMappings(
        (currentMappings) =>
          new Map([
            ...Array.from(currentMappings.entries()),
            ...Array.from(newlyResolvedMappings.entries()),
          ])
      );
      setDuplicateDialogState({ isOpen: false, conflicts: [] });
      handleCreateRationale(true);
    },
    [handleCreateRationale]
  );

  return {
    isCreating,
    isDuplicateDialogOpen: duplicateDialogState.isOpen,
    conflictingPoints: duplicateDialogState.conflicts,
    handleCreateRationale,
    handleResolveDuplicates,
    closeDuplicateDialog: useCallback(() => {
      setDuplicateDialogState({ isOpen: false, conflicts: [] });
    }, [setDuplicateDialogState]),
  };
}
