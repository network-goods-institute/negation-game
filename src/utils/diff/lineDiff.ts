export type DiffOp = "context" | "added" | "removed";

export interface DiffLine {
  type: DiffOp;
  text: string;
}

const lcsTable = (a: string[], b: string[]) => {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return dp;
};

export function computeLineDiff(
  originalText: string,
  updatedText: string
): DiffLine[] {
  const a = originalText.split(/\r?\n/);
  const b = updatedText.split(/\r?\n/);
  const dp = lcsTable(a, b);
  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      result.push({ type: "context", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: "removed", text: a[i] });
      i++;
    } else {
      result.push({ type: "added", text: b[j] });
      j++;
    }
  }
  while (i < a.length) {
    result.push({ type: "removed", text: a[i++] });
  }
  while (j < b.length) {
    result.push({ type: "added", text: b[j++] });
  }
  return result;
}
