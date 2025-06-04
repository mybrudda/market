import { View, FlatList, StyleSheet, RefreshControl, ListRenderItem } from 'react-native';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Text, useTheme, ActivityIndicator, Button } from 'react-native-paper';
import { supabase } from '../../../supabaseClient';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PostCard from '../../../components/PostCard';
import FilterSection, { FilterOptions } from '../../../components/FilterSection';
import { Post } from '../../../types/post';

// Constants
const POSTS_PER_PAGE = 10;

export default function Home() {
  // Theme and State
  const theme = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<FilterOptions | null>(null);

  // Fetch posts with pagination
  const fetchPosts = useCallback(async (start = 0, isRefresh = false) => {
    try {
      setError(null);

      // First check if we're trying to fetch beyond available posts
      if (start >= totalCount && totalCount > 0) {
        setHasMore(false);
        return;
      }
      
      let query = supabase
        .from('posts')
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
        `, { count: 'exact' });

      // Add title search if searchQuery exists
      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      // Apply filters if they exist
      if (activeFilters) {
        // Post type filter
        query = query.eq('post_type', activeFilters.postType);
        
        // Listing type filter
        query = query.eq('listing_type', activeFilters.listingType);
        
        // Location filter
        if (activeFilters.city) {
          query = query.eq('location->>city', activeFilters.city);
        }
        
        // Category filter
        if (activeFilters.category) {
          query = query.eq('category', activeFilters.category);
        }
        
        // Price range filter
        if (activeFilters.priceRange.min) {
          query = query.gte('price', parseFloat(activeFilters.priceRange.min));
        }
        if (activeFilters.priceRange.max) {
          query = query.lte('price', parseFloat(activeFilters.priceRange.max));
        }

        // Vehicle-specific filters
        if (activeFilters.postType === 'vehicle') {
          if (activeFilters.make) {
            query = query.eq('details->>make', activeFilters.make);
          }
          if (activeFilters.model) {
            query = query.ilike('details->>model', `%${activeFilters.model}%`);
          }
          if (activeFilters.fuelType) {
            query = query.eq('details->>fuel_type', activeFilters.fuelType);
          }
          if (activeFilters.transmission) {
            query = query.eq('details->>transmission', activeFilters.transmission);
          }
          if (activeFilters.yearRange.min && activeFilters.yearRange.max) {
            query = query
              .gte('details->>year', activeFilters.yearRange.min.toString())
              .lte('details->>year', activeFilters.yearRange.max.toString());
          }
        }

        // Real estate-specific filters
        if (activeFilters.postType === 'realestate') {
          if (activeFilters.size?.min) {
            query = query.gte('details->size->>value', parseFloat(activeFilters.size.min));
          }
          if (activeFilters.size?.max) {
            query = query.lte('details->size->>value', parseFloat(activeFilters.size.max));
          }
          if (activeFilters.features.length > 0) {
            // For array containment in JSONB, we need to use ?& operator
            query = query.contains('details->features', activeFilters.features);
          }
        }
      }

      const { data, error: supabaseError, count } = await query
        .order('created_at', { ascending: false })
        .range(start, start + POSTS_PER_PAGE - 1);

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      const total = count || 0;
      setTotalCount(total);

      // Debug logging in development only
      if (__DEV__) {
        console.log({
          totalPosts: total,
          currentPage: page + 1,
          fetchedPosts: data?.length,
          totalLoaded: isRefresh ? data?.length : posts.length + (data?.length || 0),
          start,
          searchQuery,
          activeFilters,
        });
      }

      // Check if there are more posts to load
      const hasMorePosts = start + POSTS_PER_PAGE < total;
      setHasMore(hasMorePosts);

      setPosts(prevPosts => isRefresh ? (data || []) : [...prevPosts, ...(data || [])]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching posts');
      console.error('Error fetching posts:', err);
      setHasMore(false);
    }
  }, [page, posts.length, totalCount, searchQuery, activeFilters]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(0);
    setHasMore(true);
    setLoading(true);
    fetchPosts(0, true).finally(() => setLoading(false));
  }, [fetchPosts]);

  // Handle filters
  const handleFilter = useCallback((filters: FilterOptions) => {
    setActiveFilters(filters);
    setPage(0);
    setHasMore(true);
    setLoading(true);
    fetchPosts(0, true).finally(() => setLoading(false));
  }, [fetchPosts]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchPosts(0, true).finally(() => setLoading(false));
  }, [fetchPosts]);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setPage(0);
    await fetchPosts(0, true);
    setRefreshing(false);
  }, [fetchPosts, refreshing]);

  // Load more posts
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
    await fetchPosts(nextStart);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, totalCount, fetchPosts]);

  // Memoized Components
  const ListHeaderComponent = useMemo(() => (
    <View style={styles.headerSpacer} />
  ), []);

  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons 
        name="file-search-outline" 
        size={48} 
        color={theme.colors.onSurfaceVariant} 
      />
      <Text variant="titleMedium" style={styles.emptyText}>
        {loading ? "Loading posts..." : (searchQuery || activeFilters) ? "No posts found" : "No posts available"}
      </Text>
      <Text style={styles.emptySubtext}>
        {(searchQuery || activeFilters) ? 
          "Try adjusting your search or filters" : 
          "Be the first to post something!"
        }
      </Text>
      {!searchQuery && !activeFilters && (
        <Button 
          mode="contained" 
          onPress={() => router.push('/(tabs)/create/vehicle')}
          style={styles.emptyButton}
        >
          Create Post
        </Button>
      )}
    </View>
  ), [theme.colors.onSurfaceVariant, loading, searchQuery, activeFilters]);

  const ListFooterComponent = useCallback(() => {
    if (posts.length === 0) return null;
    
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingMoreText}>Loading more posts...</Text>
        </View>
      );
    }

    if (!hasMore) {
      return (
        <View style={styles.endOfListContainer}>
          <MaterialCommunityIcons 
            name="check-circle" 
            size={24} 
            color={theme.colors.primary}
          />
          <Text style={[styles.endOfListText, { color: theme.colors.primary }]}>
            You're all caught up!
          </Text>
          <Text style={styles.endOfListSubtext}>
            Pull to refresh for new listings
          </Text>
        </View>
      );
    }

    return null;
  }, [loadingMore, hasMore, theme.colors.primary, posts.length]);

  const renderItem: ListRenderItem<Post> = useCallback(({ item }) => (
    <PostCard post={item} />
  ), []);

  const keyExtractor = useCallback((item: Post) => item.id, []);

  // Error State
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.errorContainer }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
        <Button mode="contained" onPress={handleRefresh}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FilterSection onSearch={handleSearch} onFilter={handleFilter} />
      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      />
      <Button 
        mode="contained" 
        onPress={() => router.push('/(tabs)/create/vehicle')}
        style={styles.fab}
        icon="plus"
      >
        Post
      </Button>
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
  headerSpacer: {
    height: 64, // Match the height of the FilterSection header
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    borderRadius: 28,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    marginTop: 8,
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
  endOfListSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
    padding: 16,
  },
}); 