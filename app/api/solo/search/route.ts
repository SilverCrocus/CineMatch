import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchMoviesByTitle } from "@/lib/services/movies";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  try {
    const movies = await searchMoviesByTitle(query);
    return NextResponse.json({ movies });
  } catch (error) {
    console.error("Error searching movies:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
