import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { Card, Text, Chip, useTheme, Menu, IconButton, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import { Post, VehicleDetails, RealEstateDetails } from '../../types/database';
import { formatPrice } from '../../utils/format';
import { router } from 'expo-router';
import { savedPostsService } from '../../lib/savedPostsService';
import { useAuthStore } from '../../store/useAuthStore';

const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

interface PostCardProps {
  post: Post;
  showMenu?: boolean;
  onDelete?: (postId: string) => void;
  onUnsave?: (postId: string) => void;
}

export default function PostCard({ post, showMenu = false, onDelete, onUnsave }: PostCardProps) {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [imageError, setImageError] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleDelete = () => {
    closeMenu();
    onDelete?.(post.id);
  };

  // Check if post is saved when component mounts
  useEffect(() => {
    if (user) {
      checkSavedStatus();
    }
  }, [user, post.id]);

  const checkSavedStatus = async () => {
    if (!user) return;
    
    try {
      const saved = await savedPostsService.isPostSaved(post.id, user.id);
      setIsSaved(saved);
    } catch (error) {
      console.error('Error checking saved status:', error);
    }
  };

  const handleSavePost = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to save posts');
      return;
    }

    // Prevent users from saving their own posts
    if (user.id === post.user_id) {
      Alert.alert('Cannot Save', 'You cannot save your own posts');
      return;
    }

    setSaving(true);
    try {
      if (isSaved) {
        await savedPostsService.unsavePost(post.id, user.id);
        setIsSaved(false);
        // Call onUnsave callback if provided
        onUnsave?.(post.id);
        // Show success message for unsave (only if not in saved posts screen)
        if (!onUnsave) {
          Alert.alert('Success', 'Post removed from saved posts');
        }
      } else {
        await savedPostsService.savePost(post.id, user.id);
        setIsSaved(true);
        // Show success message for save
        Alert.alert('Success', 'Post added to saved posts');
      }
    } catch (error) {
      console.error('Error saving/unsaving post:', error);
      Alert.alert('Error', 'Failed to save post. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const renderVehicleDetails = (details: VehicleDetails) => (
    <View style={styles.detailsContainer}>
      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="car" size={16} color={theme.colors.onSurfaceVariant} />
        <Text variant="bodySmall" style={styles.detailValue}>
          {details.make} {details.model} ({details.year})
        </Text>
      </View>
      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="gas-station" size={16} color={theme.colors.onSurfaceVariant} />
        <Text variant="bodySmall" style={styles.detailValue}>
          {details.fuel_type}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="speedometer" size={16} color={theme.colors.onSurfaceVariant} />
        <Text variant="bodySmall" style={styles.detailValue}>
          {details.mileage.value.toLocaleString()} {details.mileage.unit}
        </Text>
      </View>
    </View>
  );

  const renderRealEstateDetails = (details: RealEstateDetails) => (
    <View style={styles.detailsContainer}>
      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="home" size={16} color={theme.colors.onSurfaceVariant} />
        <Text variant="bodySmall" style={styles.detailValue}>
          {post.category}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="bed" size={16} color={theme.colors.onSurfaceVariant} />
        <Text variant="bodySmall" style={styles.detailValue}>
          {details.rooms} rooms, {details.bathrooms} baths
        </Text>
      </View>
      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="ruler-square" size={16} color={theme.colors.onSurfaceVariant} />
        <Text variant="bodySmall" style={styles.detailValue}>
          {details.size.value} {details.size.unit}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.push({ pathname: '/PostDetails', params: { post: JSON.stringify(post) } })}>
        <Card style={styles.card}>
          <View style={styles.cardContentWrapper}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: post.images[0] }}
                style={styles.cardImage}
                contentFit="cover"
                transition={300}
                placeholder={blurhash}
                onError={() => setImageError(true)}
              />
              {imageError && (
                <View style={[styles.errorOverlay, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name="image-off" size={24} color={theme.colors.onSurfaceVariant} />
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>Image unavailable</Text>
                </View>
              )}
              <View style={[styles.imageOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                <Text 
                  variant="titleMedium" 
                  numberOfLines={1}
                  style={{ color: "white", fontWeight: 'bold' }}
                >
                  {formatPrice(post.price, post.currency)}
                </Text>
                <Chip 
                  mode="flat" 
                  style={{ backgroundColor: theme.colors.primaryContainer }}
                  textStyle={{ color: theme.colors.primary, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}
                  compact
                >
                  {post.listing_type === 'rent' ? 'Rent' : 'Sale'}
                </Chip>
              </View>
              
              {/* Heart Icon for Favorites */}
              <View style={styles.heartIconContainer}>
                <IconButton
                  icon={isSaved ? "heart" : "heart-outline"}
                  size={20}
                  iconColor={isSaved ? "rgb(168, 96, 146)" : theme.colors.primary}
                  style={[styles.heartIcon, { backgroundColor: theme.colors.primaryContainer }]}
                  onPress={handleSavePost}
                  disabled={saving || user?.id === post.user_id}
                  loading={saving}
                />
              </View>
            </View>

            <Card.Content style={styles.cardContent}>
              <Text 
                variant="titleMedium" 
                numberOfLines={1} 
                ellipsizeMode="tail"
                style={styles.title}
              >
                {post.title}
              </Text>
              
              {post.post_type === 'vehicle' 
                ? renderVehicleDetails(post.details as VehicleDetails)
                : renderRealEstateDetails(post.details as RealEstateDetails)
              }

              <View style={styles.footerRow}>
                <View style={styles.locationContainer}>
                  <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text 
                    variant="bodySmall" 
                    numberOfLines={1}
                    style={styles.detailValue}
                  >
                    {post.location.city}
                  </Text>
                </View>
                
                <Text 
                  variant="bodySmall" 
                  numberOfLines={1}
                  style={styles.date}
                >
                  Posted {formatDate(post.created_at)}
                </Text>
              </View>
            </Card.Content>
          </View>
          
          {showMenu && (
            <View style={styles.menuContainer}>
              <Menu
                visible={menuVisible}
                onDismiss={closeMenu}
                anchor={
                                  <IconButton
                  icon="dots-vertical"
                  onPress={openMenu}
                  style={[styles.menuButton, { backgroundColor: theme.colors.primaryContainer }]}
                  iconColor={theme.colors.primary}
                />
                }
              >
                <Menu.Item 
                  onPress={handleDelete} 
                  title="Delete"
                  leadingIcon="delete"
                />
              </Menu>
            </View>
          )}
        </Card>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
  },
  cardContentWrapper: {
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 200,
    width: '100%',
  },
  cardImage: {
    height: '100%',
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  title: {
    marginBottom: 8,
  },
  detailsContainer: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailValue: {
    marginLeft: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    color: '#666',
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 2,
  },
  menuButton: {
    margin: 4,
  },
  heartIconContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 3,
  },
  heartIcon: {
    borderRadius: 20,
    margin: 0,
  },
});