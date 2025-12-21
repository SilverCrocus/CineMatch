import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, queryMany } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { movieId } = await request.json();

  if (typeof movieId !== "number") {
    return NextResponse.json({ error: "Invalid movie ID" }, { status: 400 });
  }

  try {
    // Get participants
    const participants = await queryMany<{ user_id: string }>(
      "SELECT user_id FROM session_participants WHERE session_id = $1",
      [id]
    );

    if (participants.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const watchedBy = participants.map((p) => p.user_id);

    // Record watched movie
    await query(
      `INSERT INTO watched_movies (session_id, movie_id, watched_by)
       VALUES ($1, $2, $3)`,
      [id, movieId, watchedBy]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error recording watched movie:", error);
    return NextResponse.json({ error: "Failed to record" }, { status: 500 });
  }
}
