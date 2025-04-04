import { sqids } from "@/services/sqids";

const PG_INT_MAX = 2147483647;

export const decodeId = (encodedId?: string) => {
  if (!encodedId) return null;
  try {
    const decoded = sqids.decode(encodedId);
    const id = decoded.length > 0 ? decoded[0] : null;

    if (typeof id !== "number") {
      console.warn(`Decoded ID ${id} is not a number`);
      return null;
    }

    if (id !== null && (id < 1 || id > PG_INT_MAX)) {
      console.warn(`Decoded ID ${id} is outside valid range (1-${PG_INT_MAX})`);
      return null;
    }

    return id;
  } catch (error) {
    console.error("Error decoding ID:", error);
    return null;
  }
};
