import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { PaperProvider, } from "react-native-paper";
import { useThemeStore } from "../store/useThemeStore";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SafeScreen from "@/components/layout/SafeScreen";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from '../components/auth/AuthProvider';
import { getTheme } from '../constants/theme';
import { View, useColorScheme } from "react-native";
import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { pushNotificationService } from '../lib/pushNotificationService';
import { useAuthStore } from '../store/useAuthStore';

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
  const user = useAuthStore((state) => state.user);
  const isAuthLoading = useAuthStore((state) => state.loading);
  const isAuthInitialized = useAuthStore((state) => state.initialized);

  // Sync with system theme on first launch
  useEffect(() => {
    const userHasSetTheme = useThemeStore.getState().isDarkMode !== undefined;
    if (!userHasSetTheme && systemColorScheme) {
      setTheme(systemColorScheme === 'dark');
    }
  }, [systemColorScheme]);

  // Initialize push notification service once when app starts
  useEffect(() => {
    pushNotificationService.initialize()
      .catch(error => {
        console.error('Error initializing push notification service:', error);
      });
  }, []);

  // Handle push token registration based on user authentication state
  // Only run after auth is initialized to prevent clearing tokens during initial load
  useEffect(() => {
    if (!isAuthInitialized) {
      return; // Don't do anything until auth is initialized
    }

    const handleTokenRegistration = async () => {
      if (user) {
        // User is logged in - check if token exists first
        const hasToken = await pushNotificationService.hasToken();
        
        if (!hasToken) {
          // No token exists - register for push notifications
          const token = await pushNotificationService.registerForPushNotifications();
          if (token) {
            console.log('Push token registration completed');
          } else {
            console.log('Push token registration failed');
          }
        } else {
          console.log('Push token already exists, skipping registration');
        }
      } else {
        // User is not logged in - clear token
        pushNotificationService.clearToken();
      }
    };

    handleTokenRegistration().catch(error => {
      console.error('Error during push token registration:', error);
    });
  }, [user, isAuthInitialized]);

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
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack>
            </AuthProvider>
          </PaperProvider>
        </SafeScreen>
      </View>
    </SafeAreaProvider>
  );
}
