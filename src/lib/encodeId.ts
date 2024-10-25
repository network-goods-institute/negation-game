import { sqids } from "@/services/sqids";

export const encodeId = (id: number) => sqids.encode([id]);
