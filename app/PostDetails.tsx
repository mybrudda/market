import { View, StyleSheet, ScrollView, Dimensions, Linking, Image, Alert, TouchableOpacity } from 'react-native';
import React, { useEffect, useState } from 'react';
import { Text, Surface, useTheme, ActivityIndicator, Button, Divider, Chip, Portal, Dialog, IconButton } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../supabaseClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Carousel from 'react-native-reanimated-carousel';
import Header from '../components/layout/Header';
import { useAuthStore } from '../store/useAuthStore';
import { Image as ExpoImage } from 'expo-image';
import { formatPrice, formatDate } from '../utils/format';
import { Post, VehicleDetails, CarouselRenderItemInfo, IconName } from '../types/database';
import { useSavePost } from '../lib/hooks/useSavePost';
import { Platform } from 'react-native';
import ReportPostModal from '../components/ReportPostModal';
import { getCloudinaryUrl } from '../lib/cloudinary';

const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

// Move DetailItem component outside to prevent hook recreation
const DetailItem = ({ icon, label, value }: { icon: IconName; label: string; value: string }) => {
  const theme = useTheme();
  return (
    <View style={styles.detailItem}>
      <MaterialCommunityIcons name={icon} size={20} color={theme.colors.onSurfaceVariant} />
      <View style={styles.detailTextContainer}>
        <Text variant="bodySmall" style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
          {label}
        </Text>
        <Text variant="bodyMedium" style={[styles.detailValue, { color: theme.colors.onSurface }]}>
          {value}
        </Text>
      </View>
    </View>
  );
};

