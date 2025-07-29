// this hook confusing af

import { useQueryClient } from "@tanstack/react-query";
import {
  deleteMessage,
  DeleteMessageArgs,
} from "@/actions/messages/deleteMessage";
import { useAuthenticatedMutation } from "../auth/useAuthenticatedMutation";
import { Message } from "@/types/messages";

export const useDeleteMessage = (spaceId?: string) => {
  const queryClient = useQueryClient();

  return useAuthenticatedMutation({
    mutationFn: (args: DeleteMessageArgs) => deleteMessage(args),
    onMutate: async ({ messageId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["conversation"] });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({
        queryKey: ["conversation"],
      });

      // Optimistically update all conversation queries - mark as deleted and change content
      queryClient.setQueriesData(
        { queryKey: ["conversation"] },
        (old: Message[] | undefined) => {
          if (!old) return old;
          return old.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  isDeleted: true,
                  content: "This message was deleted",
                  updatedAt: new Date(),
                }
              : msg
          );
        }
      );

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      if (spaceId) {
        queryClient.invalidateQueries({ queryKey: ["conversations", undefined, spaceId] });
        queryClient.invalidateQueries({ queryKey: ["conversation", undefined, undefined, spaceId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["conversation"] });
      }
    },
  });
};
