"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, UserPlus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";

interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface FriendRequest {
  id: string;
  user: User;
  createdAt: string;
}

export default function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<User[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchFriends = async () => {
    const res = await fetch("/api/friends");
    if (res.ok) {
      const data = await res.json();
      setFriends(data.friends);
      setRequests(data.pendingRequests);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  const searchUsers = async () => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const res = await fetch(`/api/friends/search?q=${encodeURIComponent(searchQuery)}`);
    if (res.ok) {
      const data = await res.json();
      setSearchResults(data.users);
    }
    setSearching(false);
  };

  useEffect(() => {
    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const sendRequest = async (friendId: string) => {
    await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendId }),
    });
    setSearchResults((prev) => prev.filter((u) => u.id !== friendId));
  };

  const acceptRequest = async (requestId: string) => {
    await fetch(`/api/friends/${requestId}`, { method: "PATCH" });
    fetchFriends();
  };

  const rejectRequest = async (requestId: string) => {
    await fetch(`/api/friends/${requestId}`, { method: "DELETE" });
    fetchFriends();
  };

  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Friends</h1>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Search Results
          </h2>
          <div className="space-y-2">
            {searchResults.map((user) => (
              <Card key={user.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={user.image}
                      alt={user.name}
                      fallback={user.name.charAt(0)}
                    />
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => sendRequest(user.id)}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pending Requests */}
      {requests.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Friend Requests ({requests.length})
          </h2>
          <div className="space-y-2">
            {requests.map((request) => (
              <Card key={request.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={request.user?.image}
                      alt={request.user?.name || "User"}
                      fallback={request.user?.name?.charAt(0) || "?"}
                    />
                    <div>
                      <p className="font-medium">{request.user?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => acceptRequest(request.id)}
                    >
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => rejectRequest(request.id)}
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Your Friends ({friends.length})
        </h2>
        {friends.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No friends yet. Search to add some!
          </p>
        ) : (
          <div className="space-y-2">
            {friends.map((friend) => (
              <Card key={friend.id}>
                <CardContent className="flex items-center gap-3 py-3">
                  <Avatar
                    src={friend.image}
                    alt={friend.name}
                    fallback={friend.name.charAt(0)}
                  />
                  <div>
                    <p className="font-medium">{friend.name}</p>
                    <p className="text-sm text-muted-foreground">{friend.email}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
