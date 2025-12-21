import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMoviesByIds } from "@/lib/services/movies";

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

  // Get session with participants
  const { data: sessionData, error } = await supabase
    .from("sessions")
    .select(`
      *,
      session_participants (
        id,
        user_id,
        nickname,
        completed,
        users (
          id,
          name,
          image
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error || !sessionData) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Check if user is participant
  const isParticipant = sessionData.session_participants.some(
    (p: { user_id: string }) => p.user_id === session.user.id
  );

  if (!isParticipant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Get movies for the deck
  const movies = await getMoviesByIds(sessionData.deck);

  // Get user's swipes if swiping
  let userSwipes: Record<number, boolean> = {};
  if (sessionData.status !== "lobby") {
    const { data: swipes } = await supabase
      .from("swipes")
      .select("movie_id, liked")
      .eq("session_id", id)
      .eq("user_id", session.user.id);

    if (swipes) {
      userSwipes = Object.fromEntries(
        swipes.map((s) => [s.movie_id, s.liked])
      );
    }
  }

  return NextResponse.json({
    id: sessionData.id,
    code: sessionData.code,
    status: sessionData.status,
    hostId: sessionData.host_id,
    participants: sessionData.session_participants.map((p: any) => ({
      id: p.id,
      userId: p.user_id,
      nickname: p.nickname,
      completed: p.completed,
      user: p.users,
    })),
    movies,
    userSwipes,
    isHost: sessionData.host_id === session.user.id,
  });
}
