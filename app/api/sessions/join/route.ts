import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await request.json();

  if (!code) {
    return NextResponse.json({ error: "Room code required" }, { status: 400 });
  }

  try {
    // Find session by code
    const sessionData = await queryOne<{ id: string; status: string }>(
      "SELECT id, status FROM sessions WHERE code = $1",
      [code.toUpperCase()]
    );

    if (!sessionData) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (sessionData.status !== "lobby") {
      return NextResponse.json(
        { error: "Session already started" },
        { status: 400 }
      );
    }

    // Check if already participant
    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM session_participants WHERE session_id = $1 AND user_id = $2",
      [sessionData.id, session.user.id]
    );

    if (existing) {
      return NextResponse.json({ sessionId: sessionData.id });
    }

    // Add as participant
    await query(
      `INSERT INTO session_participants (session_id, user_id, nickname)
       VALUES ($1, $2, $3)`,
      [sessionData.id, session.user.id, session.user.name || "Guest"]
    );

    return NextResponse.json({ sessionId: sessionData.id });
  } catch (error) {
    console.error("Error joining session:", error);
    return NextResponse.json({ error: "Failed to join" }, { status: 500 });
  }
}
