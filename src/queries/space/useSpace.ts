import { fetchSpace } from "@/actions/spaces/fetchSpace";
import { useCurrentSpace } from "@/hooks/utils/useCurrentSpace";
import { useQuery } from "@tanstack/react-query";

export const useSpace = (spaceOverride?: string) => {
  const currentSpace = useCurrentSpace();
  const space = spaceOverride || currentSpace;

  return useQuery({
    queryKey: ["space", space],
    queryFn: ({ queryKey: [, rawSpace] }) => {
      if (!rawSpace) return null;
      let decoded: string;
      try {
        decoded = decodeURIComponent(rawSpace as string);
      } catch {
        decoded = rawSpace as string;
      }
      return fetchSpace(decoded);
    },
  });
};
