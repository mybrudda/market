import React, { useEffect, useState, useCallback } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, useTheme, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../../store/useAuthStore";
import { supabase } from "../../../supabaseClient";
import PostCard from "../../../components/PostCard";
import { Post } from "../../../types/database";
import LoadingScreen from "../../../components/LoadingScreen";
import Header from "../../../components/Header";

const POSTS_PER_PAGE = 10;

export default function MyPostsScreen() {
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const theme = useTheme();
  const { user } = useAuthStore();

  const fetchUserPosts = useCallback(async (start = 0, isRefresh = false) => {
    if (!user) return;

    try {
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

      const hasMorePosts = start + POSTS_PER_PAGE < total;
      setHasMore(hasMorePosts);
      
      setUserPosts(prevPosts => isRefresh ? (data || []) : [...prevPosts, ...(data || [])]);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setHasMore(false);
    }
  }, [user, page, userPosts.length, totalCount]);

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
      <Header title="My Posts" />
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
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  emptyText: {
    marginTop: 8,
    textAlign: "center",
  },
  footerLoader: {
    padding: 16,
    alignItems: "center",
  },
  loadingMoreText: {
    marginTop: 8,
  },
}); 