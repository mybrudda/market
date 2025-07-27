import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { Card, Text, Chip, useTheme, Menu, IconButton, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import { Post, VehicleDetails, RealEstateDetails } from '../../types/database';
import { formatPrice } from '../../utils/format';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useSavePost } from '../../lib/hooks/useSavePost';

const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

interface PostCardProps {
  post: Post;
  showMenu?: boolean;
  onDelete?: (postId: string) => void;
  onUnsave?: (postId: string) => void;
  cardStyle?: object;
}

export default function PostCard({ post, showMenu = false, onDelete, onUnsave, cardStyle }: PostCardProps) {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [imageError, setImageError] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // Use shared save post hook
  const { isSaved, saving, handleSavePost } = useSavePost({
    postId: post.id,
    userId: post.user_id,
    onUnsave,
    showSuccessAlerts: true
  });

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleDelete = () => {
    closeMenu();
    onDelete?.(post.id);
  };



  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const renderVehicleDetails = (details: VehicleDetails) => (
    <View style={styles.detailsContainer}>
      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="car" size={16} color={theme.colors.onSurfaceVariant} />
        <Text
          variant="bodySmall"
          style={styles.detailValue}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
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
        <Card style={[cardStyle]}>
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
                  numberOfLines={1}
                  style={{ color: "white", fontWeight: 'bold', fontSize: 14 }}
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
              
              {/* Top-right Icon: Save or Menu, same position and style */}
              <View style={styles.actionIconContainer}>
                {showMenu ? (
                  <Menu
                    visible={menuVisible}
                    onDismiss={closeMenu}
                    anchor={
                      <IconButton
                        icon="dots-vertical"
                        size={14}
                        onPress={openMenu}
                        style={[styles.actionIcon, { backgroundColor: theme.colors.primaryContainer }]}
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
                ) : (
                  <IconButton
                    icon={isSaved ? "bookmark" : "bookmark-outline"}
                    size={14}
                    iconColor={isSaved ? "rgb(168, 96, 146)" : theme.colors.primary}
                    style={[styles.actionIcon, { backgroundColor: theme.colors.primaryContainer }]}
                    onPress={handleSavePost}
                    disabled={saving || user?.id === post.user_id}
                    loading={saving}
                  />
                )}
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
                <View style={{ flex: 1 }}>
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
              </View>
            </Card.Content>
          </View>
          
          {/* Menu is now handled inline above */}
        </Card>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  cardContentWrapper: {
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 4 / 3,
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
    paddingHorizontal: 5,
    paddingVertical: 5,
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
  // menuButton style removed; use bookmarkIcon for both
  actionIconContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 3,
  },
  actionIcon: {
    borderRadius: 20,
    margin: 0,
  },
});