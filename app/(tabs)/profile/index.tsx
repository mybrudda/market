import React, { useEffect, useState, useCallback } from "react";
import {
  FlatList,
  StyleSheet,
  View,
  Platform,
  UIManager,
  TouchableOpacity,
} from "react-native";
import {
  ActivityIndicator,
  useTheme,
  Text,
  IconButton,
  Button,
  Divider,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import LoadingScreen from "../../../components/LoadingScreen";
import { router } from "expo-router";
import { useAuthStore } from "../../../store/useAuthStore";
import { useThemeStore } from "../../../store/useThemeStore";
import { supabase } from "../../../supabaseClient";
import PostCard from "../../../components/PostCard";
import { Post } from "../../../types/post";

// Constants
const POSTS_PER_PAGE = 10;

// Enable Layout Animation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ProfileScreen() {
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const theme = useTheme();
  const { user, signOut } = useAuthStore();
  const { isDarkMode, toggleTheme } = useThemeStore();

  const fetchUserPosts = useCallback(async (start = 0, isRefresh = false) => {
    if (!user) return;

    try {
      // First check if we're trying to fetch beyond available posts
      if (start >= totalCount && totalCount > 0) {
        setHasMore(false);
        return;
      }

      const { data, error, count } = await supabase
        .from("posts")
        .select(`
          *,
          user:user_id (
            id,
            username,
            full_name,
            avatar_url,
            email,
            user_type,
            is_verified
          )
        `, { count: 'exact' })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(start, start + POSTS_PER_PAGE - 1);

      if (error) throw error;

      const total = count || 0;
      setTotalCount(total);

      // Debug logging in development
      if (__DEV__) {
        console.log({
          totalPosts: total,
          currentPage: page + 1,
          fetchedPosts: data?.length,
          totalLoaded: isRefresh ? data?.length : userPosts.length + (data?.length || 0),
          start,
        });
      }

      // Check if there are more posts to load
      const hasMorePosts = start + POSTS_PER_PAGE < total;
      setHasMore(hasMorePosts);
      
      // Update posts state
      setUserPosts(prevPosts => isRefresh ? (data || []) : [...prevPosts, ...(data || [])]);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setHasMore(false);
    }
  }, [user, page, userPosts.length, totalCount]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchUserPosts(0, true).finally(() => setLoading(false));
    }
  }, [user, fetchUserPosts]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setPage(0);
    await fetchUserPosts(0, true);
    setRefreshing(false);
  }, [fetchUserPosts, refreshing]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    const nextStart = page * POSTS_PER_PAGE + POSTS_PER_PAGE;
    
    // Check if we've reached the end
    if (nextStart >= totalCount) {
      setHasMore(false);
      return;
    }
    
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchUserPosts(nextStart);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, totalCount, fetchUserPosts]);

  const toggleSettingsPanel = () => {
    setShowSettings(!showSettings);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const Header = useCallback(() => (
    <View style={[styles.fixedHeader, { backgroundColor: theme.colors.surface }]}>
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
      <Divider />
      <View style={styles.profileInfo}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          {user?.email}
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
        >
          Posts: {userPosts.length}
        </Text>
      </View>
    </View>
  ), [theme.colors, user?.email, userPosts.length, isDarkMode, toggleTheme]);

  const ListEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="post-outline"
          size={48}
          color={theme.colors.onSurfaceVariant}
        />
        <Text
          variant="bodyLarge"
          style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
        >
          {loading ? "Loading posts..." : "No posts yet"}
        </Text>
      </View>
    ),
    [theme.colors.onSurfaceVariant, loading]
  );

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header />
      <FlatList
        data={userPosts}
        renderItem={({ item }) => <PostCard post={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" />
              <Text style={styles.loadingMoreText}>Loading more posts...</Text>
            </View>
          ) : null
        }
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  fixedHeader: {
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileInfo: {
    padding: 16,
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 16,
    textAlign: "center",
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  loadingMoreText: {
    color: '#666',
  },
  endOfListContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 16,
  },
  endOfListText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
});
