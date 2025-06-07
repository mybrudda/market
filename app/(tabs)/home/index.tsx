import { View, FlatList, StyleSheet, RefreshControl, ListRenderItem, Pressable } from 'react-native';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Text, useTheme, ActivityIndicator, Button } from 'react-native-paper';
import { supabase } from '../../../supabaseClient';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PostCard from '../../../components/PostCard';
import FilterSection, { FilterOptions } from '../../../components/FilterSection';
import { Post } from '../../../types/database';

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

  // Fetch initial posts without filters
  const fetchInitialPosts = useCallback(async (start = 0, shouldAccumulate = false) => {
    try {
      setError(null);
      if (!shouldAccumulate) {
        setLoading(true);
      }

      const query = supabase
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
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, start + POSTS_PER_PAGE - 1);

      const { data, error: supabaseError, count } = await query;

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      const total = count || 0;
      setTotalCount(total);
      setHasMore(start + POSTS_PER_PAGE < total);
      
      // Accumulate data if loading more, otherwise replace
      setPosts(prev => shouldAccumulate ? [...prev, ...(data || [])] : (data || []));

      if (__DEV__) {
        console.log('Initial fetch:', {
          totalPosts: total,
          fetchedPosts: data?.length,
          start,
          shouldAccumulate
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching posts');
      console.error('Error fetching initial posts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch posts with filters
  const fetchFilteredPosts = useCallback(async (start = 0, filters: FilterOptions, shouldAccumulate = false) => {
    try {
      setError(null);
      if (!shouldAccumulate) {
        setLoading(true);
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

      // Apply filters
      query = query.eq('post_type', filters.postType)
        .eq('listing_type', filters.listingType);
      
      if (filters.city) {
        query = query.eq('location->>city', filters.city);
      }
      
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      
      if (filters.priceRange.min) {
        query = query.gte('price', parseFloat(filters.priceRange.min));
      }
      if (filters.priceRange.max) {
        query = query.lte('price', parseFloat(filters.priceRange.max));
      }

      // Vehicle-specific filters
      if (filters.postType === 'vehicle') {
        if (filters.make) {
          query = query.eq('details->>make', filters.make);
        }
        if (filters.model) {
          query = query.ilike('details->>model', `%${filters.model}%`);
        }
        if (filters.fuelType) {
          query = query.eq('details->>fuel_type', filters.fuelType);
        }
        if (filters.transmission === 'Manual' || filters.transmission === 'Automatic') {
          query = query.eq('details->>transmission', filters.transmission);
        }
        if (filters.yearRange.min && filters.yearRange.max) {
          query = query
            .gte('details->>year', filters.yearRange.min.toString())
            .lte('details->>year', filters.yearRange.max.toString());
        }
      }

      // Real estate-specific filters
      if (filters.postType === 'realestate') {
        if (filters.size?.min) {
          query = query.gte('details->size->>value', parseFloat(filters.size.min));
        }
        if (filters.size?.max) {
          query = query.lte('details->size->>value', parseFloat(filters.size.max));
        }
        if (filters.features.length > 0) {
          const featuresArray = JSON.stringify(filters.features);
          query = query.contains('details->features', featuresArray);
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
      setHasMore(start + POSTS_PER_PAGE < total);
      
      // Accumulate data if loading more, otherwise replace
      setPosts(prev => shouldAccumulate ? [...prev, ...(data || [])] : (data || []));

      if (__DEV__) {
        console.log('Filtered fetch:', {
          totalPosts: total,
          fetchedPosts: data?.length,
          filters,
          start,
          shouldAccumulate
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching posts');
      console.error('Error fetching filtered posts:', err);
    } finally {
      if (!shouldAccumulate) {
        setLoading(false);
      }
    }
  }, [searchQuery]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(0);
    setHasMore(true);
    
    if (activeFilters) {
      fetchFilteredPosts(0, activeFilters, false);
    } else {
      fetchInitialPosts(0, false);
    }
  }, [fetchFilteredPosts, fetchInitialPosts, activeFilters]);

  // Handle filters
  const handleFilter = useCallback((filters: FilterOptions) => {
    setActiveFilters(filters);
    setPage(0);
    setHasMore(true);
    fetchFilteredPosts(0, filters, false);
  }, [fetchFilteredPosts]);

  // Initial load - fetch all posts without filters
  useEffect(() => { // useEffect will run twice on initial load due to REACT sctrict mode
  console.log('Mounted Home Screen')
    let mounted = true;

    const loadInitialData = async () => {
      if (mounted) {
        await fetchInitialPosts(0, false);
      }
    };

    loadInitialData();

    return () => {
      mounted = false;
    };
  }, []);

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    setPage(0);
    
    const fetchData = async () => {
      if (activeFilters) {
        await fetchFilteredPosts(0, activeFilters, false);
      } else {
        await fetchInitialPosts(0, false);
      }
      setRefreshing(false);
    };
    
    fetchData();
  }, [refreshing, activeFilters, fetchFilteredPosts, fetchInitialPosts]);

  // Load more posts
  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    const nextStart = (page + 1) * POSTS_PER_PAGE;
    if (nextStart >= totalCount) {
      setHasMore(false);
      return;
    }

    setLoadingMore(true);
    setPage(prev => prev + 1);

    const loadMore = async () => {
      if (activeFilters) {
        await fetchFilteredPosts(nextStart, activeFilters, true);
      } else {
        await fetchInitialPosts(nextStart, true);
      }
      setLoadingMore(false);
    };

    loadMore();
  }, [loadingMore, hasMore, page, totalCount, activeFilters, fetchFilteredPosts, fetchInitialPosts]);

  // Handle reset
  const handleReset = useCallback(() => {
    setSearchQuery('');
    setActiveFilters(null);
    setPage(0);
    setHasMore(true);
    setLoading(true);
    fetchInitialPosts(0, false).finally(() => setLoading(false));
  }, [fetchInitialPosts]);

  // Memoized Components
  const ListHeaderComponent = useMemo(() => (
    <View style={styles.headerSpacer} />
  ), []);

  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Pressable onPress={handleReset}>
        <MaterialCommunityIcons 
          name="shopping" 
          size={48} 
          color={theme.colors.onSurfaceVariant} 
        />
      </Pressable>
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
          onPress={() => router.replace('/(tabs)/create')}
          style={styles.emptyButton}
        >
          Create Post
        </Button>
      )}
    </View>
  ), [theme.colors.onSurfaceVariant, loading, searchQuery, activeFilters, handleReset]);

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
      <FilterSection 
        onSearch={handleSearch} 
        onFilter={handleFilter}
        onLogoPress={handleReset}
      />
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
        onPress={() => router.push('/(tabs)/create')}
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