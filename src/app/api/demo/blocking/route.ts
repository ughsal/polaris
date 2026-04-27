// POST localhost:3000/api/demo/blocking
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function POST() {
  try {
    console.log("Route hit");

    console.log("Client created");

    const response = await generateText({
      model: google("gemini-2.5-flash"),
      prompt: "Write a vegetarian lasagna recipe for 4 people.",
      experimental_telemetry: {
        isEnabled: true,
        recordInputs: true,
        recordOutputs: true,
      },
    });

    console.log("Text generated");

    return Response.json({ response });
  } catch (err: any) {
    console.error("FULL ERROR:", err);
    return Response.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}

// cwa.run/google-api
