// this hook confusing af
import { useQueryClient } from "@tanstack/react-query";
import { editMessage, EditMessageArgs } from "@/actions/messages/editMessage";
import { useAuthenticatedMutation } from "../auth/useAuthenticatedMutation";
import { Message } from "@/types/messages";

export const useEditMessage = () => {
  const queryClient = useQueryClient();

  return useAuthenticatedMutation({
    mutationFn: (args: EditMessageArgs) => editMessage(args),
    onMutate: async ({ messageId, content }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["conversation"] });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({
        queryKey: ["conversation"],
      });

      // Optimistically update all conversation queries
      queryClient.setQueriesData(
        { queryKey: ["conversation"] },
        (old: Message[] | undefined) => {
          if (!old) return old;
          return old.map((msg) =>
            msg.id === messageId
              ? { ...msg, content, isEdited: true, editedAt: new Date() }
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
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation"] });
    },
  });
};
