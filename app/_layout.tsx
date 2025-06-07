import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import { useThemeStore } from "../store/useThemeStore";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SafeScreen from "@/components/SafeScreen";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from '../components/AuthProvider';
import { getTheme } from '../constants/theme';
import { View, useColorScheme } from "react-native";
import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const setTheme = useThemeStore((state) => state.setTheme);
  const systemColorScheme = useColorScheme();
  const paperTheme = getTheme(isDarkMode);

  // Sync with system theme on first launch
  useEffect(() => {
    const userHasSetTheme = useThemeStore.getState().isDarkMode !== undefined;
    if (!userHasSetTheme && systemColorScheme) {
      setTheme(systemColorScheme === 'dark');
    }
  }, [systemColorScheme]);

  const navigationTheme = isDarkMode ? NavigationDarkTheme : NavigationDefaultTheme;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: paperTheme.colors.background }}>
        <StatusBar 
          style={isDarkMode ? "light" : "dark"}
          translucent={true}
        />
        <SafeScreen>
          <PaperProvider theme={paperTheme}>
            <AuthProvider>
              <Stack 
                screenOptions={{ 
                  headerShown: false,
                  contentStyle: { backgroundColor: navigationTheme.colors.background }
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="register" />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack>
            </AuthProvider>
          </PaperProvider>
        </SafeScreen>
      </View>
    </SafeAreaProvider>
  );
}
