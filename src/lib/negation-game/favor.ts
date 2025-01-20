export interface FavorArgs {
  cred: number;
  negationsCred: number;
  restakeAmount?: number;
  slashedAmount?: number;
  doubtedAmount?: number;
  totalRestakeAmount?: number;
}

export const favor = ({ 
  cred, 
  negationsCred,
  restakeAmount = 0,
  slashedAmount = 0,
  doubtedAmount = 0
}: FavorArgs) => {
  let baseFavor;
  if (cred === 0) {
    baseFavor = 0;
  } else if (negationsCred === 0) {
    baseFavor = 100;
  } else {
    baseFavor = Math.floor(100 * cred / (cred + negationsCred));
  }

  // Calculate effective restake amount by subtracting the greater of slashed or doubted amounts
  const effectiveRestakeAmount = Math.max(0, restakeAmount - Math.max(slashedAmount, doubtedAmount));

  const finalFavor = baseFavor + effectiveRestakeAmount;
  
  return finalFavor;
};
