import { z } from "zod";

export const quickEditRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  instruction: z.string().trim().min(1).max(1000),
  selectedCode: z.string().min(1).max(8000),
  beforeSelection: z.string().max(4000),
  afterSelection: z.string().max(4000),
});

export const quickEditResponseSchema = z.object({
  replacement: z.string(),
});

export type QuickEditRequest = z.infer<typeof quickEditRequestSchema>;
export type QuickEditResponse = z.infer<typeof quickEditResponseSchema>;
