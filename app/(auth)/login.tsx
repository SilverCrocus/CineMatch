import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../lib/constants';

WebBrowser.maybeCompleteAuthSession();

const TEST_USERS = [
  { email: 'test-host@cinematch.test', name: 'Test Host', color: '#00b894' },
  { email: 'test-guest1@cinematch.test', name: 'Test Guest 1', color: '#00cec9' },
  { email: 'test-guest2@cinematch.test', name: 'Test Guest 2', color: '#0984e3' },
];

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isAuthenticated } = useAuthContext();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  async function handleSignIn(email: string) {
    console.log('[LOGIN] Signing in as:', email);

    try {
      const url = `${API_BASE_URL}/api/auth/test-login`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        await signIn(data.token, data.user);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', data.error || 'Unknown error');
      }
    } catch (error: any) {
      Alert.alert('Error', `Sign in error: ${error.message || error}`);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cinematch</Text>
        <Text style={styles.subtitle}>Find your next favorite movie</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Text style={styles.devLabel}>DEV: Select test account</Text>
        {TEST_USERS.map((user) => (
          <TouchableOpacity
            key={user.email}
            style={[styles.userButton, { backgroundColor: user.color }]}
            onPress={() => handleSignIn(user.email)}
          >
            <Text style={styles.userButtonText}>{user.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#888',
  },
  buttonContainer: {
    gap: 12,
  },
  devLabel: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  userButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  userButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
