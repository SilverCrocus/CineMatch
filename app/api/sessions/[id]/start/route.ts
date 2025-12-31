import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getAuthUser } from "@/lib/mobile-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Verify user is host
    const sessionData = await queryOne<{ host_id: string; status: string }>(
      "SELECT host_id, status FROM sessions WHERE id = $1",
      [id]
    );

    if (!sessionData) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (sessionData.host_id !== user.id) {
      return NextResponse.json({ error: "Only host can start" }, { status: 403 });
    }

    if (sessionData.status !== "lobby") {
      return NextResponse.json({ error: "Session already started" }, { status: 400 });
    }

    // Update status to swiping
    await query(
      "UPDATE sessions SET status = 'swiping' WHERE id = $1",
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error starting session:", error);
    return NextResponse.json({ error: "Failed to start" }, { status: 500 });
  }
}
