import { NextRequest, NextResponse } from "next/server";
import { getDiscourseContent } from "@/actions/search/getDiscourseContent";
import { getUserId } from "@/actions/users/getUserId";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const content = await getDiscourseContent(url, { firstPostOnly: true });
    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch discourse content" },
      { status: 500 }
    );
  }
}
