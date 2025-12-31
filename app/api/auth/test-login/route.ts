import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import { queryOne } from "@/lib/db";

/**
 * Test-only authentication bypass endpoint.
 * Allows E2E tests to log in as test users without going through OAuth.
 *
 * SECURITY: This endpoint only works when NODE_ENV is not 'production'.
 */
export async function POST(request: Request) {
  // Block in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Find the test user in the database
    const user = await queryOne<{ id: string; name: string; email: string; image: string | null }>(
      "SELECT id, name, email, image FROM users WHERE email = $1",
      [email]
    );

    if (!user) {
      return NextResponse.json(
        { error: `Test user not found: ${email}. Run the seed script first.` },
        { status: 404 }
      );
    }

    // Create a NextAuth-compatible JWT token
    const token = await encode({
      token: {
        name: user.name,
        email: user.email,
        picture: user.image,
        sub: user.id,
      },
      secret: process.env.NEXTAUTH_SECRET!,
    });

    // Set the session cookie (non-production since we returned early for production)
    const cookieStore = await cookies();
    cookieStore.set("next-auth.session-token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return NextResponse.json({
      success: true,
      token, // Return token for mobile apps
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Test login error:", error);
    return NextResponse.json(
      { error: "Failed to create test session" },
      { status: 500 }
    );
  }
}
