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
    console.log(
      `[Discourse API] Fetching posts for username: ${username} from URL: ${discourseUrl}`
    );
    const cleanUrl = discourseUrl.trim().replace(/\/$/, "");

    const endpoint = `${cleanUrl}/users/${username}/activity.json`;
    console.log(`[Discourse API] Using endpoint: ${endpoint}`);

    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `[Discourse API] Endpoint failed with status ${response.status}`
      );
      const errorText = await response.text();
      console.error(`[Discourse API] Error response body: ${errorText}`);
      return NextResponse.json(
        {
          error: `Failed to fetch posts from Discourse (${response.status}). Response: ${errorText}`,
        },
        { status: response.status }
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      const responseText = await response.text();
      console.error("[Discourse API] Failed to parse JSON response.", e);
      console.error(`[Discourse API] Raw response text: ${responseText}`);
      return NextResponse.json(
        {
          error: "Failed to parse response from Discourse API.",
          rawResponse: responseText,
        },
        { status: 500 }
      );
    }

    if (!Array.isArray(data)) {
      console.error(
        "[Discourse API] Unexpected response format, expected array",
        data
      );
      return NextResponse.json(
        {
          error: "Invalid response format from Discourse API (expected array)",
          responseData: data,
        },
        { status: 500 }
      );
    }

    console.log(
      `[Discourse API] Found ${data.length} posts for user ${username}`
    );

    const simplifiedPosts = data.map((post) => ({
      id: post.id,
      content: post.cooked,
      created_at: post.created_at,
      topic_title: post.topic_title || "",
    }));

    return NextResponse.json({
      latest_posts: simplifiedPosts,
    });
  } catch (error) {
    console.error("[Discourse API] General error:", error);
    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while fetching posts from Discourse",
      },
      { status: 500 }
    );
  }
}
