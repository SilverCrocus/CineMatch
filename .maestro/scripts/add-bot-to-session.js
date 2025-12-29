// Helper script to add a bot to a session via API
// Called from Maestro tests using runScript
//
// Environment variables:
// - ROOM_CODE: The 4-6 character room code from the lobby screen
// - API_BASE: The API base URL (defaults to localhost:3000)

const roomCode = process.env.ROOM_CODE;
const apiBase = process.env.API_BASE || 'http://localhost:3000';

if (!roomCode) {
  console.error('ERROR: ROOM_CODE environment variable is required');
  process.exit(1);
}

async function addBotToSession() {
  try {
    // Step 1: Look up session ID from room code
    console.log(`Looking up session with code: ${roomCode}`);
    const lookupResponse = await fetch(
      `${apiBase}/api/sessions/lookup?code=${roomCode}`
    );

    if (!lookupResponse.ok) {
      const error = await lookupResponse.text();
      throw new Error(`Lookup failed: ${error}`);
    }

    const { sessionId } = await lookupResponse.json();
    console.log(`Found session: ${sessionId}`);

    // Step 2: Add bot to session
    console.log('Adding bot to session...');
    const joinResponse = await fetch(
      `${apiBase}/api/sessions/${sessionId}/test-join`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoSwipe: false }),
      }
    );

    if (!joinResponse.ok) {
      const error = await joinResponse.text();
      throw new Error(`Bot join failed: ${error}`);
    }

    const result = await joinResponse.json();
    console.log(`Bot added successfully: ${result.botName}`);

    // Output for Maestro
    output.sessionId = sessionId;
    output.botName = result.botName;

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

addBotToSession();
