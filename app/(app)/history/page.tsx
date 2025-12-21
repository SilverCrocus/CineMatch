"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Movie } from "@/types";

interface HistoryItem {
  id: string;
  movie: Movie;
  watchedAt: string;
  watchedWith: number;
}

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => {
        setHistory(data.history || []);
        setLoading(false);
      });
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Watch History</h1>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : history.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">No watch history yet</p>
          <Button onClick={() => router.push("/session/create")}>
            Start a Session
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex gap-4 py-4">
                {item.movie?.posterUrl && (
                  <img
                    src={item.movie.posterUrl}
                    alt={item.movie.title}
                    className="h-28 w-20 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold">{item.movie?.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {item.movie?.year} • {item.movie?.genres?.slice(0, 2).join(", ")}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(item.watchedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {item.watchedWith}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
