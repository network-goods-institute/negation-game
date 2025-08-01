import { useQueryClient } from "@tanstack/react-query";
import { editMessage, EditMessageArgs } from "@/actions/messages/editMessage";
import { useAuthenticatedMutation } from "../auth/useAuthenticatedMutation";
import { Message } from "@/types/messages";
import { useUser } from "@/queries/users/useUser";

export const useEditMessage = (spaceId?: string) => {
  const queryClient = useQueryClient();
  const { data: user } = useUser();

  return useAuthenticatedMutation({
    mutationFn: (args: EditMessageArgs) => editMessage(args),
    onMutate: async ({ messageId, content }) => {
      if (!user) return;

      const conversationQueryKeys = queryClient
        .getQueryCache()
        .findAll({ queryKey: ["conversation"] })
        .map((query) => query.queryKey);

      await Promise.all(
        conversationQueryKeys.map((key) =>
          queryClient.cancelQueries({ queryKey: key })
        )
      );

      const previousData = conversationQueryKeys.map((key) => [
        key,
        queryClient.getQueryData(key),
      ]);

      conversationQueryKeys.forEach((key) => {
        queryClient.setQueryData(key, (old: Message[] | undefined) => {
          if (!old) return old;
          return old.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  content,
                  isEdited: true,
                  editedAt: new Date(),
                  _optimistic: true,
                  _status: "editing" as const,
                }
              : msg
          );
        });
      });

      return { previousData };
    },
    onSuccess: (_, { messageId, content }) => {
      const conversationQueryKeys = queryClient
        .getQueryCache()
        .findAll({ queryKey: ["conversation"] })
        .map((query) => query.queryKey);

      conversationQueryKeys.forEach((key) => {
        queryClient.setQueryData(key, (old: Message[] | undefined) => {
          if (!old) return old;
          return old.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  _optimistic: false,
                  _status: "edited" as const,
                }
              : msg
          );
        });
      });

      if (spaceId && user) {
        queryClient.invalidateQueries({
          queryKey: ["conversations", user.id, spaceId],
          refetchType: "none",
        });
      }
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey as any, data);
        });
      }
    },
  });
};
