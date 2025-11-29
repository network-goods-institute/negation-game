export const isMindchangeEnabledClient = () => {
  if (typeof window === 'undefined') return false;
  return process.env.NEXT_PUBLIC_ENABLE_MINDCHANGE === 'true';
};

export const isMarketEnabledClient = () => {
  if (typeof window === 'undefined') return false;
  return process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED === 'true';
};
