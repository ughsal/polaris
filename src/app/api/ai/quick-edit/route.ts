import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { quickEditRequestSchema } from "@/features/editor/extensions/quick-edit/schema";
import { isAbortLikeError } from "@/lib/ai/errors";
import { generateQuickEdit } from "@/lib/ai/quick-edit";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsedRequest = quickEditRequestSchema.safeParse(json);

  if (!parsedRequest.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    return NextResponse.json({
      replacement: await generateQuickEdit(parsedRequest.data, request.signal),
    });
  } catch (error) {
    if (isAbortLikeError(error)) {
      return new Response(null, { status: 499 });
    }

    if (error instanceof Error) {
      if (error.message === "Firecrawl URL context is not configured.") {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }

      if (error.message === "Firecrawl request timed out.") {
        return NextResponse.json({ error: error.message }, { status: 504 });
      }
    }

    return NextResponse.json(
      { error: "Unable to apply quick edit." },
      { status: 500 },
    );
  }
}
