import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, Text, Chip, useTheme, Menu, IconButton, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import { Post, VehicleDetails, RealEstateDetails } from '../../types/database';
import { formatPrice } from '../../utils/format';
import { router } from 'expo-router';

const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

interface PostCardProps {
  post: Post;
  showMenu?: boolean;
  onDelete?: (postId: string) => void;
}

export default function PostCard({ post, showMenu = false, onDelete }: PostCardProps) {
  const theme = useTheme();
  const [imageError, setImageError] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

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
        <Text variant="bodyMedium" style={styles.detailValue}>
          {details.make} {details.model} ({details.year})
        </Text>
      </View>
      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="speedometer" size={16} color={theme.colors.onSurfaceVariant} />
        <Text variant="bodyMedium" style={styles.detailValue}>
          {details.mileage.value.toLocaleString()} {details.mileage.unit}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="gas-station" size={16} color={theme.colors.onSurfaceVariant} />
        <Text variant="bodyMedium" style={styles.detailValue}>
          {details.fuel_type}
        </Text>
      </View>
    </View>
  );

  const renderRealEstateDetails = (details: RealEstateDetails) => (
    <View style={styles.detailsContainer}>
      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="home" size={16} color={theme.colors.onSurfaceVariant} />
        <Text variant="bodyMedium" style={styles.detailValue}>
          {post.category}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="bed" size={16} color={theme.colors.onSurfaceVariant} />
        <Text variant="bodyMedium" style={styles.detailValue}>
          {details.rooms} rooms, {details.bathrooms} baths
        </Text>
      </View>
      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="ruler-square" size={16} color={theme.colors.onSurfaceVariant} />
        <Text variant="bodyMedium" style={styles.detailValue}>
          {details.size.value} {details.size.unit}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {showMenu && (
        <View style={styles.menuContainer}>
          <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={24}
                onPress={openMenu}
                style={styles.menuButton}
              />
            }
          >
            <Menu.Item 
              onPress={handleDelete} 
              title="Delete Post" 
              leadingIcon="delete"
              titleStyle={{ color: theme.colors.error }}
            />
          </Menu>
        </View>
      )}

      <Pressable onPress={() => router.push({
        pathname: '/PostDetails',
        params: { post: JSON.stringify(post) }
      })}>
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
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
          </View>

          <Card.Content style={styles.cardContent}>
            <Text 
              variant="titleLarge" 
              numberOfLines={1} 
              ellipsizeMode="tail"
              style={styles.title}
            >
              {post.title}
            </Text>

            <View style={styles.priceRow}>
              <Text 
                variant="titleMedium" 
                numberOfLines={1}
                style={{ color: theme.colors.primary }}
              >
                {formatPrice(post.price, post.currency)}
              </Text>
              <Chip 
                mode="flat" 
                style={{ backgroundColor: theme.colors.primaryContainer }}
                textStyle={{ fontSize: 12 }}
                compact
              >
                {post.listing_type === 'rent' ? 'Rent' : 'Sale'}
              </Chip>
            </View>
            
            {post.post_type === 'vehicle' 
              ? renderVehicleDetails(post.details as VehicleDetails)
              : renderRealEstateDetails(post.details as RealEstateDetails)
            }

            <View style={styles.footerRow}>
              <View style={styles.locationContainer}>
                <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.onSurfaceVariant} />
                <Text 
                  variant="bodyMedium" 
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
        </Card>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  card: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 200,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
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
    padding: 16,
  },
  title: {
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailValue: {
    color: '#666',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: {
    color: '#999',
  },
  menuContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  menuButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
  },
});