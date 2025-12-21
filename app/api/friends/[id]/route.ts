import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// PATCH - Accept friend request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  // Verify this request is for the current user
  const { data: friendship } = await supabase
    .from("friendships")
    .select("*")
    .eq("id", id)
    .eq("friend_id", session.user.id)
    .eq("status", "pending")
    .single();

  if (!friendship) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // Accept the request
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to accept" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE - Reject request or remove friend
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  // Delete the friendship (works for both pending and accepted)
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", id)
    .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`);

  if (error) {
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
