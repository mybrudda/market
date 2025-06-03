import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
      />
      <Stack.Screen
        name="my-posts"
      />
      <Stack.Screen
        name="saved-posts"
      />
      <Stack.Screen
        name="contact-support"
      />
    </Stack>
  );
} 