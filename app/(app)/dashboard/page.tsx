"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Users, Heart, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const handleJoinSession = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);

    try {
      const res = await fetch("/api/sessions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push(`/session/${data.sessionId}`);
      } else {
        alert(data.error || "Failed to join session");
      }
    } catch (error) {
      alert("Failed to join session");
    } finally {
      setJoining(false);
    }
  };

  return (
    <main className="min-h-screen p-5 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Avatar
            src={session?.user?.image}
            alt={session?.user?.name || "User"}
            fallback={session?.user?.name?.charAt(0) || "U"}
            size="lg"
          />
          <div>
            <p className="font-[family-name:var(--font-syne)] font-semibold text-lg">{session?.user?.name}</p>
            <p className="text-sm text-muted-foreground">Welcome back!</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => signOut()}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Hero Card - Create Session */}
        <Card variant="hero" className="col-span-2 p-7">
          {/* Glow effect */}
          <div
            className="absolute -top-1/2 -right-1/4 w-[250px] h-[250px] bg-[radial-gradient(circle,rgba(196,206,228,0.1)_0%,transparent_70%)] pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-[0_4px_16px_rgba(196,206,228,0.2)]">
              <Plus className="h-7 w-7 text-primary-foreground" />
            </div>
            <h2 className="font-[family-name:var(--font-syne)] font-bold text-xl mb-2">New Session</h2>
            <p className="text-text-secondary mb-5">
              Create a movie night and invite friends
            </p>
            <Button
              className="w-full"
              onClick={() => router.push("/session/create")}
            >
              Create Session
            </Button>
          </div>
        </Card>

        {/* Join Session Card */}
        <Card className="col-span-2 p-5">
          <h3 className="font-[family-name:var(--font-syne)] font-semibold mb-1">Join Session</h3>
          <p className="text-sm text-text-secondary mb-4">Enter a room code to join</p>
          <div className="flex gap-3">
            <Input
              placeholder="Code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="font-mono tracking-widest uppercase"
            />
            <Button
              variant="secondary"
              onClick={handleJoinSession}
              disabled={joining || !joinCode.trim()}
              className="px-6"
            >
              {joining ? "..." : "Join"}
            </Button>
          </div>
        </Card>

        {/* Friends Card */}
        <Card
          variant="interactive"
          className="p-6 flex flex-col items-center text-center"
          onClick={() => router.push("/friends")}
        >
          <div className="w-12 h-12 rounded-xl bg-glow flex items-center justify-center mb-3">
            <Users className="h-6 w-6 text-accent" />
          </div>
          <span className="font-[family-name:var(--font-syne)] font-semibold">Friends</span>
          <span className="text-sm text-muted-foreground">View all</span>
        </Card>

        {/* Solo Mode Card */}
        <Card
          variant="interactive"
          className="p-6 flex flex-col items-center text-center"
          onClick={() => router.push("/solo")}
        >
          <div className="w-12 h-12 rounded-xl bg-glow flex items-center justify-center mb-3">
            <Heart className="h-6 w-6 text-accent" />
          </div>
          <span className="font-[family-name:var(--font-syne)] font-semibold">Solo Mode</span>
          <span className="text-sm text-muted-foreground">Your watchlist</span>
        </Card>
      </div>
    </main>
  );
}