export default function PostDetails() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [featuresExpanded, setFeaturesExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const width = Dimensions.get('window').width;
  const { user } = useAuthStore();
  const [carouselIndex, setCarouselIndex] = useState(0);
  
  // Memoize filtered images to avoid recalculating on every render
  const filteredImages = React.useMemo(() => {
    if (!post?.images) return [];
    // Convert image IDs to URLs
    return post.images
      .filter(img => img && img.trim() !== '')
      .map(imgId => getCloudinaryUrl(imgId, 'posts'))
      .filter(url => url !== null) as string[];
  }, [post?.images]);

  // Optimize carousel index update callback
  const handleSnapToItem = React.useCallback((index: number) => {
    setCarouselIndex(index);
  }, []);

  // Use shared save post hook
  const { isSaved, saving, handleSavePost } = useSavePost({
    postId: post?.id || '',
    userId: post?.user_id || '',
    showAuthDialog: () => setShowSaveDialog(true),
    showSuccessAlerts: false
  });

  // Move renderCarouselItem outside to prevent recreation
  const renderCarouselItem = React.useCallback(({ item }: CarouselRenderItemInfo) => (
    <View style={styles.carouselImageContainer}>
      <ExpoImage
        source={{ uri: item }}
        style={styles.carouselImage}
        contentFit="cover"
        transition={300}
        placeholder={blurhash}
        cachePolicy="memory-disk"
        onError={() => setImageError(true)}
      />
      {imageError && (
        <View style={[styles.errorOverlay, { backgroundColor: theme.colors.surfaceVariant }]}>
          <MaterialCommunityIcons name="image-off" size={48} color={theme.colors.onSurfaceVariant} />
          <Text style={[styles.imageErrorText, { color: theme.colors.onSurfaceVariant }]}>Image unavailable</Text>
        </View>
      )}
    </View>
  ), [imageError, theme.colors.surfaceVariant, theme.colors.onSurfaceVariant]);

  useEffect(() => {
    if (params.post) {
      try {
        const postData = JSON.parse(params.post as string) as Post;
        setPost(postData);
        setImageError(false); // Reset image error state when post changes
        setCarouselIndex(0); // Reset carousel index when post changes
        setLoading(false);
      } catch (error) {
        console.error('Error parsing post data:', error);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [params.post]);

  const handleMessageSeller = async () => {
    if (!post?.user?.id) return;

    if (!user) {
      setShowContactDialog(true);
      return;
    }

    // Prevent self-messaging
    if (user.id === post.user.id) {
      Alert.alert("Cannot Message", "You cannot message yourself on your own post");
      return;
    }

    try {
      // Check if the seller has blocked the current user
      const { data: isBlocked, error: blockCheckError } = await supabase
        .rpc('is_user_blocked', {
          blocker_id: post.user.id,
          blocked_id: user.id
        });

      if (blockCheckError) throw blockCheckError;

      if (isBlocked) {
        Alert.alert(
          "Cannot Message",
          "This user has blocked you. You cannot send them a message."
        );
        return;
      }

      // Check if the current user has blocked the seller
      const { data: hasBlocked, error: hasBlockedError } = await supabase
        .rpc('is_user_blocked', {
          blocker_id: user.id,
          blocked_id: post.user.id
        });

      if (hasBlockedError) throw hasBlockedError;

      if (hasBlocked) {
        Alert.alert(
          "Cannot Message",
          "You have blocked this user. Please unblock them to send a message."
        );
        return;
      }

      // Navigate to chat room
      router.push({
        pathname: "/ChatRoom",
        params: {
          postId: post.id,
          sellerId: post.user.id,
          sellerName: post.user.full_name,
          sellerAvatar: post.user.profile_image_id || '',
          postTitle: post.title,
          postImage: post.images[0],
          postPrice: post.price.toString(),
          postCurrency: post.currency,
        }
      });
    } catch (error) {
      console.error('Error checking block status:', error);
      Alert.alert("Error", "Failed to start conversation. Please try again.");
    }
  };

  const handleLogin = () => {
    setShowContactDialog(false);
    router.push('/(auth)/login');
  };

  const handleContinueAsGuest = () => {
    setShowContactDialog(false);
    // You can implement guest messaging logic here
    Alert.alert("Guest Mode", "Guest messaging is not available. Please log in to message sellers.");
  };

  const handleReportPost = () => {
    if (!user) {
      Alert.alert("Login Required", "Please log in to report posts");
      return;
    }
    setShowReportDialog(true);
  };

  const openInMaps = () => {
    if (!post) return;
    const address = encodeURIComponent(`${post.location.address || ''} ${post.location.city || ''}`.trim());
    const url = Platform.select({
      ios: `maps:0,0?q=${address}`,
      android: `geo:0,0?q=${address}`,
      default: `https://www.google.com/maps/search/?api=1&query=${address}`
    });
    if (url) Linking.openURL(url);
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

  const expandChipStyle = {
    backgroundColor: theme.colors.primaryContainer,
    borderColor: theme.colors.primary,
  };
  const expandChipTextStyle = {
    color: theme.colors.primary,
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Details" />
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Image Carousel */}
          <View style={[styles.carouselContainer, { backgroundColor: theme.colors.surface }]}>
            {(!filteredImages || filteredImages.length === 0) ? (
              <View style={[styles.errorOverlay, { backgroundColor: theme.colors.surfaceVariant }]}>
                <MaterialCommunityIcons name="image-off" size={48} color={theme.colors.onSurfaceVariant} />
                <Text style={[styles.imageErrorText, { color: theme.colors.onSurfaceVariant }]}>No images available</Text>
              </View>
            ) : (
              <>
                <Carousel
                  key={`carousel-${filteredImages.length}`}
                  loop
                  width={width}
                  height={300}
                  data={filteredImages}
                  scrollAnimationDuration={500}
                  renderItem={renderCarouselItem}
                  defaultIndex={0}
                  onSnapToItem={handleSnapToItem}
                />
                {/* Image count indicator */}
                {filteredImages.length > 1 && (
                  <View style={[styles.imageCountContainer, { backgroundColor: theme.colors.surfaceVariant + 'CC' }]}>
                    <Text style={[styles.imageCountText, { color: theme.colors.onSurfaceVariant }]}>
                      {carouselIndex + 1}/{filteredImages.length}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          <View style={styles.content}>
            {/* Title and Save Button */}
            <View style={styles.titleRow}>
              <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface, fontSize: 20 }]} numberOfLines={2} ellipsizeMode="tail">
                {post.title}
              </Text>
              <IconButton
                icon={isSaved ? "bookmark" : "bookmark-outline"}
                size={24}
                iconColor={isSaved ? theme.colors.error : theme.colors.primary}
                onPress={handleSavePost}
                disabled={saving || user?.id === post.user_id}
                loading={saving}
              />
            </View>
            {/* Price and Listing Type */}
            <View style={styles.priceRow}>
              <Text style={[styles.priceText, { color: theme.colors.onSurface, fontSize: 18 }]}>
                {formatPrice(post.price, post.currency)}
              </Text>
              <Chip 
                icon="car"
                mode="flat"
                style={[styles.listingTypeChip, { backgroundColor: theme.colors.primaryContainer }]}
              >
                {post.listing_type === 'rent' ? 'Rent' : 'Sale'}
              </Chip>
            </View>
            {/* Location and Date */}
            <View style={styles.metadataRow}>
              <TouchableOpacity style={styles.metadataItem} onPress={openInMaps}>
                <MaterialCommunityIcons 
                  name="map-marker" 
                  size={20} 
                  color={theme.colors.onSurfaceVariant} 
                />
                <Text variant="bodyMedium" style={[styles.metadataText, { color: theme.colors.onSurface, fontSize: 13 }]} numberOfLines={1}>
                  {post.location.city}
                  {post.location.address && `, ${post.location.address}`}
                </Text>
              </TouchableOpacity>
            </View>
            <Text variant="bodySmall" style={[styles.date, { color: theme.colors.onSurfaceVariant, fontSize: 12 }]}>
              Posted on {formatDate(post.created_at)}
            </Text>
            <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
            {/* Details Section */}
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface, fontSize: 16 }]}>
              Vehicle Details
            </Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailsRow}>
                <View style={styles.detailItemContainer}>
                  <DetailItem icon="car" label="Make & Model" value={`${post.details.make} ${post.details.model}`} />
                </View>
                <View style={styles.detailItemContainer}>
                  <DetailItem icon="calendar" label="Year" value={post.details.year} />
                </View>
              </View>
              <View style={styles.detailsRow}>
                <View style={styles.detailItemContainer}>
                  <DetailItem icon="speedometer" label="Mileage" value={`${post.details.mileage.value.toLocaleString()} ${post.details.mileage.unit}`} />
                </View>
                <View style={styles.detailItemContainer}>
                  <DetailItem icon="car-cog" label="Condition" value={post.details.condition} />
                </View>
              </View>
              <View style={styles.detailsRow}>
                <View style={styles.detailItemContainer}>
                  <DetailItem icon="gas-station" label="Fuel Type" value={post.details.fuel_type} />
                </View>
                <View style={styles.detailItemContainer}>
                  <DetailItem icon="car-shift-pattern" label="Transmission" value={post.details.transmission} />
                </View>
              </View>
            </View>
            {/* Features Chips */}
            {post.details.features && post.details.features.length > 0 && (
              <View style={styles.featuresContainer}>
                {featuresExpanded
                  ? post.details.features.map((feature: string, index: number) => (
                      <Chip
                        key={index}
                        mode="outlined"
                        style={styles.featureChip}
                      >
                        {feature}
                      </Chip>
                    ))
                  : [
                      ...(post.details.features.slice(0, 3).map((feature: string, index: number) => (
                        <Chip
                          key={index}
                          mode="outlined"
                          style={styles.featureChip}
                        >
                          {feature}
                        </Chip>
                      ))),
                      post.details.features.length > 3 && (
                        <Chip
                          key="expand"
                          mode="outlined"
                          style={[styles.featureChip, expandChipStyle]}
                          textStyle={expandChipTextStyle}
                          onPress={() => setFeaturesExpanded(true)}
                        >
                          +{post.details.features.length - 3} more
                        </Chip>
                      )
                    ].filter(Boolean)}
              </View>
            )}
            <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
            {/* Description */}
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface, fontSize: 16 }]}>
              Description
            </Text>
            <Text variant="bodyMedium" style={[styles.description, { color: theme.colors.onSurface }]}>
              {post.description}
            </Text>
            <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
            {/* Contact Section */}
            <View style={styles.contactSection}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface, fontSize: 16 }]}>
                Contact Seller
              </Text>
              <View style={styles.sellerInfo}>
                <View style={[styles.sellerAvatar, { backgroundColor: theme.colors.surfaceVariant }]}>
                  {post.user?.profile_image_id ? (
                    <ExpoImage
                      source={{ uri: getCloudinaryUrl(post.user.profile_image_id, 'avatars') || '' }}
                      style={styles.avatarImage}
                      contentFit="cover"
                      placeholder={blurhash}
                      onError={() => {
                        // Fallback to icon if image fails to load
                      }}
                    />
                  ) : (
                    <MaterialCommunityIcons name="account" size={24} color={theme.colors.onSurfaceVariant} />
                  )}
                </View>
                <View style={styles.sellerDetails}>
                  <Text variant="titleMedium" style={[styles.sellerName, { color: theme.colors.onSurface }]}>
                    {post.user?.full_name || 'Unknown Seller'}
                  </Text>
                  <Text variant="bodySmall" style={[styles.sellerLocation, { color: theme.colors.onSurfaceVariant }]}>
                    {post.location.city}
                  </Text>
                </View>
              </View>
              <View style={styles.actionButtons}>
                <Button
                  mode="contained"
                  icon="message"
                  onPress={handleMessageSeller}
                  style={styles.messageButton}
                  contentStyle={styles.buttonContent}
                >
                  Message Seller
                </Button>
                <Button
                  mode="outlined"
                  icon="flag"
                  onPress={handleReportPost}
                  style={[styles.reportButton, { borderColor: theme.colors.error }]}
                  contentStyle={styles.buttonContent}
                >
                  Report Post
                </Button>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Contact Dialog */}
      <Portal>
        <Dialog visible={showContactDialog} onDismiss={() => setShowContactDialog(false)}>
          <Dialog.Title>Contact Seller</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">You need to be logged in to message the seller.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowContactDialog(false)}>Cancel</Button>
            <Button onPress={handleLogin}>Login</Button>
            <Button onPress={handleContinueAsGuest}>Continue as Guest</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Save Dialog */}
      <Portal>
        <Dialog visible={showSaveDialog} onDismiss={() => setShowSaveDialog(false)}>
          <Dialog.Title>Login Required</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">You need to be logged in to save posts.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onPress={() => {
              setShowSaveDialog(false);
              router.push('/(auth)/login');
            }}>Login</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Report Post Modal */}
      <ReportPostModal
        visible={showReportDialog}
        onDismiss={() => setShowReportDialog(false)}
        postId={post.id}
        reporterId={user?.id || ''}
        postOwnerId={post.user_id}
        postTitle={post.title}
      />
    </>
  );
}

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
    padding: 20,
  },
  errorText: {
    marginVertical: 16,
    textAlign: 'center',
  },
  carouselContainer: {
    position: 'relative',
  },
  carouselImageContainer: {
    flex: 1,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  imageCountContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    // backgroundColor will be set dynamically with theme
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCountText: {
    // color will be set dynamically with theme
    fontSize: 12,
    fontWeight: 'bold',
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
  imageErrorText: {
    marginTop: 8,
    fontSize: 14,
  },
  content: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    marginRight: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceText: {
    fontWeight: 'bold',
  },
  listingTypeChip: {
    height: 24,
  },
  metadataRow: {
    marginBottom: 4,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataText: {
    marginLeft: 4,
  },
  date: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  detailsGrid: {
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItemContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  featureChip: {
    marginBottom: 4,
  },
  description: {
    lineHeight: 20,
    marginBottom: 16,
  },
  contactSection: {
    marginTop: 8,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    // backgroundColor will be set dynamically with theme
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  sellerLocation: {
    fontSize: 12,
  },
  actionButtons: {
    gap: 12,
  },
  messageButton: {
    marginBottom: 8,
  },
  reportButton: {
    // borderColor will be set dynamically with theme
  },
  buttonContent: {
    height: 48,
  },
});
