export interface FavorArgs {
  cred: number;
  negationsCred: number;
  restakeAmount?: number;
  slashedAmount?: number;
}

export const favor = ({ cred, negationsCred, restakeAmount = 0, slashedAmount = 0 }: FavorArgs) => {
  // Base favor calculation
  const baseFavor = cred > 0 ? Math.floor((100 * cred) / (negationsCred + cred)) : 0;
  
  // Add restake bonus (effective restake amount after slashing)
  const effectiveRestakeAmount = Math.max(0, (restakeAmount || 0) - (slashedAmount || 0));
  
  // Return total favor
  return Math.max(0, Math.min(100, baseFavor + effectiveRestakeAmount));
};
