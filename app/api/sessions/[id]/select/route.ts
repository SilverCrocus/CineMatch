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
  const { movieId } = await request.json();

  if (typeof movieId !== "number") {
    return NextResponse.json({ error: "Invalid movie ID" }, { status: 400 });
  }

  const supabase = await createClient();

  // Get participants
  const { data: participants } = await supabase
    .from("session_participants")
    .select("user_id")
    .eq("session_id", id);

  if (!participants) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const watchedBy = participants.map((p) => p.user_id);

  // Record watched movie
  const { error } = await supabase.from("watched_movies").insert({
    session_id: id,
    movie_id: movieId,
    watched_by: watchedBy,
  });

  if (error) {
    console.error("Error recording watched movie:", error);
    return NextResponse.json({ error: "Failed to record" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
