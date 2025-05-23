import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { useReactFlow } from "@xyflow/react";
import type { AppNode } from "@/components/graph/AppNode";
import type { ViewpointGraph } from "@/atoms/viewpointAtoms";
import {
  viewpointGraphAtom,
  collapsedPointIdsAtom,
} from "@/atoms/viewpointAtoms";
import { useUpdateViewpointDetails } from "@/mutations/useUpdateViewpointDetails";

export interface UseSaveViewpointParams {
  viewpointId: string;
  createdBy: string;
  isOwner: boolean;
  basePath: string;
  title: string;
  description: string;
  topic: string;
  topicId?: number;
  originalGraph: ViewpointGraph;
}

export default function useSaveViewpoint({
  viewpointId,
  createdBy,
  isOwner,
  basePath,
  title,
  description,
  topic,
  topicId,
  originalGraph,
}: UseSaveViewpointParams) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const reactFlow = useReactFlow<AppNode>();
  const updateDetails = useUpdateViewpointDetails();
  const [, setGraph] = useAtom(viewpointGraphAtom);
  const [, setCollapsedPointIds] = useAtom(collapsedPointIdsAtom);
  const [isSaving, setIsSaving] = useState(false);

  const onSaveChanges = useCallback(
    async (filteredGraph: ViewpointGraph) => {
      if (!filteredGraph) {
        console.error("[useSaveViewpoint] No graph to save");
        return false;
      }
      try {
        setIsSaving(true);
        // Fork logic for non-owner
        if (!isOwner && reactFlow) {
          const currentGraph = filteredGraph;
          sessionStorage.setItem(
            `copyingViewpoint:${basePath}`,
            JSON.stringify({
              isCopyOperation: true,
              copiedFromId: viewpointId,
              title,
              description,
              topic,
              graph: currentGraph,
            })
          );
          router.push(`${basePath}/rationale/new`);
          return true;
        }
        // Update details
        await updateDetails.mutateAsync({
          id: viewpointId,
          title,
          description,
          topicId,
        });
        queryClient.setQueryData(["viewpoint", viewpointId], (old: any) => ({
          ...old,
          title,
          description,
          topic,
        }));
        // Update graph
        queryClient.setQueryData(["viewpoint", viewpointId], (old: any) => ({
          ...old,
          graph: filteredGraph,
        }));
        setGraph(filteredGraph);
        setCollapsedPointIds(new Set());
        return true;
      } catch (err) {
        console.error("[useSaveViewpoint] save failed", err);
        // rollback to original graph
        setGraph(originalGraph);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [
      viewpointId,
      isOwner,
      basePath,
      title,
      description,
      topic,
      topicId,
      originalGraph,
      reactFlow,
      router,
      updateDetails,
      queryClient,
      setGraph,
      setCollapsedPointIds,
    ]
  );

  return { onSaveChanges, isSaving };
}
