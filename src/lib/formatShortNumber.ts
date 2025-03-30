export interface FormatShortNumberOptions {}

/**
 * Formats a number into a short representation (e.g., 1000 -> 1k)
 * Handles edge cases like undefined, null, or NaN values
 */
export const formatShortNumber = (n: number | undefined | null): string => {
  // Handle edge cases
  if (n === undefined || n === null) return "0";

  const num = Number(n);
  if (isNaN(num)) return "0";
  if (num === 0) return "0";

  // Format numbers less than 1 but greater than 0
  if (num > 0 && num < 1) {
    return num.toFixed(1);
  }

  const order = Math.floor(Math.log10(num) / 3);
  const suffixes = ["", "k", "M", "B", "T"];
  const suffix = suffixes[Math.min(order, suffixes.length - 1)];
  const shortValue = num / Math.pow(10, order * 3);
  return shortValue.toFixed(1).replace(/[.]0$/, "") + suffix;
};
