import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { queryMany } from "@/lib/db";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
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
      [`%${searchQuery}%`, session.user.id]
    );

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
