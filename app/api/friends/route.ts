import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, queryOne, queryMany } from "@/lib/db";

interface FriendshipRow {
  id: string;
  status: string;
  user_id: string;
  friend_id: string;
  created_at: string;
}

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

// GET - List friends and pending requests
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get accepted friends (both directions)
    const friendships = await queryMany<FriendshipRow>(
      `SELECT id, status, user_id, friend_id, created_at
       FROM friendships
       WHERE (user_id = $1 OR friend_id = $1) AND status = 'accepted'`,
      [session.user.id]
    );

    // Get friend user details
    const friendIds = new Set<string>();
    friendships.forEach((f) => {
      if (f.user_id === session.user.id) {
        friendIds.add(f.friend_id);
      } else {
        friendIds.add(f.user_id);
      }
    });

    let friendUsers: UserRow[] = [];
    if (friendIds.size > 0) {
      friendUsers = await queryMany<UserRow>(
        `SELECT id, name, email, image FROM users WHERE id = ANY($1)`,
        [Array.from(friendIds)]
      );
    }

    // Get pending requests sent TO this user
    const pendingRequests = await queryMany<{ id: string; user_id: string; created_at: string }>(
      `SELECT id, user_id, created_at
       FROM friendships
       WHERE friend_id = $1 AND status = 'pending'`,
      [session.user.id]
    );

    // Get requester details
    const requesterIds = pendingRequests.map((r) => r.user_id);
    let requesters: UserRow[] = [];
    if (requesterIds.length > 0) {
      requesters = await queryMany<UserRow>(
        `SELECT id, name, email, image FROM users WHERE id = ANY($1)`,
        [requesterIds]
      );
    }

    const requestsWithUsers = pendingRequests.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      user: requesters.find((u) => u.id === r.user_id),
    }));

    return NextResponse.json({
      friends: friendUsers,
      pendingRequests: requestsWithUsers,
    });
  } catch (error) {
    console.error("Error fetching friends:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
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

  try {
    // Check if friendship already exists
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM friendships
       WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [session.user.id, friendId]
    );

    if (existing) {
      return NextResponse.json(
        { error: "Friendship already exists" },
        { status: 400 }
      );
    }

    // Create friend request
    await query(
      `INSERT INTO friendships (user_id, friend_id, status)
       VALUES ($1, $2, 'pending')`,
      [session.user.id, friendId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating friend request:", error);
    return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
  }
}
