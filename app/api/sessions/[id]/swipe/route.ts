import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { movieId, liked } = await request.json();

  if (typeof movieId !== "number" || typeof liked !== "boolean") {
    return NextResponse.json({ error: "Invalid swipe data" }, { status: 400 });
  }

  try {
    // Verify session is in swiping state
    const sessionData = await queryOne<{ status: string; deck: number[] }>(
      "SELECT status, deck FROM sessions WHERE id = $1",
      [id]
    );

    if (!sessionData || sessionData.status !== "swiping") {
      return NextResponse.json({ error: "Session not in swiping state" }, { status: 400 });
    }

    // Record swipe (upsert)
    await query(
      `INSERT INTO swipes (session_id, user_id, movie_id, liked)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (session_id, user_id, movie_id)
       DO UPDATE SET liked = $4`,
      [id, session.user.id, movieId, liked]
    );

    // Check if user completed all swipes
    const swipeCountResult = await queryOne<{ count: string }>(
      "SELECT COUNT(*) as count FROM swipes WHERE session_id = $1 AND user_id = $2",
      [id, session.user.id]
    );

    const swipeCount = parseInt(swipeCountResult?.count || "0", 10);

    if (swipeCount === sessionData.deck.length) {
      // Mark participant as completed
      await query(
        "UPDATE session_participants SET completed = true WHERE session_id = $1 AND user_id = $2",
        [id, session.user.id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error recording swipe:", error);
    return NextResponse.json({ error: "Failed to record swipe" }, { status: 500 });
  }
}
