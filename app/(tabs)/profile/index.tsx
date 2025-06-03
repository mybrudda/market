import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme, Text, IconButton, Button, Divider } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "../../../store/useAuthStore";
import { useThemeStore } from "../../../store/useThemeStore";
import LoadingScreen from "../../../components/LoadingScreen";

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuthStore();
  const { isDarkMode, toggleTheme } = useThemeStore();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons
              name="account"
              size={28}
              color={theme.colors.primary}
            />
            <Text variant="titleLarge" style={{ marginLeft: 8 }}>
              Profile
            </Text>
          </View>
          <View style={styles.headerActions}>
            <IconButton
              icon={isDarkMode ? "weather-sunny" : "weather-night"}
              onPress={toggleTheme}
              accessibilityLabel="Toggle Theme"
            />
            <IconButton
              icon="logout"
              onPress={handleSignOut}
              accessibilityLabel="Logout"
            />
          </View>
        </View>
      </View>

      {/* Profile Info */}
      <View style={[styles.profileInfo, { backgroundColor: theme.colors.surface }]}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          {user?.email}
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
        >
          {user?.user_metadata?.full_name || 'User'}
        </Text>
      </View>

      {/* Navigation Options */}
      <View style={[styles.navigationContainer, { backgroundColor: theme.colors.surface }]}>
        <Button
          mode="text"
          onPress={() => router.push("/(tabs)/profile/my-posts" as any)}
          contentStyle={styles.buttonContent}
          style={styles.navigationButton}
          labelStyle={styles.buttonLabel}
        >
          <View style={styles.buttonInner}>
            <View style={styles.buttonLeftContent}>
              <MaterialCommunityIcons name="post" size={28} color={theme.colors.primary} />
              <Text variant="bodyLarge" style={styles.buttonText}>My Posts</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
          </View>
        </Button>
        <Divider />
        <Button
          mode="text"
          onPress={() => router.push("/(tabs)/profile/saved-posts" as any)}
          contentStyle={styles.buttonContent}
          style={styles.navigationButton}
        >
          <View style={styles.buttonInner}>
            <View style={styles.buttonLeftContent}>
              <MaterialCommunityIcons name="bookmark" size={28} color={theme.colors.primary} />
              <Text variant="bodyLarge" style={styles.buttonText}>Saved Posts</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
          </View>
        </Button>
        <Divider />
        <Button
          mode="text"
          onPress={() => router.push("/(tabs)/profile/contact-support" as any)}
          contentStyle={styles.buttonContent}
          style={styles.navigationButton}
        >
          <View style={styles.buttonInner}>
            <View style={styles.buttonLeftContent}>
              <MaterialCommunityIcons name="headset" size={28} color={theme.colors.primary} />
              <Text variant="bodyLarge" style={styles.buttonText}>Contact Support</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
          </View>
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    elevation: 2,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
  },
  profileInfo: {
    padding: 16,
    marginTop: 16,
  },
  navigationContainer: {
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  navigationButton: {
    height: 70,
    marginHorizontal: 0,
    borderRadius: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: '100%',
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    paddingVertical: 8,
  },
  buttonLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  buttonText: {
    marginLeft: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  buttonLabel: {
    fontSize: 16,
    marginLeft: 12,
  },
});
