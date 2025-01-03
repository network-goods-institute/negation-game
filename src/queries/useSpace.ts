import { fetchSpace } from "@/actions/fetchSpace";
import { getSpaceFromPathname } from "@/lib/negation-game/getSpaceFromPathname";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export const useSpace = () => {
  const pathName = usePathname();

  const space = useMemo(() => getSpaceFromPathname(pathName), [pathName]);

  return useQuery({
    queryKey: ["space", space],
    queryFn: ({ queryKey: [, space] }) => {
      if (!space) return null;

      return fetchSpace(space);
    },
  });
};
