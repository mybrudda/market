import React, { useEffect, useState } from "react";
import { StyleSheet, View, Pressable, TouchableOpacity } from "react-native";
import { useTheme, Text, IconButton, Button, Divider, ActivityIndicator } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "../../../store/useAuthStore";
import { useThemeStore } from "../../../store/useThemeStore";
import LoadingScreen from "../../../components/ui/LoadingScreen";
import { supabase } from "../../../supabaseClient";
import RequireAuth from "../../../components/auth/RequireAuth";
import * as ImagePicker from 'expo-image-picker';
import ProfileImage from "../../../components/ui/ProfileImage";

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  profile_image_id: string | null;
  email: string;
  user_type: 'person' | 'company';
  is_verified: boolean | null;
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, session, signOut } = useAuthStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  // Clear temporary image URL when user changes
  useEffect(() => {
    setTempImageUrl(null);
  }, [user]);



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
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl) {
          throw new Error('Supabase URL is not configured');
        }

        // Use session token from Zustand store
        if (!session?.access_token) {
          throw new Error('No valid session found');
        }

        // Create temporary image URL for optimistic update
        const tempImageUrl = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        // Store the original profile image ID for rollback
        const originalProfileImageId = userProfile?.profile_image_id || null;
        
        // Set temporary image URL for optimistic display
        setTempImageUrl(tempImageUrl);
        
        // Optimistic update - show new image immediately
        setUserProfile(prev => prev ? { ...prev, profile_image_id: 'temp' } : null);

        // Start upload in background
        setIsUploading(true);
        
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/update-profile-image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              base64Image: tempImageUrl,
            }),
          });

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Failed to update profile image: ${errorData}`);
          }

          const { profile_image_id } = await response.json();
          
          // Update with the actual profile image ID
          setUserProfile(prev => prev ? { ...prev, profile_image_id } : null);
          // Clear temporary image URL
          setTempImageUrl(null);
        } catch (error) {
          // Rollback on error - restore original profile image ID
          setUserProfile(prev => prev ? { ...prev, profile_image_id: originalProfileImageId } : null);
          // Clear temporary image URL on error
          setTempImageUrl(null);
          console.error('Error updating profile image:', error);
          alert('Failed to update profile picture. Please try again.');
        } finally {
          setIsUploading(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Failed to pick image. Please try again.');
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
                <View style={styles.avatarWrapper}>
                  <ProfileImage
                    imageId={userProfile?.profile_image_id}
                    size={80}
                    folder="avatars"
                    tempImageUrl={tempImageUrl}
                  />
                  {isUploading && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator color={theme.colors.primary} size="small" />
                    </View>
                  )}
                </View>
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
            {userProfile?.display_name || userProfile?.username || 'User'}
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
   avatarWrapper: {
     position: 'relative',
   },
   uploadingOverlay: {
     position: 'absolute',
     top: 0,
     left: 0,
     width: 80,
     height: 80,
     borderRadius: 40,
     justifyContent: 'center',
     alignItems: 'center',
     backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
  
});
