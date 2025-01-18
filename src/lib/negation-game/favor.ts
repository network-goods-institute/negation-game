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
  doubtedAmount = 0,
  totalRestakeAmount = 0
}: FavorArgs) => {
  console.log('Calculating favor:', {
    inputs: {
      cred,
      negationsCred,
      restakeAmount,
      slashedAmount,
      doubtedAmount,
      totalRestakeAmount
    }
  });

  let result;
  if (cred === 0) {
    result = 0;
  } else if (negationsCred === 0) {
    result = 100;
  } else {
    const baseFavor = Math.floor((100 * cred) / (cred + negationsCred));
    result = baseFavor + (restakeAmount || 0);
  }
  
  console.log('Favor calculation result:', {
    result
  });
  
  return result;
};
