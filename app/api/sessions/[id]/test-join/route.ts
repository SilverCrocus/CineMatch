import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

const TEST_BOT_EMAIL = "testbot@cinematch.test";
const TEST_BOT_NAME = "Test Bot";

/**
 * Test endpoint for E2E testing - adds a bot participant to a session.
 *
 * This endpoint:
 * 1. Creates/gets a test bot user
 * 2. Joins the bot to the specified session
 * 3. Optionally auto-swipes all movies (default: likes all)
 *
 * IMPORTANT: Only available in development/test environments.
 *
 * POST /api/sessions/[id]/test-join
 * Body: { autoSwipe?: boolean, likeAll?: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Only allow in development/test
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_TEST_ENDPOINTS) {
    return NextResponse.json(
      { error: "Test endpoints not available in production" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const autoSwipe = body.autoSwipe !== false; // Default true
  const likeAll = body.likeAll !== false; // Default true (bot likes all movies for matches)

  try {
    // 1. Get or create test bot user
    let botUser = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE email = $1",
      [TEST_BOT_EMAIL]
    );

    if (!botUser) {
      botUser = await queryOne<{ id: string }>(
        `INSERT INTO users (email, name, image)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [TEST_BOT_EMAIL, TEST_BOT_NAME, null]
      );
    }

    if (!botUser) {
      return NextResponse.json(
        { error: "Failed to create test bot" },
        { status: 500 }
      );
    }

    // 2. Verify session exists and is in lobby state
    const sessionData = await queryOne<{ id: string; status: string; deck: number[] }>(
      "SELECT id, status, deck FROM sessions WHERE id = $1",
      [id]
    );

    if (!sessionData) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Allow joining in lobby or swiping state for flexibility
    if (sessionData.status === "revealed") {
      return NextResponse.json(
        { error: "Session already completed" },
        { status: 400 }
      );
    }

    // 3. Check if bot is already in session
    const existingParticipant = await queryOne<{ id: string }>(
      "SELECT id FROM session_participants WHERE session_id = $1 AND user_id = $2",
      [id, botUser.id]
    );

    if (!existingParticipant) {
      // Add bot as participant
      await query(
        `INSERT INTO session_participants (session_id, user_id, nickname)
         VALUES ($1, $2, $3)`,
        [id, botUser.id, TEST_BOT_NAME]
      );
    }

    // 4. Auto-swipe if requested and session is in swiping state
    let swipesCreated = 0;
    if (autoSwipe && sessionData.status === "swiping" && sessionData.deck.length > 0) {
      // Create swipes for all movies in deck
      for (const movieId of sessionData.deck) {
        await query(
          `INSERT INTO swipes (session_id, user_id, movie_id, liked)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (session_id, user_id, movie_id) DO NOTHING`,
          [id, botUser.id, movieId, likeAll]
        );
        swipesCreated++;
      }

      // Mark bot as completed
      await query(
        "UPDATE session_participants SET completed = true WHERE session_id = $1 AND user_id = $2",
        [id, botUser.id]
      );
    }

    return NextResponse.json({
      success: true,
      botUserId: botUser.id,
      botName: TEST_BOT_NAME,
      sessionId: id,
      sessionStatus: sessionData.status,
      swipesCreated: autoSwipe && sessionData.status === "swiping" ? swipesCreated : 0,
      message: autoSwipe && sessionData.status === "swiping"
        ? `Bot joined and auto-swiped ${swipesCreated} movies`
        : sessionData.status === "lobby"
          ? "Bot joined session lobby. Call again after session starts to auto-swipe."
          : "Bot joined session",
    });
  } catch (error) {
    console.error("Error in test-join:", error);
    return NextResponse.json(
      { error: "Failed to add test bot" },
      { status: 500 }
    );
  }
}
