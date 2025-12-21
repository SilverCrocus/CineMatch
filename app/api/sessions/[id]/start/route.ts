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
  const supabase = await createClient();

  // Verify user is host
  const { data: sessionData } = await supabase
    .from("sessions")
    .select("host_id, status")
    .eq("id", id)
    .single();

  if (!sessionData) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (sessionData.host_id !== session.user.id) {
    return NextResponse.json({ error: "Only host can start" }, { status: 403 });
  }

  if (sessionData.status !== "lobby") {
    return NextResponse.json({ error: "Session already started" }, { status: 400 });
  }

  // Update status to swiping
  const { error } = await supabase
    .from("sessions")
    .update({ status: "swiping" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to start" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
