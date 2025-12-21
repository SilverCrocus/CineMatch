import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { generateRoomCode } from "@/lib/utils";
import { buildDeckFromFilters, buildDeckFromTitles } from "@/lib/services/movies";
import { parseMovieListUrl, parseTextList } from "@/lib/parsers";
import type { DeckSource } from "@/types";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: { source: DeckSource; deckSize?: number } = await request.json();
  const deckSize = body.deckSize || 25;

  let movies: { tmdbId: number }[] = [];

  try {
    switch (body.source.type) {
      case "filters":
        const filterMovies = await buildDeckFromFilters({
          ...body.source.filters,
          limit: deckSize,
        });
        movies = filterMovies.map((m) => ({ tmdbId: m.tmdbId }));
        break;

      case "url":
        if (!body.source.url) {
          return NextResponse.json({ error: "URL required" }, { status: 400 });
        }
        const parsed = await parseMovieListUrl(body.source.url);
        if (parsed.error || parsed.titles.length === 0) {
          return NextResponse.json(
            { error: parsed.error || "No movies found at URL" },
            { status: 400 }
          );
        }
        const urlMovies = await buildDeckFromTitles(
          parsed.titles.slice(0, deckSize).map((t) => ({ title: t }))
        );
        movies = urlMovies.map((m) => ({ tmdbId: m.tmdbId }));
        break;

      case "text":
        if (!body.source.textList) {
          return NextResponse.json({ error: "Text list required" }, { status: 400 });
        }
        const titles = parseTextList(body.source.textList);
        if (titles.length === 0) {
          return NextResponse.json({ error: "No movies in list" }, { status: 400 });
        }
        const textMovies = await buildDeckFromTitles(
          titles.slice(0, deckSize).map((t) => ({ title: t }))
        );
        movies = textMovies.map((m) => ({ tmdbId: m.tmdbId }));
        break;

      default:
        return NextResponse.json({ error: "Invalid source type" }, { status: 400 });
    }

    if (movies.length === 0) {
      return NextResponse.json({ error: "Could not build movie deck" }, { status: 400 });
    }

    const deck = movies.map((m) => m.tmdbId);
    const supabase = await createClient();

    // Generate unique room code
    let code: string = "";
    let codeExists = true;
    while (codeExists) {
      code = generateRoomCode();
      const { data } = await supabase
        .from("sessions")
        .select("id")
        .eq("code", code)
        .single();
      codeExists = !!data;
    }

    // Create session
    const { data: newSession, error } = await supabase
      .from("sessions")
      .insert({
        code,
        host_id: session.user.id,
        deck,
        status: "lobby",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating session:", error);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    // Add host as participant
    await supabase.from("session_participants").insert({
      session_id: newSession.id,
      user_id: session.user.id,
      nickname: session.user.name || "Host",
    });

    return NextResponse.json({
      id: newSession.id,
      code: newSession.code,
      deckSize: deck.length,
    });
  } catch (error) {
    console.error("Error in session creation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
