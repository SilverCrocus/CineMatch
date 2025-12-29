import { Stack } from 'expo-router';
import { Colors } from '../../constants/Colors';

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="solo" />
      <Stack.Screen name="friends" />
    </Stack>
  );
}
