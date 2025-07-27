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
import { Post, VehicleDetails, RealEstateDetails, CarouselRenderItemInfo, IconName } from '../types/database';
import { useSavePost } from '../lib/hooks/useSavePost';
import { Platform } from 'react-native';
import ReportPostModal from '../components/ReportPostModal';

const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export default function PostDetails() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [featuresExpanded, setFeaturesExpanded] = useState(false);
  const width = Dimensions.get('window').width;
  const { user } = useAuthStore();
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Use shared save post hook
  const { isSaved, saving, handleSavePost } = useSavePost({
    postId: post?.id || '',
    userId: post?.user_id || '',
    showAuthDialog: () => setShowSaveDialog(true),
    showSuccessAlerts: false
  });

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
          "You cannot message this seller."
        );
        return;
      }

      // Navigate to ChatRoom with post and seller info for conversation creation
      router.push({
        pathname: "/ChatRoom",
        params: { 
          postId: post.id,
          sellerId: post.user.id,
          sellerName: post.user.full_name || post.user.username,
          sellerAvatar: post.user.avatar_url || '',
          postTitle: post.title,
          postImage: post.images?.[0] || '',
          postPrice: post.price.toString(),
          postCurrency: post.currency
        }
      });
    } catch (error) {
      console.error('Error preparing to message seller:', error);
      Alert.alert("Error", "Failed to open chat. Please try again.");
    }
  };

  const handleLogin = () => {
    setShowContactDialog(false);
    setShowSaveDialog(false);
    router.push('/(auth)/login');
  };

  const handleContinueAsGuest = () => {
    setShowContactDialog(false);
    setShowSaveDialog(false);
  };

  const handleReportPost = () => {
    if (!user) {
      setShowContactDialog(true);
      return;
    }
    setShowReportDialog(true);
  };

  const renderCarouselItem = ({ item }: CarouselRenderItemInfo) => (
    <View style={styles.carouselImageContainer}>
      <ExpoImage
        source={item}
        style={styles.carouselImage}
        contentFit="cover"
        transition={300}
        placeholder={blurhash}
        cachePolicy="memory-disk"
      />
    </View>
  );

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
            <Carousel
              loop
              width={width}
              height={300}
              data={post.images}
              scrollAnimationDuration={1000}
              renderItem={renderCarouselItem}
              defaultIndex={0}
              onSnapToItem={setCarouselIndex}
            />
            {/* Image count indicator */}
            {Array.isArray(post.images) && post.images.length > 1 && (
              <View style={styles.imageCountContainer}>
                <Text style={styles.imageCountText}>
                  {carouselIndex + 1}/{post.images.length}
                </Text>
              </View>
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
                icon={post.post_type === 'vehicle' ? 'car' : 'home'}
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
              {post.post_type === 'vehicle' ? 'Vehicle Details' : 'Property Details'}
            </Text>
            <View style={styles.detailsGrid}>
              {post.post_type === 'vehicle' ? (
                <>
                  <DetailItem icon="car" label="Make & Model" value={`${(post.details as VehicleDetails).make} ${(post.details as VehicleDetails).model}`} />
                  <DetailItem icon="calendar" label="Year" value={(post.details as VehicleDetails).year} />
                  <DetailItem icon="speedometer" label="Mileage" value={`${(post.details as VehicleDetails).mileage.value.toLocaleString()} ${(post.details as VehicleDetails).mileage.unit}`} />
                  <DetailItem icon="car-cog" label="Condition" value={(post.details as VehicleDetails).condition} />
                  <DetailItem icon="gas-station" label="Fuel Type" value={(post.details as VehicleDetails).fuel_type} />
                  <DetailItem icon="car-shift-pattern" label="Transmission" value={(post.details as VehicleDetails).transmission} />
                </>
              ) : (
                <>
                  <DetailItem icon="home" label="Property Type" value={post.category || 'Not specified'} />
                  <DetailItem icon="bed" label="Rooms" value={(post.details as RealEstateDetails).rooms.toString()} />
                  <DetailItem icon="shower" label="Bathrooms" value={(post.details as RealEstateDetails).bathrooms.toString()} />
                  <DetailItem icon="calendar" label="Year Built" value={(post.details as RealEstateDetails).year} />
                  <DetailItem icon="ruler-square" label="Size" value={`${(post.details as RealEstateDetails).size.value} ${(post.details as RealEstateDetails).size.unit}`} />
                  <DetailItem icon="home-variant" label="Condition" value={(post.details as RealEstateDetails).condition} />
                </>
              )}
            </View>
            {/* Features Chips */}
            {(post.details as any).features && (post.details as any).features.length > 0 && (
              <View style={styles.featuresContainer}>
                {featuresExpanded
                  ? (post.details as any).features.map((feature: string, index: number) => (
                      <Chip
                        key={index}
                        mode="outlined"
                        style={styles.featureChip}
                      >
                        {feature}
                      </Chip>
                    ))
                  : [
                      ...((post.details as any).features.slice(0, 3).map((feature: string, index: number) => (
                        <Chip
                          key={index}
                          mode="outlined"
                          style={styles.featureChip}
                        >
                          {feature}
                        </Chip>
                      ))),
                      (post.details as any).features.length > 3 && (
                        <Chip
                          key="expand"
                          mode="outlined"
                          style={[styles.featureChip, expandChipStyle]}
                          textStyle={expandChipTextStyle}
                          onPress={() => setFeaturesExpanded(true)}
                        >
                          +{(post.details as any).features.length - 3} more
                        </Chip>
                      )
                    ]
                }
                {featuresExpanded && (post.details as any).features.length > 3 && (
                  <Chip
                    key="collapse"
                    mode="outlined"
                    style={[styles.featureChip, expandChipStyle]}
                    textStyle={expandChipTextStyle}
                    onPress={() => setFeaturesExpanded(false)}
                  >
                    Show less
                  </Chip>
                )}
              </View>
            )}
            <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
            {/* Description */}
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface, fontSize: 16 }]}>Description</Text>
            <Text variant="bodyMedium" style={[styles.description, { color: theme.colors.onSurface, fontSize: 13 }]}>{post.description}</Text>
            <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
            {/* Seller Info Card */}
            {post?.user && (
              <Surface style={[styles.sellerCard, { backgroundColor: theme.colors.surface }] } elevation={2}>
                <View style={styles.sellerHeader}>
                  <View style={styles.sellerInfo}>
                    {post.user.avatar_url && (
                      <ExpoImage
                        source={post.user.avatar_url}
                        style={styles.avatar}
                        contentFit="cover"
                        transition={200}
                        placeholder={blurhash}
                        cachePolicy="memory-disk"
                      />
                    )}
                    <View>
                      <View style={styles.sellerNameRow}>
                        <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontSize: 14 }}>
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
                      <Text variant="bodySmall" style={[styles.userType, { color: theme.colors.onSurfaceVariant, fontSize: 12 }] }>
                        {post.user.user_type.charAt(0).toUpperCase() + post.user.user_type.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>
                
                {/* Report Button */}
                {user && user.id !== post.user.id && (
                  <Button
                    mode="outlined"
                    onPress={handleReportPost}
                    icon="flag"
                    style={[styles.reportButton, { borderColor: theme.colors.error }]}
                    textColor={theme.colors.error}
                  >
                    Report Post
                  </Button>
                )}
              </Surface>
            )}
          </View>
        </ScrollView>
        {/* Sticky Message Seller Button */}
        {post?.user && (
          <View style={[styles.stickyButtonContainer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.outline }] }>
            <Button
              mode="contained"
              onPress={handleMessageSeller}
              icon="message"
              style={styles.stickyButton}
              contentStyle={{ height: 48 }}
            >
              Message Seller
            </Button>
          </View>
        )}
      </View>
      <Portal>
        <Dialog visible={showContactDialog} onDismiss={() => setShowContactDialog(false)}>
          <Dialog.Title>Login Required</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              You need to be logged in to contact sellers. Would you like to login or continue browsing as a guest?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowContactDialog(false)}>Continue as Guest</Button>
            <Button mode="contained" onPress={handleLogin}>Login</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={showSaveDialog} onDismiss={() => setShowSaveDialog(false)}>
          <Dialog.Title>Login Required</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              You need to be logged in to save posts. Would you like to login or continue browsing as a guest?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSaveDialog(false)}>Continue as Guest</Button>
            <Button mode="contained" onPress={handleLogin}>Login</Button>
          </Dialog.Actions>
        </Dialog>
        
        {/* Report Post Modal */}
        <ReportPostModal
          visible={showReportDialog}
          onDismiss={() => setShowReportDialog(false)}
          postId={post?.id || ''}
          reporterId={user?.id || ''}
          postOwnerId={post?.user_id || ''}
          postTitle={post?.title || ''}
        />
      </Portal>
    </>
  );
}

