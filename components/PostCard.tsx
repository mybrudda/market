import { View, StyleSheet, Pressable } from 'react-native';
import React from 'react';
import { Text, Card, Chip, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface VehicleDetails {
  make: string;
  model: string;
  year: string;
  mileage: {
    value: number;
    unit: string;
  };
  condition: string;
  fuel_type: string;
  transmission: string;
  features: string[];
}

interface RealEstateDetails {
  category: string;
  rooms: number;
  bathrooms: number;
  year: string;
  condition: string;
  features: string[];
  size: {
    value: number;
    unit: string;
  };
}

interface PostCardProps {
  post: {
    id: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    images: string[];
    created_at: string;
    post_type: 'vehicle' | 'realestate';
    listing_type: 'rent' | 'sale';
    user_id: string;
    user: {
      id: string;
      username: string;
      full_name: string | null;
      avatar_url: string | null;
      email: string;
      user_type: 'person' | 'company';
      is_verified: boolean | null;
    };
    details: VehicleDetails | RealEstateDetails;
    location: {
      city: string;
      address?: string;
      country: string;
    };
  };
}

export default function PostCard({ post }: PostCardProps) {
  const theme = useTheme();

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderVehicleDetails = (details: VehicleDetails) => (
    <View style={styles.detailsRow}>
      <View style={styles.detail}>
        <View style={styles.detailIconContainer}>
          <MaterialCommunityIcons 
            name="car" 
            size={16} 
            color={theme.colors.onSurfaceVariant}
          />
        </View>
        <View style={styles.detailTextContainer}>
          <Text variant="bodyMedium" style={styles.detailLabel}>Make</Text>
          <Text 
            variant="bodyMedium" 
            numberOfLines={1}
            style={styles.detailValue}
          >
            {details.make}
          </Text>
        </View>
      </View>

      <View style={styles.detail}>
        <View style={styles.detailIconContainer}>
          <MaterialCommunityIcons 
            name="calendar" 
            size={16} 
            color={theme.colors.onSurfaceVariant}
          />
        </View>
        <View style={styles.detailTextContainer}>
          <Text variant="bodyMedium" style={styles.detailLabel}>Year</Text>
          <Text 
            variant="bodyMedium" 
            numberOfLines={1}
            style={styles.detailValue}
          >
            {details.year}
          </Text>
        </View>
      </View>
      
      <View style={styles.detail}>
        <View style={styles.detailIconContainer}>
          <MaterialCommunityIcons 
            name="speedometer" 
            size={16} 
            color={theme.colors.onSurfaceVariant}
          />
        </View>
        <View style={styles.detailTextContainer}>
          <Text variant="bodyMedium" style={styles.detailLabel}>Mileage</Text>
          <Text 
            variant="bodyMedium" 
            numberOfLines={1}
            style={styles.detailValue}
          >
            {details.mileage.value.toLocaleString()} {details.mileage.unit}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderRealEstateDetails = (details: RealEstateDetails) => (
    <View style={styles.detailsRow}>
      <View style={styles.detail}>
        <View style={styles.detailIconContainer}>
          <MaterialCommunityIcons 
            name="bed" 
            size={16} 
            color={theme.colors.onSurfaceVariant}
          />
        </View>
        <View style={styles.detailTextContainer}>
          <Text variant="bodyMedium" style={styles.detailLabel}>Rooms</Text>
          <Text 
            variant="bodyMedium" 
            numberOfLines={1}
            style={styles.detailValue}
          >
            {details.rooms}
          </Text>
        </View>
      </View>

      <View style={styles.detail}>
        <View style={styles.detailIconContainer}>
          <MaterialCommunityIcons 
            name="calendar" 
            size={16} 
            color={theme.colors.onSurfaceVariant}
          />
        </View>
        <View style={styles.detailTextContainer}>
          <Text variant="bodyMedium" style={styles.detailLabel}>Year Built</Text>
          <Text 
            variant="bodyMedium" 
            numberOfLines={1}
            style={styles.detailValue}
          >
            {details.year}
          </Text>
        </View>
      </View>
      
      <View style={styles.detail}>
        <View style={styles.detailIconContainer}>
          <MaterialCommunityIcons 
            name="ruler-square" 
            size={16} 
            color={theme.colors.onSurfaceVariant}
          />
        </View>
        <View style={styles.detailTextContainer}>
          <Text variant="bodyMedium" style={styles.detailLabel}>Size</Text>
          <Text 
            variant="bodyMedium" 
            numberOfLines={1}
            style={styles.detailValue}
          >
            {details.size.value} {details.size.unit}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <Pressable onPress={() => router.push({
      pathname: '/PostDetails',
      params: { post: JSON.stringify(post) }
    })}>
      <Card style={styles.card} mode="elevated">
        <Card.Cover source={{ uri: post.images[0] }} style={styles.cardImage} />
        <Card.Content style={styles.cardContent}>
          <View style={styles.priceRow}>
            <Text 
              variant="headlineSmall" 
              numberOfLines={1}
              style={{ color: theme.colors.primary }}
            >
              {formatPrice(post.price, post.currency)}
            </Text>
            <Chip 
              mode="flat" 
              style={{ backgroundColor: theme.colors.primaryContainer }}
            >
              {post.listing_type === 'rent' ? 'Rent' : 'Sale'}
            </Chip>
          </View>
          
          <Text 
            variant="titleLarge" 
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
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  cardImage: {
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  cardContent: {
    paddingTop: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  detail: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 1,
  },
  detailValue: {
    color: '#666',
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    color: '#999',
  },
}); 