import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getAuthUser } from "@/lib/mobile-auth";

// PATCH - Accept friend request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Verify this request is for the current user
    const friendship = await queryOne<{ id: string }>(
      `SELECT id FROM friendships
       WHERE id = $1 AND friend_id = $2 AND status = 'pending'`,
      [id, user.id]
    );

    if (!friendship) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Accept the request
    await query(
      "UPDATE friendships SET status = 'accepted' WHERE id = $1",
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return NextResponse.json({ error: "Failed to accept" }, { status: 500 });
  }
}

// DELETE - Reject request or remove friend
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Delete the friendship (works for both pending and accepted)
    await query(
      `DELETE FROM friendships
       WHERE id = $1 AND (user_id = $2 OR friend_id = $2)`,
      [id, user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing friend:", error);
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 });
  }
}
