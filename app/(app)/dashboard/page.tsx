"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Users, History, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <main className="min-h-screen p-4 max-w-lg mx-auto">
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
            <p className="font-medium">{session?.user?.name}</p>
            <p className="text-sm text-muted-foreground">Welcome back!</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => signOut()}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        {/* Create Session */}
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              New Session
            </CardTitle>
            <CardDescription>
              Create a movie night session and invite friends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => router.push("/session/create")}
            >
              Create Session
            </Button>
          </CardContent>
        </Card>

        {/* Join Session */}
        <Card>
          <CardHeader>
            <CardTitle>Join Session</CardTitle>
            <CardDescription>Enter a room code to join</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Enter code (e.g., X7K2)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleJoinSession}
              disabled={joining || !joinCode.trim()}
            >
              {joining ? "Joining..." : "Join"}
            </Button>
          </CardContent>
        </Card>

        {/* Navigation Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:bg-secondary/50 transition-colors"
            onClick={() => router.push("/friends")}
          >
            <CardContent className="flex flex-col items-center justify-center py-6">
              <Users className="h-8 w-8 text-primary mb-2" />
              <span className="font-medium">Friends</span>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-secondary/50 transition-colors"
            onClick={() => router.push("/history")}
          >
            <CardContent className="flex flex-col items-center justify-center py-6">
              <History className="h-8 w-8 text-primary mb-2" />
              <span className="font-medium">History</span>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
