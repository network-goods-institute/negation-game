import { useQueryClient } from "@tanstack/react-query";
import {
  markMessagesAsRead,
  MarkMessagesAsReadArgs,
} from "@/actions/messages/markMessagesAsRead";
import { useAuthenticatedMutation } from "../auth/useAuthenticatedMutation";

export const useMarkMessagesAsRead = () => {
  const queryClient = useQueryClient();

  return useAuthenticatedMutation({
    mutationFn: (args: MarkMessagesAsReadArgs) => markMessagesAsRead(args),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", undefined, variables.spaceId] });
      queryClient.invalidateQueries({ queryKey: ["unreadMessageCount", variables.spaceId] });
    },
  });
};
