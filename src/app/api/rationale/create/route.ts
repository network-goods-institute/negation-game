export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { generateRationaleCreationResponse } from "@/actions/ai/generateRationaleCreationResponse";

export async function POST(req: Request) {
  const { messages, context } = await req.json();
  const { textStream, suggestedGraph } =
    await generateRationaleCreationResponse(messages, context);

  return new NextResponse(textStream, {
    headers: {
      "Content-Type": "text/plain",
      "x-graph": JSON.stringify(suggestedGraph),
    },
  });
}
