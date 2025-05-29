import { sqids } from "@/services/sqids";

export const encodeId = (id: number | string | bigint) => {
  // Ensure we encode a safe integer
  const num =
    typeof id === "string" || typeof id === "bigint" ? Number(id) : id;
  // Fallback to 0 if NaN
  const validId = Number.isInteger(num) && num >= 0 ? num : 0;
  return sqids.encode([validId]);
};
