export interface FormatShortNumberOptions {}

export const formatShortNumber = (n: number): string => {
  if (n === 0) return "0";

  const order = Math.floor(Math.log10(n) / 3);
  const suffixes = ["", "k", "M", "B", "T"];
  const suffix = suffixes[order];
  const shortValue = n / Math.pow(10, order * 3);
  return shortValue.toFixed(1).replace(/[.]0$/, "") + suffix;
};
