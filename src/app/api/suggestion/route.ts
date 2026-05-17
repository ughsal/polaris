import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { suggestionRequestSchema } from "@/features/editor/extensions/suggestion/schema";
import { isAbortLikeError } from "@/lib/ai/errors";
import { generateOllamaSuggestion } from "@/lib/ollama";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsedRequest = suggestionRequestSchema.safeParse(json);

  if (!parsedRequest.success) {
    console.error("[ai/suggestion] invalid request body", {
      issues: parsedRequest.error.issues,
    });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[ai/suggestion] route:start", {
        userId,
        fileName: parsedRequest.data.fileName,
        lineNumber: parsedRequest.data.lineNumber,
      });
    }

    return NextResponse.json({
      suggestion: await generateOllamaSuggestion(parsedRequest.data, request.signal),
    });
  } catch (error) {
    if (isAbortLikeError(error)) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[ai/suggestion] route:aborted", {
          userId,
          fileName: parsedRequest.data.fileName,
          lineNumber: parsedRequest.data.lineNumber,
        });
      }

      return new Response(null, { status: 499 });
    }

    console.error("[ai/suggestion] route:error", {
      userId,
      error,
    });

    return NextResponse.json(
      { error: "Unable to generate suggestion." },
      { status: 500 },
    );
  }
}
