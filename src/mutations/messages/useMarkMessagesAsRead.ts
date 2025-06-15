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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["unreadMessageCount"] });
    },
  });
};
