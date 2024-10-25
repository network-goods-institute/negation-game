import { sqids } from "@/services/sqids";

export const decodeId = (encodedId: string) => sqids.decode(encodedId)[0];
