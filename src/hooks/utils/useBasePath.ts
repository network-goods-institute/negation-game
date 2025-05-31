import { spaceBasePath } from "@/lib/negation-game/spaceBasePath";
import { useCurrentSpace } from "@/hooks/utils/useCurrentSpace";

export const useBasePath = () => {
  const space = useCurrentSpace();

  return space ? spaceBasePath(space) : "";
};
