import { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/useAuthStore';
import { uploadToCloudinary } from '../cloudinary';
import { supabase } from '../../supabaseClient';
import { VALIDATION_LIMITS, BaseFormData, DEFAULT_FORM_VALUES } from '../../types/forms';

interface UsePostFormProps<T extends BaseFormData> {
  postType: string;
  transformForm: (formState: T) => Record<string, any>;
  validateForm: (formState: T) => Record<string, string>;
  successMessage: string;
}

/**
 * Error messages for common scenarios
 */
const ERROR_MESSAGES = {
  AUTHENTICATION_REQUIRED: 'Please login to create a post.',
  VALIDATION_FAILED: 'Please fill in all required fields',
  IMAGE_LIMIT_REACHED: (limit: number) => `You can only select up to ${limit} images.`,
  IMAGE_PICK_FAILED: 'Failed to pick image. Please try again.',
  POST_CREATION_FAILED: 'Failed to create post. Please check your network connection and try again.',
  SUPABASE_CONNECTION_FAILED: (error: string) => `Database connection failed: ${error}`,
} as const;

export function usePostForm<T extends BaseFormData>({
  postType,
  transformForm,
  validateForm,
  successMessage
}: UsePostFormProps<T>) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
        const newImages = [...images, result.assets[0].base64 as string];
        setImages(newImages);
        
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
      console.error('Error picking image:', error);
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

  const handleSubmit = async (formState: T) => {
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
    try {
      // First test if we can connect to Supabase
      const testQuery = await supabase.from('posts').select('id').limit(1);
      if (testQuery.error) {
        throw new Error(ERROR_MESSAGES.SUPABASE_CONNECTION_FAILED(testQuery.error.message));
      }

      const uploadedUrls = await Promise.all(
        formState.images.map((base64Image: string) => 
          uploadToCloudinary(`data:image/jpeg;base64,${base64Image}`)
        )
      );

      const postData = {
        user_id: user?.id,
        post_type: postType,
        title: formState.title,
        description: formState.description,
        price: parseFloat(formState.price),
        currency: formState.currency,
        listing_type: formState.listingType,
        category: formState.category,
        location: formState.location,
        images: uploadedUrls,
        details: transformForm(formState),
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expiry_date: new Date(Date.now() + DEFAULT_FORM_VALUES.POST_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()
      };

      console.log('Attempting to create post with data:', JSON.stringify(postData, null, 2));

      const { data, error } = await supabase
        .from('posts')
        .insert([postData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      Alert.alert('Success', successMessage);
      router.back();
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert(
        'Error', 
        `${ERROR_MESSAGES.POST_CREATION_FAILED} ${error instanceof Error ? error.message : ''}`
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    errors,
    handlePickImage,
    handleRemoveImage,
    handleInputChange,
    handleLocationChange,
    handleSubmit
  };
} 