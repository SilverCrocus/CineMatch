import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, queryMany } from "@/lib/db";
import { getAuthUser } from "@/lib/mobile-auth";
import { getMoviesByIds } from "@/lib/services/movies";

interface SwipeRow {
  movie_id: number;
  user_id: string;
  liked: boolean;
}

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
    // Update session status
    await query(
      "UPDATE sessions SET status = 'revealed' WHERE id = $1",
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revealing results:", error);
    return NextResponse.json({ error: "Failed to reveal" }, { status: 500 });
  }
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
    // Get session deck
    const sessionData = await queryOne<{ deck: number[] }>(
      "SELECT deck FROM sessions WHERE id = $1",
      [id]
    );

    if (!sessionData) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get participants
    const participants = await queryMany<{ user_id: string }>(
      "SELECT user_id FROM session_participants WHERE session_id = $1",
      [id]
    );

    const participantIds = participants.map((p) => p.user_id);

    // Get all swipes for this session
    const allSwipes = await queryMany<SwipeRow>(
      "SELECT movie_id, user_id, liked FROM swipes WHERE session_id = $1",
      [id]
    );

    if (allSwipes.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // Find movies everyone liked
    const movieLikes = new Map<number, Set<string>>();
    for (const swipe of allSwipes) {
      if (swipe.liked) {
        if (!movieLikes.has(swipe.movie_id)) {
          movieLikes.set(swipe.movie_id, new Set());
        }
        movieLikes.get(swipe.movie_id)!.add(swipe.user_id);
      }
    }

    const matchedIds: number[] = [];
    for (const [movieId, likers] of movieLikes) {
      if (participantIds.every((pid) => likers.has(pid))) {
        matchedIds.push(movieId);
      }
    }

    // Get movie details for matches
    const matches = await getMoviesByIds(matchedIds);

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("Error getting matches:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
