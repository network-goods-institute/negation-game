import { sqids } from "@/services/sqids";

export const encodeId = (id: number) => {
  console.log('Encoding ID:', id, 'Type:', typeof id);
  if (id < 0) {
    console.error('Negative ID detected:', id);
  }
  return sqids.encode([id]);
};
