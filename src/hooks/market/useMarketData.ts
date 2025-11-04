import { useMemo } from 'react';
import { extractMarketData } from '@/utils/market/marketUtils';

/**
 * Hook to extract and memoize market data from node/edge data
 */
export function useMarketData(data: any) {
  return useMemo(() => extractMarketData(data), [data]);
}
