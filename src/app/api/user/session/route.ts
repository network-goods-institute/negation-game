import { NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { getUserIdOrAnonymous } from "@/actions/users/getUserIdOrAnonymous";
import { isProductionRequest } from "@/utils/hosts";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const nonProd = !isProductionRequest(url.hostname);
  const userId = nonProd ? await getUserIdOrAnonymous() : await getUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ userId });
}
