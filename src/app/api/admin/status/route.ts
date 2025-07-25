import { NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { db } from "@/services/db";
import { usersTable, spaceAdminsTable, spacesTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is site admin
    const user = await db
      .select({ siteAdmin: usersTable.siteAdmin })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    const siteAdmin = user[0]?.siteAdmin ?? false;

    // Get spaces where user is admin
    const spaceAdminRows = await db
      .select({ spaceId: spaceAdminsTable.spaceId })
      .from(spaceAdminsTable)
      .where(eq(spaceAdminsTable.userId, userId));

    const adminSpaces = spaceAdminRows.map((row) => row.spaceId);

    // If user is site admin, get all available spaces
    let allSpaces: string[] = [];
    if (siteAdmin) {
      const spaces = await db.select({ id: spacesTable.id }).from(spacesTable);
      allSpaces = spaces.map((space) => space.id);
    }

    return NextResponse.json({
      siteAdmin,
      adminSpaces,
      allSpaces,
    });
  } catch (error) {
    console.error("Error fetching admin status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
