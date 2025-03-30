import { sqids } from "@/services/sqids";

export const decodeId = (encodedId?: string) => {
  if (!encodedId) return null;
  try {
    const decoded = sqids.decode(encodedId);
    return decoded.length > 0 ? decoded[0] : null;
  } catch (error) {
    console.error("Error decoding ID:", error);
    return null;
  }
};
