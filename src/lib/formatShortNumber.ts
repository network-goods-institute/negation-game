export const formatShortNumber = (favor: number): string => {
  const order = Math.floor(Math.log10(favor) / 3);
  const suffixes = ["", "k", "M", "B", "T"];
  const suffix = suffixes[order];
  const shortValue = favor / Math.pow(10, order * 3);
  return shortValue.toFixed(1).replace(/[.]0$/, "") + suffix;
};
