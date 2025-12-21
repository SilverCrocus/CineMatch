import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();

  // Verify session is in swiping state
  const { data: sessionData } = await supabase
    .from("sessions")
    .select("status, deck")
    .eq("id", id)
    .single();

  if (!sessionData || sessionData.status !== "swiping") {
    return NextResponse.json({ error: "Session not in swiping state" }, { status: 400 });
  }

  // Record swipe
  const { error } = await supabase.from("swipes").upsert(
    {
      session_id: id,
      user_id: session.user.id,
      movie_id: movieId,
      liked,
    },
    {
      onConflict: "session_id,user_id,movie_id",
    }
  );

  if (error) {
    console.error("Error recording swipe:", error);
    return NextResponse.json({ error: "Failed to record swipe" }, { status: 500 });
  }

  // Check if user completed all swipes
  const { count: swipeCount } = await supabase
    .from("swipes")
    .select("*", { count: "exact", head: true })
    .eq("session_id", id)
    .eq("user_id", session.user.id);

  if (swipeCount === sessionData.deck.length) {
    // Mark participant as completed
    await supabase
      .from("session_participants")
      .update({ completed: true })
      .eq("session_id", id)
      .eq("user_id", session.user.id);
  }

  return NextResponse.json({ success: true });
}
