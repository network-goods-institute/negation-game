import { fetchSpace } from "@/actions/spaces/fetchSpace";
import { getSpaceFromPathname } from "@/lib/negation-game/getSpaceFromPathname";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export const useSpace = (spaceOverride?: string) => {
  const pathName = usePathname();

  const space = useMemo(() => {
    // If spaceOverride is provided, use it; otherwise get from pathname
    return spaceOverride || getSpaceFromPathname(pathName);
  }, [pathName, spaceOverride]);

  return useQuery({
    queryKey: ["space", space],
    queryFn: ({ queryKey: [, space] }) => {
      if (!space) return null;

      return fetchSpace(space);
    },
  });
};
