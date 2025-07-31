import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuthStore } from '../../store/useAuthStore';
import { uploadToCloudinary } from '../cloudinary';
import { supabase } from '../../supabaseClient';
import { VALIDATION_LIMITS, BaseFormData, DEFAULT_FORM_VALUES } from '../../types/forms';
import { Post, VehicleDetails, RealEstateDetails } from '../../types/database';

interface UsePostUpdateProps<T extends BaseFormData> {
  postType: string;
  transformForm: (formState: T) => Record<string, any>;
  validateForm: (formState: T) => Record<string, string>;
  successMessage: string;
}

interface ImageChange {
  type: 'added' | 'removed' | 'unchanged';
  url?: string;
  base64?: string;
  index: number;
}

/**
 * Error messages for common scenarios
 */
const ERROR_MESSAGES = {
  AUTHENTICATION_REQUIRED: 'Please login to update a post.',
  VALIDATION_FAILED: 'Please fill in all required fields',
  IMAGE_LIMIT_REACHED: (limit: number) => `You can only select up to ${limit} images.`,
  IMAGE_PICK_FAILED: 'Failed to pick image. Please try again.',
  POST_UPDATE_FAILED: 'Failed to update post. Please check your network connection and try again.',
  SUPABASE_CONNECTION_FAILED: (error: string) => `Database connection failed: ${error}`,
  POST_NOT_FOUND: 'Post not found or you do not have permission to update it.',
} as const;

// Helper function to extract Cloudinary public ID from URL
const extractCloudinaryPublicId = (url: string): string | null => {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
  return match?.[1] || null;
};

const resizeImage = async (base64Image: string): Promise<string> => {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      `data:image/jpeg;base64,${base64Image}`,
      [{ resize: { width: 800 } }],
      {
        compress: 0.5,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    if (manipResult.base64) {
      return manipResult.base64;
    } else {
      throw new Error('Failed to get base64 from manipulated image');
    }
  } catch (error) {
    console.error('Error resizing image:', error);
    throw new Error('Failed to resize image');
  }
};

