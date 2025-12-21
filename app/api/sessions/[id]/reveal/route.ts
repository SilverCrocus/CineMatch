import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMoviesByIds } from "@/lib/services/movies";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  // Update session status
  await supabase
    .from("sessions")
    .update({ status: "revealed" })
    .eq("id", id);

  return NextResponse.json({ success: true });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  // Get session and participants
  const { data: sessionData } = await supabase
    .from("sessions")
    .select(`
      deck,
      session_participants (user_id)
    `)
    .eq("id", id)
    .single();

  if (!sessionData) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const participantIds = sessionData.session_participants.map(
    (p: { user_id: string }) => p.user_id
  );

  // Get all swipes for this session
  const { data: allSwipes } = await supabase
    .from("swipes")
    .select("movie_id, user_id, liked")
    .eq("session_id", id);

  if (!allSwipes) {
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
    if (participantIds.every((pid: string) => likers.has(pid))) {
      matchedIds.push(movieId);
    }
  }

  // Get movie details for matches
  const matches = await getMoviesByIds(matchedIds);

  return NextResponse.json({ matches });
}
