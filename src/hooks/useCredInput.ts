import { useUser } from "@/hooks/useUser";
import { useEffect, useState } from "react";

export interface UseCredInputOptions {
  defaultValue?: number;
  resetWhen?: boolean;
  cred?: number;
  setCred?: (value: number) => void;
}

export function useCredInput({
  defaultValue = 1,
  resetWhen: shouldReset = false,
  cred: credOverride,
  setCred: setCredOverride,
}: UseCredInputOptions = {}) {
  const [internalCred, setInternalCred] = useState(defaultValue);
  const { data: user } = useUser();
  const cred = credOverride ?? internalCred;
  const setCred = setCredOverride ?? setInternalCred;
  const notEnoughCred = !!user && user.cred < cred;

  useEffect(() => {
    return () => {
      if (shouldReset) {
        setCred(defaultValue);
      }
    };
  }, [shouldReset, defaultValue, setCred]);

  return {
    cred,
    setCred,
    hasEnoughCred: !notEnoughCred,
    notEnoughCred,
    resetCred: () => setCred(defaultValue),
  };
}
