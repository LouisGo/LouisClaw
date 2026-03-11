import { z } from "zod";

export const intakeInputSchema = z.object({
  source: z.string().min(1),
  device: z.string().min(1),
  capture_time: z.string().min(1),
  content_type: z.enum(["text", "link", "image", "code", "mixed", "video_link"]),
  raw_content: z.string().min(1),
  url: z.string().url().optional(),
  title: z.string().min(1).optional()
});

export type IntakeInputPayload = z.infer<typeof intakeInputSchema>;
