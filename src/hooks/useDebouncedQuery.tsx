import {
  QueryKey,
  UseQueryOptions,
  UseQueryResult,
  hashKey,
  useQuery,
} from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

export function useDebouncedQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>({
  enabled,
  queryKey,
  queryKeyHashFn = hashKey,
  delay = 500,
  ...options
}: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> & {
  delay?: number;
}): UseQueryResult<TData, TError> {
  const [debouncedEnabled, setDebouncedEnabled] = useState(enabled);

  const queryKeyHash = useMemo(
    () => queryKeyHashFn(queryKey),
    [queryKey, queryKeyHashFn]
  );

  useEffect(() => {
    setDebouncedEnabled(false);
    const timeout = setTimeout(() => {
      setDebouncedEnabled(true);
    }, delay);

    return () => {
      clearTimeout(timeout);
    };
  }, [queryKeyHash, delay]);

  return useQuery({
    enabled: debouncedEnabled && enabled,
    queryKey,
    queryKeyHashFn,
    ...options,
  });
}
