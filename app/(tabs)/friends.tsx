import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { User } from '../../types';

interface FriendRequest {
  id: string;
  createdAt: string;
  user: User;
}

export default function FriendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  // Fetch friends and pending requests
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['friends'],
    queryFn: api.getFriends,
  });

  const friends = data?.friends || [];
  const pendingRequests = data?.pendingRequests || [];

  // Search users with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const result = await api.searchUsers(searchQuery);
        // Filter out users who are already friends or have pending requests
        const friendIds = new Set(friends.map((f) => f.id));
        const pendingIds = new Set(pendingRequests.map((r) => r.user?.id));
        const filtered = result.users.filter(
          (u) => !friendIds.has(u.id) && !pendingIds.has(u.id)
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, friends, pendingRequests]);

  // Send friend request mutation
  const sendRequestMutation = useMutation({
    mutationFn: (userId: string) => api.sendFriendRequest(userId),
    onSuccess: () => {
      // Remove user from search results
      setSearchResults((prev) =>
        prev.filter((u) => u.id !== sendRequestMutation.variables)
      );
      Alert.alert('Success', 'Friend request sent!');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to send friend request');
    },
  });

  // Accept friend request mutation
  const acceptMutation = useMutation({
    mutationFn: (requestId: string) => api.acceptFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to accept request');
    },
  });

  // Reject friend request mutation
  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => api.rejectFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to reject request');
    },
  });

  const handleSendRequest = useCallback((userId: string) => {
    sendRequestMutation.mutate(userId);
  }, []);

  const handleAccept = useCallback((requestId: string) => {
    acceptMutation.mutate(requestId);
  }, []);

  const handleReject = useCallback((requestId: string) => {
    rejectMutation.mutate(requestId);
  }, []);

  const renderSearchResult = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userAvatar}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>
            {item.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => handleSendRequest(item.id)}
        disabled={sendRequestMutation.isPending}
      >
        <Ionicons name="person-add" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderPendingRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.userCard}>
      <View style={styles.userAvatar}>
        {item.user?.image ? (
          <Image source={{ uri: item.user.image }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>
            {item.user?.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.user?.name || 'Unknown'}</Text>
        <Text style={styles.userEmail}>{item.user?.email || ''}</Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAccept(item.id)}
          disabled={acceptMutation.isPending}
        >
          <Ionicons name="checkmark" size={18} color="#4ade80" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleReject(item.id)}
          disabled={rejectMutation.isPending}
        >
          <Ionicons name="close" size={18} color="#f87171" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFriend = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userAvatar}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>
            {item.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={18}
          color="#666"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email"
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && (
          <ActivityIndicator size="small" color="#00b894" style={styles.searchSpinner} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00b894" />
        </View>
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={
            <>
              {/* Search Results */}
              {searchResults.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Search Results</Text>
                  {searchResults.map((user) => (
                    <View key={user.id}>{renderSearchResult({ item: user })}</View>
                  ))}
                </View>
              )}

              {/* Pending Requests */}
              {pendingRequests.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Friend Requests ({pendingRequests.length})
                  </Text>
                  {pendingRequests.map((request) => (
                    <View key={request.id}>
                      {renderPendingRequest({ item: request })}
                    </View>
                  ))}
                </View>
              )}

              {/* Friends List */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Your Friends ({friends.length})
                </Text>
                {friends.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No friends yet</Text>
                    <Text style={styles.emptySubtext}>
                      Search to add friends!
                    </Text>
                  </View>
                ) : (
                  friends.map((friend) => (
                    <View key={friend.id}>{renderFriend({ item: friend })}</View>
                  ))
                )}
              </View>
            </>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  searchSpinner: {
    marginLeft: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
    marginBottom: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00b894',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#00b894',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
  },
});
