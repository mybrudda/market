import { View, StyleSheet, ScrollView, Dimensions, Linking, Image } from 'react-native';
import React, { useEffect, useState } from 'react';
import { Text, Surface, useTheme, ActivityIndicator, Button, Divider, Chip } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../supabaseClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Carousel from 'react-native-reanimated-carousel';
import Header from '../components/Header';
import { chatService } from '../lib/chatService';

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

interface Post {
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
  category?: string;
}

interface User {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  user_type: 'person' | 'company';
  is_verified: boolean | null;
}

interface CarouselRenderItemInfo {
  item: string;
  index: number;
}

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export default function PostDetails() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const width = Dimensions.get('window').width;

  useEffect(() => {
    if (params.post) {
      try {
        const postData = JSON.parse(params.post as string) as Post;
        setPost(postData);
        setLoading(false);
      } catch (error) {
        console.error('Error parsing post data:', error);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [params.post]);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleContact = async () => {
    if (!post?.user?.email) return;
    await Linking.openURL(`mailto:${post.user.email}`);
  };

  const handleMessageSeller = async () => {
    if (!post?.user?.id) return;
    try {
      const conversation = await chatService.createConversation(post.id, post.user.id);
      router.push({
        pathname: "/chat/[id]",
        params: { id: conversation.id }
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Header title="Details" />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Details" />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons 
            name="alert-circle" 
            size={48} 
            color={theme.colors.error} 
          />
          <Text variant="titleMedium" style={styles.errorText}>
            Post not found
          </Text>
          <Button mode="contained" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Details" />
      <ScrollView>
        {/* Image Carousel */}
        <View style={styles.carouselContainer}>
          <Carousel
            loop
            width={width}
            height={300}
            data={post.images}
            scrollAnimationDuration={1000}
            renderItem={({ item }: CarouselRenderItemInfo) => (
              <Image
                source={{ uri: item }}
                style={styles.carouselImage}
                resizeMode="cover"
              />
            )}
          />
        </View>

        <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.title}>
              {post.title}
            </Text>
            <View style={styles.priceContainer}>
              <Text variant="headlineLarge" style={{ color: theme.colors.primary }}>
                {formatPrice(post.price, post.currency)}
              </Text>
              <Chip 
                icon={post.post_type === 'vehicle' ? 'car' : 'home'}
                mode="flat"
                style={{ backgroundColor: theme.colors.primaryContainer }}
              >
                {post.listing_type === 'rent' ? 'Rent' : 'Sale'}
              </Chip>
            </View>
          </View>

          {/* Location and Date */}
          <View style={styles.metadata}>
            <View style={styles.metadataItem}>
              <MaterialCommunityIcons 
                name="map-marker" 
                size={20} 
                color={theme.colors.onSurfaceVariant} 
              />
              <Text variant="bodyLarge" style={styles.metadataText}>
                {post.location.city}
                {post.location.address && `, ${post.location.address}`}
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.date}>
              Posted on {formatDate(post.created_at)}
            </Text>
          </View>

          <Divider style={styles.divider} />

          {/* Dynamic Details Section */}
          {post.post_type === 'vehicle' ? (
            <View style={styles.detailsSection}>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Vehicle Details
              </Text>
              <View style={styles.detailsGrid}>
                <DetailItem 
                  icon="car" 
                  label="Make & Model" 
                  value={`${(post.details as VehicleDetails).make} ${(post.details as VehicleDetails).model}`} 
                />
                <DetailItem 
                  icon="calendar" 
                  label="Year" 
                  value={(post.details as VehicleDetails).year} 
                />
                <DetailItem 
                  icon="speedometer" 
                  label="Mileage" 
                  value={`${(post.details as VehicleDetails).mileage.value.toLocaleString()} ${(post.details as VehicleDetails).mileage.unit}`} 
                />
                <DetailItem 
                  icon="car-cog" 
                  label="Condition" 
                  value={(post.details as VehicleDetails).condition} 
                />
                <DetailItem 
                  icon="gas-station" 
                  label="Fuel Type" 
                  value={(post.details as VehicleDetails).fuel_type} 
                />
                <DetailItem 
                  icon="car-shift-pattern" 
                  label="Transmission" 
                  value={(post.details as VehicleDetails).transmission} 
                />
              </View>
              {(post.details as VehicleDetails).features && (post.details as VehicleDetails).features.length > 0 && (
                <>
                  <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: 16 }]}>
                    Features
                  </Text>
                  <View style={styles.featuresContainer}>
                    {(post.details as VehicleDetails).features.map((feature, index) => (
                      <Chip
                        key={index}
                        mode="outlined"
                        style={styles.featureChip}
                      >
                        {feature}
                      </Chip>
                    ))}
                  </View>
                </>
              )}
            </View>
          ) : (
            <View style={styles.detailsSection}>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Property Details
              </Text>
              <View style={styles.detailsGrid}>
                <DetailItem 
                  icon="home" 
                  label="Property Type" 
                  value={post.category || 'Not specified'} 
                />
                <DetailItem 
                  icon="bed" 
                  label="Rooms" 
                  value={(post.details as RealEstateDetails).rooms.toString()} 
                />
                <DetailItem 
                  icon="shower" 
                  label="Bathrooms" 
                  value={(post.details as RealEstateDetails).bathrooms.toString()} 
                />
                <DetailItem 
                  icon="calendar" 
                  label="Year Built" 
                  value={(post.details as RealEstateDetails).year} 
                />
                <DetailItem 
                  icon="ruler-square" 
                  label="Size" 
                  value={`${(post.details as RealEstateDetails).size.value} ${(post.details as RealEstateDetails).size.unit}`} 
                />
                <DetailItem 
                  icon="home-variant" 
                  label="Condition" 
                  value={(post.details as RealEstateDetails).condition} 
                />
              </View>
              {(post.details as RealEstateDetails).features && (post.details as RealEstateDetails).features.length > 0 && (
                <>
                  <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: 16 }]}>
                    Features
                  </Text>
                  <View style={styles.featuresContainer}>
                    {(post.details as RealEstateDetails).features.map((feature, index) => (
                      <Chip
                        key={index}
                        mode="outlined"
                        style={styles.featureChip}
                      >
                        {feature}
                      </Chip>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          <Divider style={styles.divider} />

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Description
            </Text>
            <Text variant="bodyLarge" style={styles.description}>
              {post.description}
            </Text>
          </View>

          {/* Contact Buttons */}
          {post?.user && (
            <View style={styles.contactSection}>
              <View style={styles.sellerHeader}>
                <View style={styles.sellerInfo}>
                  {post.user.avatar_url && (
                    <Image
                      source={{ uri: post.user.avatar_url }}
                      style={styles.avatar}
                    />
                  )}
                  <View>
                    <View style={styles.sellerNameRow}>
                      <Text variant="titleMedium">
                        {post.user.full_name || post.user.username}
                      </Text>
                      {post.user.is_verified && (
                        <MaterialCommunityIcons
                          name="check-decagram"
                          size={20}
                          color={theme.colors.primary}
                          style={styles.verifiedIcon}
                        />
                      )}
                    </View>
                    <Text variant="bodyMedium" style={styles.userType}>
                      {post.user.user_type.charAt(0).toUpperCase() + post.user.user_type.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.contactButtons}>
                <Button
                  mode="contained"
                  onPress={handleMessageSeller}
                  icon="message"
                  style={styles.contactButton}
                >
                  Message Seller
                </Button>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// Helper component for details grid
const DetailItem = ({ icon, label, value }: { icon: IconName; label: string; value: string }) => {
  const theme = useTheme();
  return (
    <View style={styles.detailItem}>
      <View style={styles.detailHeader}>
        <MaterialCommunityIcons name={icon} size={20} color={theme.colors.primary} />
        <Text variant="bodyMedium" style={styles.detailLabel}>{label}</Text>
      </View>
      <Text variant="bodyLarge" style={styles.detailValue}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    marginVertical: 16,
    textAlign: 'center',
  },
  carouselContainer: {
    backgroundColor: '#000',
  },
  carouselImage: {
    width: '100%',
    height: 300,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  metadata: {
    marginBottom: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metadataText: {
    marginLeft: 8,
  },
  date: {
    color: '#666',
    marginTop: 4,
  },
  divider: {
    marginVertical: 16,
  },
  detailsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  detailItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabel: {
    color: '#666',
    marginLeft: 6,
  },
  detailValue: {
    fontWeight: '500',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  description: {
    lineHeight: 24,
  },
  contactSection: {
    padding: 16,
  },
  sellerHeader: {
    marginBottom: 16,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  userType: {
    color: '#666',
    marginTop: 2,
  },
  contactButtons: {
    marginTop: 16,
  },
  contactButton: {
    paddingVertical: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  featureChip: {
    marginBottom: 8,
  },
});
