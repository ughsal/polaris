import { z } from "zod";

export const suggestionRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  code: z.string().max(20000),
  currentLine: z.string().max(2000),
  previousLines: z.array(z.string().max(1000)).max(20),
  textBeforeCursor: z.string().max(2000),
  textAfterCursor: z.string().max(2000),
  nextLines: z.array(z.string().max(1000)).max(20),
  lineNumber: z.number().int().min(1).max(100000),
});

export const suggestionResponseSchema = z.object({
  suggestion: z.string(),
});

export type SuggestionRequest = z.infer<typeof suggestionRequestSchema>;
export type SuggestionResponse = z.infer<typeof suggestionResponseSchema>;
