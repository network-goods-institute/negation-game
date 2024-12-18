import { getSpaceFromPathname } from "@/lib/negation-game/getSpaceFromPathname";
import { spaceBasePath } from "@/lib/negation-game/spaceBasePath";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export const useBasePath = () => {
  const pathName = usePathname();

  const space = useMemo(() => getSpaceFromPathname(pathName), [pathName]);

  return space ? spaceBasePath(space) : "/";
};
