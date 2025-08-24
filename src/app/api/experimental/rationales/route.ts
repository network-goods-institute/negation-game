import { NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { fetchMpDocs } from "@/actions/experimental/fetchMpDocs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED !== 'true') {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const userId = await getUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const docs = await fetchMpDocs(100);
  return NextResponse.json({ docs });
}
