import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await request.json();

  if (!code) {
    return NextResponse.json({ error: "Room code required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Find session by code
  const { data: sessionData, error } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("code", code.toUpperCase())
    .single();

  if (error || !sessionData) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (sessionData.status !== "lobby") {
    return NextResponse.json(
      { error: "Session already started" },
      { status: 400 }
    );
  }

  // Check if already participant
  const { data: existing } = await supabase
    .from("session_participants")
    .select("id")
    .eq("session_id", sessionData.id)
    .eq("user_id", session.user.id)
    .single();

  if (existing) {
    return NextResponse.json({ sessionId: sessionData.id });
  }

  // Add as participant
  const { error: joinError } = await supabase
    .from("session_participants")
    .insert({
      session_id: sessionData.id,
      user_id: session.user.id,
      nickname: session.user.name || "Guest",
    });

  if (joinError) {
    console.error("Error joining session:", joinError);
    return NextResponse.json({ error: "Failed to join" }, { status: 500 });
  }

  return NextResponse.json({ sessionId: sessionData.id });
}
