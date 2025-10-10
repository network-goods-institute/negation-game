import { NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { getUserIdOrAnonymous } from "@/actions/users/getUserIdOrAnonymous";
import { isProductionRequest } from "@/utils/hosts";
import { createHash } from "crypto";

export async function POST(req: Request) {
  if (process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const hostname = url.hostname;
  // Require auth on production requests; allow anon only on non-production requests
  const nonProd = !isProductionRequest(hostname);

  let userId: string | null = null;
  if (nonProd) {
    userId = await getUserIdOrAnonymous();
  } else {
    userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const secret = process.env.YJS_AUTH_SECRET;
  if (!secret) {
    console.error("YJS_AUTH_SECRET not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const expiry = timestamp + 60 * 60 * 8;
  const payload = JSON.stringify({ userId, expiry });
  const payloadB64 = Buffer.from(payload).toString("base64");
  const signature = createHash("sha256")
    .update(payloadB64 + secret)
    .digest("hex");

  const token = `${payloadB64}.${signature}`;

  const res = NextResponse.json({
    token,
    expiresAt: expiry * 1000,
  });
  try {
    res.headers.set("x-yjs-expires-at", String(expiry * 1000));
    res.headers.set("cache-control", "no-store");
  } catch {}
  return res;
}
