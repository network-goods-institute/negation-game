import { ScrollProposalWorker } from "@/workers/scrollProposalWorker";
import { NextResponse } from "next/server";

export async function POST() {
  const result = await ScrollProposalWorker.run();

  if (result.success) {
    return NextResponse.json(result);
  } else {
    return NextResponse.json(result, { status: 500 });
  }
}

export async function GET() {
  const status = ScrollProposalWorker.getStatus();
  return NextResponse.json(status);
}
