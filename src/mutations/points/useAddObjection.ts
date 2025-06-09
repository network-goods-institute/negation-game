import { addObjection, AddObjectionArgs } from "@/actions/points/addObjection";
import { useMutation } from "@tanstack/react-query";

export const useAddObjection = () => {
  return useMutation({
    mutationFn: async (args: AddObjectionArgs) => {
      return await addObjection(args);
    },
  });
};
