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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthContext } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import BottomSheet, { BottomSheetRef } from '../../components/BottomSheet';

export default function HomeScreen() {
  const { user, signOut } = useAuthContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const handleJoinSession = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);

    try {
      const data = await api.joinSession(joinCode.trim().toUpperCase());
      setShowJoinInput(false);
      setJoinCode('');
      router.push(`/session/${data.sessionId}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to join session. Check the code and try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleSignOut = () => {
    bottomSheetRef.current?.close();
    setTimeout(() => signOut(), 300);
  };

  const handleOpenFriends = () => {
    bottomSheetRef.current?.close();
    setTimeout(() => router.push('/(tabs)/friends'), 300);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Cinematch</Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => bottomSheetRef.current?.open()}
        >
          {user?.image ? (
            <Image source={{ uri: user.image }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Solo Mode Card */}
        <TouchableOpacity
          style={styles.cardContainer}
          onPress={() => router.push('/(tabs)/solo')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.cardIconContainer}>
              <Ionicons name="film" size={32} color="#00b894" />
            </View>
            <Text style={styles.cardTitle}>Solo Mode</Text>
            <Text style={styles.cardSubtitle}>
              Discover movies tailored just for you
            </Text>
            <View style={styles.cardArrow}>
              <Ionicons name="arrow-forward" size={20} color="#00b894" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Session Mode Card */}
        <TouchableOpacity
          style={styles.cardContainer}
          onPress={() => router.push('/session/create')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#1a1a2e', '#1e3a5f', '#005c5c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.cardIconContainer}>
              <Ionicons name="people" size={32} color="#00b894" />
            </View>
            <Text style={styles.cardTitle}>Session</Text>
            <Text style={styles.cardSubtitle}>
              Find movies everyone will love
            </Text>
            <View style={styles.cardArrow}>
              <Ionicons name="arrow-forward" size={20} color="#00b894" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Join Session Section */}
        {!showJoinInput ? (
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => setShowJoinInput(true)}
          >
            <Ionicons name="enter-outline" size={20} color="#00b894" />
            <Text style={styles.joinButtonText}>Join a Session</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.joinInputContainer}>
            <TextInput
              style={styles.codeInput}
              placeholder="Enter code"
              placeholderTextColor="#666"
              value={joinCode}
              onChangeText={(text) => setJoinCode(text.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoFocus
            />
            <TouchableOpacity
              style={[
                styles.joinSubmitButton,
                (!joinCode.trim() || joining) && styles.joinSubmitButtonDisabled,
              ]}
              onPress={handleJoinSession}
              disabled={!joinCode.trim() || joining}
            >
              {joining ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.joinCancelButton}
              onPress={() => {
                setShowJoinInput(false);
                setJoinCode('');
              }}
            >
              <Ionicons name="close" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Profile Bottom Sheet */}
      <BottomSheet ref={bottomSheetRef} snapPoint={320}>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetAvatar}>
            {user?.image ? (
              <Image source={{ uri: user.image }} style={styles.sheetAvatarImage} />
            ) : (
              <Text style={styles.sheetAvatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            )}
          </View>
          <View style={styles.sheetUserInfo}>
            <Text style={styles.sheetUserName}>{user?.name || 'Guest'}</Text>
            <Text style={styles.sheetUserEmail}>{user?.email || ''}</Text>
          </View>
        </View>

        <View style={styles.sheetDivider} />

        <TouchableOpacity style={styles.sheetOption} onPress={handleOpenFriends}>
          <View style={styles.sheetOptionIcon}>
            <Ionicons name="people" size={22} color="#00b894" />
          </View>
          <Text style={styles.sheetOptionText}>Friends</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.sheetOption} onPress={() => {}}>
          <View style={styles.sheetOptionIcon}>
            <Ionicons name="settings-outline" size={22} color="#888" />
          </View>
          <Text style={styles.sheetOptionText}>Settings</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <View style={styles.sheetDivider} />

        <TouchableOpacity style={styles.sheetOption} onPress={handleSignOut}>
          <View style={styles.sheetOptionIcon}>
            <Ionicons name="log-out-outline" size={22} color="#f87171" />
          </View>
          <Text style={[styles.sheetOptionText, styles.sheetOptionDanger]}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </BottomSheet>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileAvatar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#00b894',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    color: '#0a0a0a',
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  cardContainer: {
    flex: 1,
    maxHeight: 200,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    padding: 24,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 184, 148, 0.2)',
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 184, 148, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#888',
    lineHeight: 22,
  },
  cardArrow: {
    position: 'absolute',
    right: 24,
    top: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 184, 148, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222',
    borderStyle: 'dashed',
  },
  joinButtonText: {
    color: '#00b894',
    fontSize: 16,
    fontWeight: '500',
  },
  joinInputContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  codeInput: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 18,
    fontFamily: 'monospace',
    letterSpacing: 4,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  joinSubmitButton: {
    backgroundColor: '#00b894',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinSubmitButtonDisabled: {
    opacity: 0.5,
  },
  joinCancelButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Bottom Sheet Styles
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  sheetAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00b894',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  sheetAvatarImage: {
    width: '100%',
    height: '100%',
  },
  sheetAvatarText: {
    color: '#0a0a0a',
    fontSize: 22,
    fontWeight: '600',
  },
  sheetUserInfo: {
    flex: 1,
  },
  sheetUserName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sheetUserEmail: {
    color: '#888',
    fontSize: 14,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#222',
    marginVertical: 12,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  sheetOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetOptionText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  sheetOptionDanger: {
    color: '#f87171',
  },
});
