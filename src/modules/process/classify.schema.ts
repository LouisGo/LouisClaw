import { z } from "zod";

export const classificationResultSchema = z.object({
  decision: z.enum(["drop", "archive", "digest", "follow_up"]),
  value_score: z.number().min(0).max(100),
  tags: z.array(z.string()).max(8),
  topic: z.string().min(1),
  summary: z.string().min(1).max(200),
  reason: z.string().min(1).max(240)
});

export type ClassificationResult = z.infer<typeof classificationResultSchema>;
