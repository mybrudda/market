import React, { useEffect, useState } from "react";
import { StyleSheet, View, Image, Pressable, TouchableOpacity } from "react-native";
import { useTheme, Text, IconButton, Button, Divider, ActivityIndicator } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "../../../store/useAuthStore";
import { useThemeStore } from "../../../store/useThemeStore";
import LoadingScreen from "../../../components/ui/LoadingScreen";
import { supabase } from "../../../supabaseClient";
import RequireAuth from "../../../components/auth/RequireAuth";
import * as ImagePicker from 'expo-image-picker';

interface UserProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  user_type: 'person' | 'company';
  is_verified: boolean | null;
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuthStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const getCleanAvatarUrl = (url: string | null) => {
    if (!url) return null;
    // Remove the @ prefix and ::text suffix from the URL
    return url.replace(/^@/, '').replace(/::text$/, '');
  };

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user!.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setIsUploading(true);
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl) {
          throw new Error('Supabase URL is not configured');
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/update-avatar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            userId: user?.id,
            base64Image: `data:image/jpeg;base64,${result.assets[0].base64}`,
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Failed to update avatar: ${errorData}`);
        }

        const { avatar_url } = await response.json();
        setUserProfile(prev => prev ? { ...prev, avatar_url } : null);
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      // You might want to show an alert to the user here
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <RequireAuth message="You need to be logged in to view your profile.">
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.headerTop}>
            <View style={styles.logoContainer}>
              <Pressable onPress={handleImagePick} style={styles.avatarContainer}>
                {isUploading ? (
                  <View style={[styles.avatar, styles.uploadingContainer]}>
                    <ActivityIndicator color={theme.colors.primary} size="large" />
                  </View>
                ) : userProfile?.avatar_url ? (
                  getCleanAvatarUrl(userProfile.avatar_url) ? (
                    <Image
                      source={{ uri: getCleanAvatarUrl(userProfile.avatar_url)! }}
                      style={styles.avatar}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="account-circle"
                      size={80}
                      color={theme.colors.primary}
                    />
                  )
                ) : (
                  <MaterialCommunityIcons
                    name="account-circle"
                    size={80}
                    color={theme.colors.primary}
                  />
                )}
              </Pressable>
              <Text variant="titleLarge" style={{ marginLeft: 8 }}>
                {userProfile?.username || 'Profile'}
              </Text>
            </View>
          </View>
        </View>

        {/* Profile Info */}
        <View style={[styles.profileInfo, { backgroundColor: theme.colors.surface }]}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            {userProfile?.email || ''}
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
          >
            {userProfile?.full_name || userProfile?.username || 'User'}
          </Text>
        </View>

        {/* Navigation Options */}
        <View style={[styles.navigationContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.navigationContent}>
            <TouchableOpacity
              onPress={() => router.push("/profile/my-posts" as any)}
              style={styles.navigationButton}
              activeOpacity={0.7}
            >
              <View style={styles.buttonInner}>
                <View style={styles.buttonLeftContent}>
                  <MaterialCommunityIcons name="post" size={20} color={theme.colors.primary} />
                  <Text variant="bodyMedium" style={styles.buttonText}>My Posts</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
              </View>
            </TouchableOpacity>
            <Divider />
            <TouchableOpacity
              onPress={() => router.push("/profile/saved-posts" as any)}
              style={styles.navigationButton}
              activeOpacity={0.7}
            >
              <View style={styles.buttonInner}>
                <View style={styles.buttonLeftContent}>
                  <MaterialCommunityIcons name="bookmark" size={20} color={theme.colors.primary} />
                  <Text variant="bodyMedium" style={styles.buttonText}>Saved Posts</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
              </View>
            </TouchableOpacity>
            <Divider />
            <TouchableOpacity
              onPress={() => router.push("/profile/BlockedUsers" as any)}
              style={styles.navigationButton}
              activeOpacity={0.7}
            >
              <View style={styles.buttonInner}>
                <View style={styles.buttonLeftContent}>
                  <MaterialCommunityIcons name="account-remove" size={20} color={theme.colors.primary} />
                  <Text variant="bodyMedium" style={styles.buttonText}>Blocked Users</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
              </View>
            </TouchableOpacity>
            <Divider />
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile/contact-support" as any)}
              style={styles.navigationButton}
              activeOpacity={0.7}
            >
              <View style={styles.buttonInner}>
                <View style={styles.buttonLeftContent}>
                  <MaterialCommunityIcons name="headset" size={20} color={theme.colors.primary} />
                  <Text variant="bodyMedium" style={styles.buttonText}>Contact Support</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
              </View>
            </TouchableOpacity>
            <Divider />
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile/notification-settings" as any)}
              style={styles.navigationButton}
              activeOpacity={0.7}
            >
              <View style={styles.buttonInner}>
                <View style={styles.buttonLeftContent}>
                  <MaterialCommunityIcons name="bell" size={20} color={theme.colors.primary} />
                  <Text variant="bodyMedium" style={styles.buttonText}>Notification Settings</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={[styles.bottomActionsContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.bottomActionsContent}>
            <TouchableOpacity
              onPress={toggleTheme}
              style={styles.bottomActionButton}
              activeOpacity={0.7}
            >
              <View style={styles.buttonInner}>
                <View style={styles.buttonLeftContent}>
                  <MaterialCommunityIcons 
                    name={isDarkMode ? "weather-sunny" : "weather-night"} 
                    size={20} 
                    color={theme.colors.primary} 
                  />
                  <Text variant="bodyMedium" style={styles.buttonText}>
                    {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            <Divider />
            <TouchableOpacity
              onPress={handleSignOut}
              style={styles.bottomActionButton}
              activeOpacity={0.7}
            >
              <View style={styles.buttonInner}>
                <View style={styles.buttonLeftContent}>
                  <MaterialCommunityIcons name="logout" size={20} color={theme.colors.error} />
                  <Text variant="bodyMedium" style={[styles.buttonText, { color: theme.colors.error }]}>
                    Sign Out
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </RequireAuth>
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
    paddingVertical: 8,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  uploadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileInfo: {
    padding: 16,
    marginTop: 10,
  },
  navigationContainer: {
    marginTop: 10,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  navigationContent: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  navigationButton: {
    height: 50,
    marginHorizontal: 0,
    borderRadius: 0,
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    paddingVertical: 4,
    paddingRight: 8,
  },
  buttonLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'flex-start',
    flex: 1,
  },
  buttonText: {
    marginLeft: 0,
  },
  bottomActionsContainer: {
    marginTop: 'auto',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  bottomActionsContent: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  bottomActionButton: {
    height: 48,
    marginHorizontal: 0,
    borderRadius: 0,
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  buttonLabel: {
    fontSize: 16,
    marginLeft: 12,
  },
});
