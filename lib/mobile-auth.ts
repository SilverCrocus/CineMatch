import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { queryOne } from "@/lib/db";

interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  image?: string;
}

/**
 * Get the authenticated user from either:
 * 1. NextAuth session (web - uses cookies)
 * 2. Bearer token (mobile - user ID in Authorization header)
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  // First, try NextAuth session (for web)
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return {
      id: session.user.id,
      email: session.user.email || undefined,
      name: session.user.name || undefined,
      image: session.user.image || undefined,
    };
  }

  // If no session, check for Bearer token (for mobile)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7); // Remove "Bearer " prefix

    // Token is the user ID - look up the user
    const user = await queryOne<{ id: string; email: string; name: string; image: string }>(
      "SELECT id, email, name, image FROM users WHERE id = $1",
      [token]
    );

    if (user) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    }
  }

  return null;
}