// Helper component for details grid
const DetailItem = ({ icon, label, value }: { icon: IconName; label: string; value: string }) => {
  const theme = useTheme();
  return (
    <View style={styles.detailItem}>
      <View style={styles.detailHeader}>
        <MaterialCommunityIcons name={icon} size={18} color={theme.colors.primary} />
        <Text variant="bodySmall" style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant, fontSize: 12 }]}>{label}</Text>
      </View>
      <Text variant="bodyMedium" style={[styles.detailValue, { color: theme.colors.onSurface, fontSize: 13 }]}>{value}</Text>
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
    // backgroundColor set inline
    height: 300,
  },
  carouselImageContainer: {
    flex: 1,
    // backgroundColor set inline
  },
  carouselImage: {
    flex: 1,
    width: '100%',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
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
    // color set inline
  },
  date: {
    // color set inline
    marginTop: 4,
  },
  divider: {
    marginVertical: 16,
    // backgroundColor set inline
  },
  detailsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    // color set inline
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
    // color set inline
    marginLeft: 6,
  },
  detailValue: {
    fontWeight: '500',
    // color set inline
  },
  descriptionSection: {
    marginBottom: 24,
  },
  description: {
    lineHeight: 24,
    // color set inline
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
    // color set inline
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
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  priceText: {
    fontSize: 24,
    fontWeight: 'bold',
    // color set inline
  },
  listingTypeChip: {
    // backgroundColor set inline
    marginLeft: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stickyButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // backgroundColor set inline
    padding: 16,
    borderTopWidth: 1,
    // borderTopColor set inline
    zIndex: 10,
  },
  stickyButton: {
    borderRadius: 8,
  },
  sellerCard: {
    padding: 16,
    borderRadius: 12,
    // backgroundColor set inline
    marginBottom: 24,
  },
  imageCountContainer: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 5,
  },
  imageCountText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  reportButton: {
    marginTop: 12,
    borderWidth: 1,
  },
});
