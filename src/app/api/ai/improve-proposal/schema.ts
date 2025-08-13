import { z } from "zod";

export const improveProposalBodySchema = z.object({
  currentText: z.string().min(1).max(200_000),
  instruction: z.string().min(1).max(10_000),
  originalText: z.string().optional().nullable(),
  topicId: z.number().int().positive().optional().nullable(),
  selectedUserIds: z.array(z.string()).max(50).optional().nullable(),
});

export type ImproveProposalBody = z.infer<typeof improveProposalBodySchema>;
