import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../lib/constants';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isAuthenticated } = useAuthContext();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  // For now, use a simple dev login flow
  // TODO: Replace with proper Google OAuth configuration
  async function handleSignIn() {
    Alert.alert('Debug', 'Button pressed! Attempting login...');
    console.log('[LOGIN] Button pressed, starting sign in...');
    console.log('[LOGIN] API_BASE_URL:', API_BASE_URL);

    try {
      const url = `${API_BASE_URL}/api/auth/test-login`;
      console.log('[LOGIN] Fetching:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test-host@cinematch.test' }),
      });

      console.log('[LOGIN] Response status:', response.status);
      const data = await response.json();
      console.log('[LOGIN] Response data:', JSON.stringify(data, null, 2));

      if (response.ok && data.token) {
        console.log('[LOGIN] Token received, calling signIn...');
        await signIn(data.token, data.user);
        console.log('[LOGIN] signIn complete, navigating to tabs...');
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', data.error || 'Unknown error');
        console.error('[LOGIN] Login failed:', data.error || 'Unknown error');
      }
    } catch (error: any) {
      Alert.alert('Error', `Sign in error: ${error.message || error}`);
      console.error('[LOGIN] Sign in error:', error);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cinematch</Text>
        <Text style={styles.subtitle}>Find your next favorite movie</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.googleButton} onPress={handleSignIn}>
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
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
    gap: 16,
  },
  googleButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});
