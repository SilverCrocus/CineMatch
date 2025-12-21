import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const supabase = await createClient();

  // Search by email or name
  const { data: users } = await supabase
    .from("users")
    .select("id, name, email, image")
    .or(`email.ilike.%${query}%,name.ilike.%${query}%`)
    .neq("id", session.user.id)
    .limit(10);

  return NextResponse.json({ users: users || [] });
}
