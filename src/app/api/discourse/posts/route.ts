import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { checkRateLimitStrict } from "@/lib/rateLimit";

const ALLOWED_DISCOURSE_HOSTS = new Set<string>([
  "forum.ethereum.org",
  "gov.gitcoin.co",
  "commonwealth.im",
  "discourse.sourcecred.io",
  "forum.scroll.io",
]);

function isValidPublicHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h.startsWith("127.") ||
    h.startsWith("10.") ||
    h.startsWith("192.168.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h) ||
    /^169\.254\./.test(h) ||
    /^224\./.test(h) ||
    /^f[cd][0-9a-f]{2}:/i.test(h)
  ) {
    return false;
  }
  return true;
}

function sanitizeUsernameSegment(input: string): string | null {
  // Discourse usernames are typically alphanumeric, dashes and underscores
  // Keep conservative to avoid path traversal or injection
  const match = input.match(/^[A-Za-z0-9._-]{1,64}$/);
  return match ? match[0] : null;
}

export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const discourseUrl = searchParams.get("url");

  if (!username || !discourseUrl) {
    return NextResponse.json(
      { error: "Missing username or discourse url" },
      { status: 400 }
    );
  }

  const rate = await checkRateLimitStrict(userId, 10, 60000, "discourse_posts");
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const parsedBase = new URL(discourseUrl.trim());
    if (parsedBase.protocol !== "https:") {
      return NextResponse.json({ error: "HTTPS required" }, { status: 400 });
    }
    if (!isValidPublicHostname(parsedBase.hostname)) {
      return NextResponse.json({ error: "Host not allowed" }, { status: 400 });
    }
    if (!ALLOWED_DISCOURSE_HOSTS.has(parsedBase.hostname.toLowerCase())) {
      return NextResponse.json(
        { error: "Forum host not permitted" },
        { status: 400 }
      );
    }

    const cleanUsername = sanitizeUsernameSegment(username);
    if (!cleanUsername) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }

    const endpoint = new URL(
      `/users/${cleanUsername}/activity.json`,
      parsedBase
    );

    const response = await fetch(endpoint.toString(), {
      cache: "no-store",
      redirect: "error",
      headers: {
        Accept: "application/json",
        "User-Agent": "NegationGameBot/1.0",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch posts from Discourse (${response.status})` },
        { status: response.status }
      );
    }

    const data = await response.json().catch(() => null);
    if (!Array.isArray(data)) {
      return NextResponse.json(
        {
          error: "Invalid response format from Discourse API (expected array)",
        },
        { status: 502 }
      );
    }

    const simplifiedPosts = data.map((post: any) => ({
      id: post.id,
      content: post.cooked,
      created_at: post.created_at,
      topic_title: post.topic_title || "",
    }));

    return NextResponse.json({ latest_posts: simplifiedPosts });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch posts from Discourse" },
      { status: 500 }
    );
  }
}
