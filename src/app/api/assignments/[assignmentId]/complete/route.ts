import { NextResponse } from "next/server";
import { markAssignmentCompleted } from "@/actions/topics/manageRationaleAssignments";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params;
    
    const assignment = await markAssignmentCompleted(assignmentId);
    
    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found or not authorized" }, 
        { status: 404 }
      );
    }

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Error completing assignment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}