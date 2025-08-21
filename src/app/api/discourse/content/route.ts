import { NextRequest } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { checkRateLimitStrict } from "@/lib/rateLimit";
import { getDiscourseContent } from "@/actions/search/getDiscourseContent";

const ALLOWED_DISCOURSE_HOSTS = new Set<string>([
  "forum.ethereum.org",
  "gov.gitcoin.co",
  "commonwealth.im",
  "discourse.sourcecred.io",
  "forum.scroll.io",
]);

function isHttpsAllowedDiscourseUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (!ALLOWED_DISCOURSE_HOSTS.has(host)) return false;
    const path = u.pathname.replace(/\/$/, "");
    const slugOnly = /^\/t\/[^/]+$/.test(path);
    const withId = /^\/t\/[^/]+\/\d+(?:\/\d+)?$/.test(path);
    return slugOnly || withId;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url) {
    return new Response(JSON.stringify({ error: "Missing url" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!isHttpsAllowedDiscourseUrl(url)) {
    return new Response(
      JSON.stringify({ error: "Invalid or unsupported URL" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const rate = await checkRateLimitStrict(
    userId,
    10,
    60000,
    "discourse_content"
  );
  if (!rate.allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const content = await getDiscourseContent(url, { firstPostOnly: true });
    if (!content) {
      return new Response(JSON.stringify({ error: "Content not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch content" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
