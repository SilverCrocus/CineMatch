import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

/**
 * Test endpoint for E2E testing - looks up session ID by room code.
 *
 * GET /api/sessions/lookup?code=ABCD
 *
 * IMPORTANT: Only available in development/test environments.
 */
export async function GET(request: NextRequest) {
  // Only allow in development/test
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_TEST_ENDPOINTS) {
    return NextResponse.json(
      { error: "Test endpoints not available in production" },
      { status: 403 }
    );
  }

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Room code required. Use ?code=ABCD" },
      { status: 400 }
    );
  }

  try {
    const session = await queryOne<{ id: string; status: string }>(
      "SELECT id, status FROM sessions WHERE code = $1",
      [code.toUpperCase()]
    );

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sessionId: session.id,
      code: code.toUpperCase(),
      status: session.status,
    });
  } catch (error) {
    console.error("Error looking up session:", error);
    return NextResponse.json(
      { error: "Failed to lookup session" },
      { status: 500 }
    );
  }
}
