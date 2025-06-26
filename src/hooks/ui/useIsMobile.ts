import { useState, useEffect, useCallback } from "react";

/**
 * Hook to detect if the viewport width is below a given breakpoint.
 * @param breakpoint Width in pixels to consider as the mobile threshold.
 * @returns boolean indicating if viewport width < breakpoint.
 */
export default function useIsMobile(breakpoint = 768): boolean {
  const getIsMobile = useCallback(
    () => typeof window !== "undefined" && window.innerWidth < breakpoint,
    [breakpoint]
  );

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(getIsMobile());
    };

    // Set initial state on mount
    handleResize();
    
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [getIsMobile]);

  return isMobile;
}
