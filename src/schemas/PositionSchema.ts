import { z } from "zod";

export const PositionSchema = z.object({
  title: z.string().min(3).max(32),
  description: z.string().min(3).max(320),
  pledge: z.coerce.number().int().min(10).max(999999),
});

export type PositionData = z.infer<typeof PositionSchema>;
