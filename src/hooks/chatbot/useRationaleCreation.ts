import { useState, useCallback } from "react";
import { useReactFlow, Node as RFNode } from "@xyflow/react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useUser } from "@/queries/useUser";
import { useTopics } from "@/queries/useTopics";
import { toast } from "sonner";
import { fetchPointsByExactContent } from "@/actions/fetchPointsByExactContent";
import { createRationaleFromPreview } from "@/actions/createRationaleFromPreview";
import {
  POINT_MIN_LENGTH,
  POINT_MAX_LENGTH,
  DEFAULT_SPACE,
} from "@/constants/config";
import {
  ConflictingPoint,
  ResolvedMappings,
} from "@/components/chatbot/DuplicatePointSelectionDialog";
import { PreviewAppNode, PreviewAppEdge } from "@/types/rationaleGraph";
import { PreviewStatementNodeData } from "@/components/chatbot/PreviewStatementNode";
import { PreviewPointNodeData } from "@/components/chatbot/PreviewPointNode";

interface UseRationaleCreationProps {
  isAuthenticated: boolean;
  currentSpace: string | null;
  description: string;
  topic: string;
  persistedGraphNodes: RFNode[]; // Use basic RFNode type from @xyflow/react for persisted graph parts if not already PreviewAppNode
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
  const { data: topicsData } = useTopics(currentSpace || DEFAULT_SPACE);
  const reactFlowInstance = useReactFlow<PreviewAppNode, PreviewAppEdge>();

  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [conflictingPoints, setConflictingPoints] = useState<
    ConflictingPoint[]
  >([]);
  const [resolvedMappings, setResolvedMappings] = useState<ResolvedMappings>(
    new Map()
  );
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRationale = useCallback(
    async (useResolvedMappings = false) => {
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
            console.error(
              "[useRationaleCreation] Error fetching existing points:",
              error
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

        const conflicts: ConflictingPoint[] = pointNodes
          .map((node) => ({
            previewNodeId: node.id,
            content: node.data.content,
            existingPoints:
              contentToExistingPointsMap.get(node.data.content) || [],
          }))
          .filter((conflict) => conflict.existingPoints.length > 0);

        if (conflicts.length > 0) {
          setConflictingPoints(conflicts);
          setIsDuplicateDialogOpen(true);
          setIsCreating(false);
          return;
        }
        mappingsForAction = new Map<string, number | null>();
      }

      toast.info("Creating rationale...");

      const statementNode = currentNodes.find((n) => n.type === "statement") as
        | RFNode<PreviewStatementNodeData>
        | undefined;
      const rationaleTitle =
        statementNode?.data?.statement || "Untitled Rationale";
      const rationaleDescription = description || ""; // Use description from props

      try {
        const spaceIdToUse = currentSpace || DEFAULT_SPACE;
        let topicIdToUse: number | undefined = undefined;
        if (topic && topicsData) {
          // Use topic from props
          const matched = topicsData.find((t) => t.name === topic);
          if (matched) topicIdToUse = matched.id;
        }

        const result = await createRationaleFromPreview({
          userId: privyUser.id,
          spaceId: spaceIdToUse,
          title: rationaleTitle,
          description: rationaleDescription,
          topicId: topicIdToUse,
          nodes: currentNodes, // These are PreviewAppNode[] from reactFlowInstance.getNodes()
          edges: currentEdges, // These are PreviewAppEdge[] from reactFlowInstance.getEdges()
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
        console.error("[useRationaleCreation] Action call failed:", error);
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
    (mappings: ResolvedMappings) => {
      setResolvedMappings(mappings);
      setIsDuplicateDialogOpen(false);
      handleCreateRationale(true); // Call with useResolvedMappings = true
    },
    [handleCreateRationale]
  );

  return {
    isCreating,
    isDuplicateDialogOpen,
    conflictingPoints,
    handleCreateRationale,
    handleResolveDuplicates,
    setIsDuplicateDialogOpen,
  };
}
