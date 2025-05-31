import { fetchSpace } from "@/actions/spaces/fetchSpace";
import { useCurrentSpace } from "@/hooks/utils/useCurrentSpace";
import { useQuery } from "@tanstack/react-query";

export const useSpace = (spaceOverride?: string) => {
  const currentSpace = useCurrentSpace();
  const space = spaceOverride || currentSpace;

  return useQuery({
    queryKey: ["space", space],
    queryFn: ({ queryKey: [, space] }) => {
      if (!space) return null;

      return fetchSpace(space);
    },
  });
};
