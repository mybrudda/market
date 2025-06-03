import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function ProfileLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false
        }}
      />
    </Stack>
  );
} 