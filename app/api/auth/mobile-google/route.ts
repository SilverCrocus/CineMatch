import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email, name, image, googleId } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Upsert user in database
    await query(
      `INSERT INTO users (email, name, image)
       VALUES ($1, $2, $3)
       ON CONFLICT (email)
       DO UPDATE SET name = $2, image = $3`,
      [email, name, image]
    );

    // Get user from database
    const user = await queryOne<{ id: string; email: string; name: string; image: string }>(
      "SELECT id, email, name, image FROM users WHERE email = $1",
      [email]
    );

    if (!user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    // Generate a session token
    const token = randomBytes(32).toString("hex");

    // Store token in database (you might want a sessions table)
    // For now, we'll just return the user ID as the token
    // In production, you'd want proper session management

    return NextResponse.json({
      token: user.id, // Using user ID as token for simplicity
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
    });
  } catch (error) {
    console.error("Mobile Google auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
