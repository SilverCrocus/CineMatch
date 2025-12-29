import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../contexts/AuthContext';
import { api } from '../../lib/api';

export default function HomeScreen() {
  const { user, signOut } = useAuthContext();
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoinSession = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);

    try {
      const data = await api.joinSession(joinCode.trim().toUpperCase());
      router.push(`/session/${data.sessionId}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to join session. Check the code and try again.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            {user?.image ? (
              <Image source={{ uri: user.image }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            )}
          </View>
          <View>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={24} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Hero Card - Create Session */}
      <TouchableOpacity
        style={styles.heroCard}
        onPress={() => router.push('/session/create')}
      >
        <View style={styles.heroIconContainer}>
          <Ionicons name="add" size={32} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>New Session</Text>
        <Text style={styles.heroSubtitle}>
          Start a movie night with friends
        </Text>
        <View style={styles.heroButton}>
          <Text style={styles.heroButtonText}>Create Session</Text>
        </View>
      </TouchableOpacity>

      {/* Join Session Card */}
      <View style={styles.joinCard}>
        <Text style={styles.joinTitle}>Join Session</Text>
        <Text style={styles.joinSubtitle}>Enter a room code to join</Text>
        <View style={styles.joinInputRow}>
          <TextInput
            style={styles.codeInput}
            placeholder="CODE"
            placeholderTextColor="#666"
            value={joinCode}
            onChangeText={(text) => setJoinCode(text.toUpperCase())}
            maxLength={6}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={[
              styles.joinButton,
              (!joinCode.trim() || joining) && styles.joinButtonDisabled,
            ]}
            onPress={handleJoinSession}
            disabled={!joinCode.trim() || joining}
          >
            {joining ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.joinButtonText}>Join</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
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
  welcomeText: {
    color: '#888',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  signOutButton: {
    padding: 8,
  },
  heroCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  heroIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#e50914',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#888',
    fontSize: 16,
    marginBottom: 20,
  },
  heroButton: {
    backgroundColor: '#e50914',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  heroButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  joinCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  joinTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  joinSubtitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  joinInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  codeInput: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 18,
    fontFamily: 'monospace',
    letterSpacing: 4,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  joinButton: {
    backgroundColor: '#333',
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