export function usePostUpdate<T extends BaseFormData>({
  postType,
  transformForm,
  validateForm,
  successMessage
}: UsePostUpdateProps<T>) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageChanges, setImageChanges] = useState<ImageChange[]>([]);

  const initializeFormFromPost = useCallback((post: Post): T => {
    // Convert post data back to form format
    const formData = {
      title: post.title,
      description: post.description,
      price: post.price.toString(),
      currency: post.currency,
      images: post.images, // These are URLs, not base64
      listingType: post.listing_type as 'rent' | 'sale',
      category: post.category,
      location: post.location,
    } as T;

    // Add vehicle-specific fields if it's a vehicle post
    if (post.post_type === 'vehicle' && post.details) {
      const vehicleDetails = post.details as VehicleDetails;
      Object.assign(formData, {
        make: vehicleDetails.make,
        model: vehicleDetails.model,
        year: vehicleDetails.year,
        mileage: vehicleDetails.mileage.value.toString(),
        condition: vehicleDetails.condition,
        fuelType: vehicleDetails.fuel_type,
        transmission: vehicleDetails.transmission,
        features: vehicleDetails.features || [],
      });
    }

    // Add real estate-specific fields if it's a real estate post
    if (post.post_type === 'realestate' && post.details) {
      const realEstateDetails = post.details as RealEstateDetails;
      Object.assign(formData, {
        size: {
          value: realEstateDetails.size.value.toString(),
          unit: realEstateDetails.size.unit,
        },
        rooms: realEstateDetails.rooms.toString(),
        bathrooms: realEstateDetails.bathrooms.toString(),
        constructionYear: realEstateDetails.year,
        condition: realEstateDetails.condition,
        features: realEstateDetails.features || [],
      });
    }

    // Reset image changes tracking and initialize with current images
    const initialImageChanges: ImageChange[] = post.images.map((url, index) => ({
      type: 'unchanged',
      url,
      index,
    }));
    setImageChanges(initialImageChanges);

    return formData;
  }, []);

  const handlePickImage = async (
    images: string[],
    setImages: (images: string[]) => void
  ) => {
    if (images.length >= VALIDATION_LIMITS.IMAGES_PER_POST) {
      Alert.alert('Limit Reached', ERROR_MESSAGES.IMAGE_LIMIT_REACHED(VALIDATION_LIMITS.IMAGES_PER_POST));
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [...DEFAULT_FORM_VALUES.IMAGE_ASPECT],
        quality: DEFAULT_FORM_VALUES.IMAGE_QUALITY,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0] && result.assets[0].base64) {
        const resizedBase64 = await resizeImage(result.assets[0].base64 as string);
        const newImages = [...images, resizedBase64];
        setImages(newImages);
        
        // Track the new image as added
        const newImageChange: ImageChange = {
          type: 'added',
          base64: resizedBase64,
          index: images.length,
        };
        setImageChanges(prev => [...prev, newImageChange]);
        
        // Clear image error if images are now valid
        if (newImages.length >= VALIDATION_LIMITS.MIN_IMAGES && errors.images) {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.images;
            return newErrors;
          });
        }
      }
    } catch (error) {
      console.error('Error picking or resizing image:', error);
      Alert.alert('Error', ERROR_MESSAGES.IMAGE_PICK_FAILED);
    }
  };

  const handleRemoveImage = (
    index: number,
    images: string[],
    setImages: (images: string[]) => void
  ) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    
    // Track the removed image
    const removedImage = images[index];
    const isUrl = removedImage.startsWith('http');
    
    const newImageChange: ImageChange = {
      type: 'removed',
      url: isUrl ? removedImage : undefined,
      base64: !isUrl ? removedImage : undefined,
      index,
    };
    setImageChanges(prev => [...prev, newImageChange]);
    
    // Clear image error if images are still valid, or add error if now invalid
    if (newImages.length >= VALIDATION_LIMITS.MIN_IMAGES && errors.images) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.images;
        return newErrors;
      });
    } else if (newImages.length < VALIDATION_LIMITS.MIN_IMAGES && !errors.images) {
      setErrors(prev => ({
        ...prev,
        images: 'At least one image is required'
      }));
    }
  };

  const handleInputChange = (
    field: keyof T,
    value: string | string[],
    formState: T,
    setFormState: (state: T) => void
  ) => {
    setFormState({ ...formState, [field]: value });
    const fieldKey = String(field);
    if (errors[fieldKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };

  const handleLocationChange = (
    field: keyof T['location'],
    value: string,
    formState: T,
    setFormState: (state: T) => void
  ) => {
    setFormState({
      ...formState,
      location: { ...formState.location, [field]: value }
    });
    const locationFieldKey = `location.${String(field)}`;
    if (errors[locationFieldKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[locationFieldKey];
        return newErrors;
      });
    }
  };

  const validateFormData = (formState: T) => {
    const newErrors = validateForm(formState);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = async (formState: T, postId: string) => {
    if (!user) {
      Alert.alert('Authentication Required', ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
      router.push('/(auth)/login');
      return;
    }

    if (!validateFormData(formState)) {
      Alert.alert('Error', ERROR_MESSAGES.VALIDATION_FAILED);
      return;
    }

    setLoading(true);
    let uploadedUrls: string[] = [];
    
    try {
      // First test if we can connect to Supabase
      const testQuery = await supabase.from('posts').select('id').limit(1);
      if (testQuery.error) {
        throw new Error(ERROR_MESSAGES.SUPABASE_CONNECTION_FAILED(testQuery.error.message));
      }

      // Verify post ownership
      const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();
        
      if (fetchError || !post || post.user_id !== user.id) {
        Alert.alert('Error', ERROR_MESSAGES.POST_NOT_FOUND);
        return;
      }

      // Process image changes
      const imagesToUpload: string[] = [];
      const imagesToDelete: string[] = [];

      // Separate base64 images (new) from URLs (existing)
      const base64Images = formState.images.filter(img => !img.startsWith('http'));
      const urlImages = formState.images.filter(img => img.startsWith('http'));

      // Upload new base64 images
      if (base64Images.length > 0) {
        uploadedUrls = await Promise.all(
          base64Images.map((base64Image: string) => 
            uploadToCloudinary(`data:image/jpeg;base64,${base64Image}`)
          )
        );
        imagesToUpload.push(...uploadedUrls);
      }

      // Collect URLs of images to delete
      const removedImages = imageChanges.filter(change => change.type === 'removed' && change.url);
      if (removedImages.length > 0) {
        imagesToDelete.push(...removedImages.map(change => change.url!));
      }

      // Delete removed images from Cloudinary FIRST (before database update)
      let deletionResults = null;
      if (imagesToDelete.length > 0) {
        try {
          const { data: session } = await supabase.auth.getSession();
          if (!session.session?.access_token) {
            console.warn('No session token available for image deletion');
          } else {
            const response = await fetch(
              `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-images-cloudinary`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.session.access_token}`,
                },
                body: JSON.stringify({
                  imageUrls: imagesToDelete,
                  postId: postId
                }),
              }
            );

            if (!response.ok) {
              const errorText = await response.text();
              console.error('Failed to delete images from Cloudinary:', response.status, response.statusText, errorText);
            } else {
              const result = await response.json();
              console.log('Image deletion results:', result);
              deletionResults = result;
              
              // Show user feedback about deletion results
              if (result.results) {
                const { successful, failed } = result.results;
                if (successful.length > 0 && failed.length === 0) {
                  console.log(`Successfully deleted ${successful.length} images`);
                } else if (successful.length > 0 && failed.length > 0) {
                  console.log(`Partially successful: ${successful.length} deleted, ${failed.length} failed`);
                  console.log('Failed images:', failed);
                } else if (failed.length > 0) {
                  console.log(`Failed to delete ${failed.length} images:`, failed);
                }
              }
            }
          }
        } catch (deleteError) {
          console.error('Error deleting images from Cloudinary:', deleteError);
          // Don't throw error to avoid breaking the update flow
        }
      }

      // Build final images array based on deletion results
      let finalImages = [...urlImages, ...imagesToUpload];
      
      // If deletion was attempted, filter out failed deletions
      if (deletionResults && deletionResults.results) {
        const { successful, failed } = deletionResults.results;
        
        // Map failed publicIds back to URLs for comparison
        const failedPublicIds = failed.map((f: any) => f.publicId).filter(Boolean);
        const failedUrls = imagesToDelete.filter(url => {
          const publicId = extractCloudinaryPublicId(url);
          return publicId && failedPublicIds.includes(publicId);
        });
        
        // Keep failed deletions in the final images array
        finalImages = finalImages.filter(img => !failedUrls.includes(img));
        console.log(`Keeping ${failedUrls.length} failed deletions in database`);
      }

      const postData = {
        title: formState.title,
        description: formState.description,
        price: parseFloat(formState.price),
        currency: formState.currency,
        listing_type: formState.listingType,
        category: formState.category,
        location: formState.location,
        images: finalImages,
        details: transformForm(formState),
        updated_at: new Date().toISOString(),
      };

      console.log('Attempting to update post with data:', JSON.stringify(postData, null, 2));

      const { data, error } = await supabase
        .from('posts')
        .update(postData)
        .eq('id', postId)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      Alert.alert('Success', successMessage);
      router.back();
    } catch (error) {
      console.error('Error updating post:', error);
      
      // Rollback: Delete newly uploaded images if database update failed
      if (uploadedUrls.length > 0) {
        try {
          console.log('Rolling back uploaded images due to update failure');
          const { data: session } = await supabase.auth.getSession();
          if (session.session?.access_token) {
            await fetch(
              `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-images-cloudinary`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.session.access_token}`,
                },
                body: JSON.stringify({
                  imageUrls: uploadedUrls,
                  postId: postId
                }),
              }
            );
          }
        } catch (rollbackError) {
          console.error('Failed to rollback uploaded images:', rollbackError);
        }
      }
      
      Alert.alert(
        'Error', 
        `${ERROR_MESSAGES.POST_UPDATE_FAILED} ${error instanceof Error ? error.message : ''}`
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    errors,
    imageChanges,
    initializeFormFromPost,
    handlePickImage,
    handleRemoveImage,
    handleInputChange,
    handleLocationChange,
    handleUpdate
  };
} 