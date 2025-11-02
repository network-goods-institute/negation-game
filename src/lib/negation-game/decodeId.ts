import { sqids } from "@/services/sqids";import { logger } from "@/lib/logger";

const PG_INT_MAX = 2147483647;

export const decodeId = (encodedId?: string) => {
  if (!encodedId) return null;
  try {
    const decoded = sqids.decode(encodedId);
    const id = decoded.length > 0 ? decoded[0] : null;

    if (typeof id !== "number") {
      logger.warn(`Decoded ID ${id} is not a number`);
      return null;
    }

    if (id !== null && (id < 1 || id > PG_INT_MAX)) {
      logger.warn(`Decoded ID ${id} is outside valid range (1-${PG_INT_MAX})`);
      return null;
    }

    return id;
  } catch (error) {
    logger.error("Error decoding ID:", error);
    return null;
  }
};
