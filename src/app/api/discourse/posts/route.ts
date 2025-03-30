import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const discourseUrl = searchParams.get("url");

  if (!username || !discourseUrl) {
    return NextResponse.json(
      { error: "Missing username or discourse url" },
      { status: 400 }
    );
  }

  try {
    const cleanUrl = discourseUrl.trim().replace(/\/$/, "");
    const response = await fetch(`${cleanUrl}/posts.json?username=${username}`);

    if (!response.ok) {
      throw new Error(`Discourse API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Discourse API]", error);
    return NextResponse.json(
      { error: "Failed to fetch posts from Discourse" },
      { status: 500 }
    );
  }
}
