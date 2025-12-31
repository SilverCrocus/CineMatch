import { NextRequest, NextResponse } from "next/server";
import { queryOne, queryMany } from "@/lib/db";
import { getAuthUser } from "@/lib/mobile-auth";
import { getMoviesByIds } from "@/lib/services/movies";

interface SessionRow {
  id: string;
  code: string;
  status: string;
  host_id: string;
  deck: number[];
}

interface ParticipantRow {
  id: string;
  user_id: string;
  nickname: string;
  completed: boolean;
  user_name: string | null;
  user_image: string | null;
}

interface SwipeRow {
  movie_id: number;
  liked: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Get session
    const sessionData = await queryOne<SessionRow>(
      "SELECT id, code, status, host_id, deck FROM sessions WHERE id = $1",
      [id]
    );

    if (!sessionData) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get participants with user info
    const participants = await queryMany<ParticipantRow>(
      `SELECT sp.id, sp.user_id, sp.nickname, sp.completed,
              u.name as user_name, u.image as user_image
       FROM session_participants sp
       LEFT JOIN users u ON sp.user_id = u.id
       WHERE sp.session_id = $1`,
      [id]
    );

    // Check if user is participant
    const isParticipant = participants.some(
      (p) => p.user_id === user.id
    );

    if (!isParticipant) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    // Get movies for the deck
    const movies = await getMoviesByIds(sessionData.deck);

    // Get user's swipes if swiping
    let userSwipes: Record<number, boolean> = {};
    if (sessionData.status !== "lobby") {
      const swipes = await queryMany<SwipeRow>(
        "SELECT movie_id, liked FROM swipes WHERE session_id = $1 AND user_id = $2",
        [id, user.id]
      );

      userSwipes = Object.fromEntries(
        swipes.map((s) => [s.movie_id, s.liked])
      );
    }

    return NextResponse.json({
      id: sessionData.id,
      code: sessionData.code,
      status: sessionData.status,
      hostId: sessionData.host_id,
      participants: participants.map((p) => ({
        id: p.id,
        userId: p.user_id,
        nickname: p.nickname,
        completed: p.completed,
        user: p.user_name ? {
          id: p.user_id,
          name: p.user_name,
          image: p.user_image,
        } : null,
      })),
      movies,
      userSwipes,
      isHost: sessionData.host_id === user.id,
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
