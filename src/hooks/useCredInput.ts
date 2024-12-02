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
  const credInput = credOverride ?? internalCred;
  const setCredInput = setCredOverride ?? setInternalCred;
  const notEnoughCred = !!user && user.cred < credInput;

  useEffect(() => {
    return () => {
      if (shouldReset) {
        setCredInput(defaultValue);
      }
    };
  }, [shouldReset, defaultValue, setCredInput]);

  return {
    credInput,
    setCredInput,
    hasEnoughCred: !notEnoughCred,
    notEnoughCred,
    resetCredInput: () => setCredInput(defaultValue),
  };
}
