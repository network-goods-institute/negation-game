import { useEffect } from "react";

export const useResetLoadingOnPathChange = (
  pathname: string | undefined,
  reset: () => void
) => {
  useEffect(() => {
    reset();
    return () => {
      reset();
    };
  }, [pathname, reset]);
};
