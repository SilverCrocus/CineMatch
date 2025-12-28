import { Stack } from 'expo-router';

export default function SoloLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="list" />
    </Stack>
  );
}
