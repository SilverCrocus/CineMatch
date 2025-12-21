import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// GET - List friends and pending requests
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // Get accepted friends (both directions)
  const { data: friendships } = await supabase
    .from("friendships")
    .select(`
      id,
      status,
      user_id,
      friend_id,
      created_at
    `)
    .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`)
    .eq("status", "accepted");

  // Get friend user details
  const friendIds = new Set<string>();
  friendships?.forEach((f) => {
    if (f.user_id === session.user.id) {
      friendIds.add(f.friend_id);
    } else {
      friendIds.add(f.user_id);
    }
  });

  const { data: friendUsers } = await supabase
    .from("users")
    .select("id, name, email, image")
    .in("id", Array.from(friendIds));

  // Get pending requests sent TO this user
  const { data: pendingRequests } = await supabase
    .from("friendships")
    .select(`
      id,
      user_id,
      created_at
    `)
    .eq("friend_id", session.user.id)
    .eq("status", "pending");

  // Get requester details
  const requesterIds = pendingRequests?.map((r) => r.user_id) || [];
  const { data: requesters } = await supabase
    .from("users")
    .select("id, name, email, image")
    .in("id", requesterIds);

  const requestsWithUsers = pendingRequests?.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    user: requesters?.find((u) => u.id === r.user_id),
  }));

  return NextResponse.json({
    friends: friendUsers || [],
    pendingRequests: requestsWithUsers || [],
  });
}

// POST - Send friend request
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { friendId } = await request.json();

  if (!friendId || friendId === session.user.id) {
    return NextResponse.json({ error: "Invalid friend ID" }, { status: 400 });
  }

  const supabase = await createClient();

  // Check if friendship already exists
  const { data: existing } = await supabase
    .from("friendships")
    .select("id")
    .or(
      `and(user_id.eq.${session.user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${session.user.id})`
    )
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Friendship already exists" },
      { status: 400 }
    );
  }

  // Create friend request
  const { error } = await supabase.from("friendships").insert({
    user_id: session.user.id,
    friend_id: friendId,
    status: "pending",
  });

  if (error) {
    console.error("Error creating friend request:", error);
    return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
