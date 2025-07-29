import { useQueryClient } from "@tanstack/react-query";
import { sendMessage, SendMessageArgs } from "@/actions/messages/sendMessage";
import { useUser } from "@/queries/users/useUser";
import { useAuthenticatedMutation } from "@/mutations/auth/useAuthenticatedMutation";
import { nanoid } from "nanoid";

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { data: user } = useUser();

  return useAuthenticatedMutation({
    mutationFn: sendMessage,
    onMutate: async (variables: SendMessageArgs) => {
      if (!user) return;

      const conversationQueryKey = [
        "conversation",
        user.id,
        variables.recipientId,
        variables.spaceId,
        undefined,
        undefined,
      ];

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: conversationQueryKey });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData(conversationQueryKey);

      // Optimistically update with temporary message
      const optimisticMessage = {
        id: `t${nanoid(19)}`, // Keep under 21 chars (t + 19 chars = 20 total)
        conversationId: `temp_conv`,
        content: variables.content,
        senderId: user.id,
        recipientId: variables.recipientId,
        space: variables.spaceId,
        isRead: false,
        isDeleted: false,
        isEdited: false,
        editedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _optimistic: true,
        _status: "sending" as const,
      };

      queryClient.setQueryData(conversationQueryKey, (old: any) => {
        return old ? [...old, optimisticMessage] : [optimisticMessage];
      });

      return { previousMessages, optimisticMessage, conversationQueryKey };
    },
    onSuccess: (messageId, variables, context) => {
      if (!context || !user) return;

      // Replace optimistic message with real one
      queryClient.setQueryData(context.conversationQueryKey, (old: any) => {
        if (!old) return old;
        return old.map((msg: any) =>
          msg.id === context.optimisticMessage.id
            ? {
                ...context.optimisticMessage,
                id: messageId,
                _optimistic: false,
                _status: "sent",
              }
            : msg
        );
      });

      // Invalidate to get fresh data
      queryClient.invalidateQueries({ queryKey: ["conversations", user.id, variables.spaceId] });
      queryClient.invalidateQueries({ queryKey: ["unreadMessageCount", variables.spaceId] });
    },
    onError: (error, variables, context) => {
      if (!context || !user) return;

      // Mark message as failed
      queryClient.setQueryData(context.conversationQueryKey, (old: any) => {
        if (!old) return old;
        return old.map((msg: any) =>
          msg.id === context.optimisticMessage.id
            ? { ...msg, _status: "failed", _error: error.message }
            : msg
        );
      });
    },
  });
};
