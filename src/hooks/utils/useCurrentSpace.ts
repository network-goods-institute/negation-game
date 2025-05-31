import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { getSpaceFromPathname } from "@/lib/negation-game/getSpaceFromPathname";

/**
 * Returns the current space slug from the pathname (/s/:space),
 * or null if the path does not include a space segment.
 */
export function useCurrentSpace(): string | null {
  const pathname = usePathname();
  return useMemo(() => getSpaceFromPathname(pathname), [pathname]);
}
