import { NextRequest, NextResponse } from "next/server";
import { queryMany } from "@/lib/db";
import { getAuthUser } from "@/lib/mobile-auth";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const searchQuery = searchParams.get("q");

  if (!searchQuery || searchQuery.length < 2) {
    return NextResponse.json({ users: [] });
  }

  try {
    // Search by email or name (case insensitive)
    const users = await queryMany<UserRow>(
      `SELECT id, name, email, image FROM users
       WHERE (email ILIKE $1 OR name ILIKE $1) AND id != $2
       LIMIT 10`,
      [`%${searchQuery}%`, user.id]
    );

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
