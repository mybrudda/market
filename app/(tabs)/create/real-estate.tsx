import { View } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Button, Text, Card, useTheme, TextInput } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import RequireAuth from '../../../components/auth/RequireAuth';
import LoadingScreen from '../../../components/ui/LoadingScreen';
import DropdownComponent from '../../../components/ui/Dropdown';
import Header from '../../../components/layout/Header';
import FeaturesSection from '../../../components/forms/FeaturesSection';
import { RealEstateFormData, transformRealEstateForm, validateRealEstateForm, VALIDATION_LIMITS } from '../../../types/forms';
import { 
  YEARS, 
  REAL_ESTATE_CATEGORIES,
  REAL_ESTATE_CONDITION,
  PROPERTY_FEATURES,
  CITIES
} from '../../../constants/FormOptions';
import BasePostForm from '../../../components/forms/BasePostForm';
import { usePostForm } from '../../../lib/hooks/usePostForm';
import { usePostUpdate } from '../../../lib/hooks/usePostUpdate';
import { formStyles } from '../../../constants/formStyles';
import { Post } from '../../../types/database';

import { DEFAULT_FORM_VALUES } from '../../../types/forms';

const initialFormState: RealEstateFormData = {
  title: '',
  description: '',
  price: '',
  currency: DEFAULT_FORM_VALUES.CURRENCY,
  location: {
    city: '',
    address: null,
    country: DEFAULT_FORM_VALUES.COUNTRY,
  },
  images: [],
  listingType: DEFAULT_FORM_VALUES.LISTING_TYPE,
  category: '',
  condition: '',
  size: {
    value: '',
    unit: 'm²'
  },
  rooms: '',
  bathrooms: '',
  constructionYear: '',
  features: [],
};

export default function CreateRealEstatePost() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const [formState, setFormState] = useState<RealEstateFormData>(initialFormState);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [postToUpdate, setPostToUpdate] = useState<Post | null>(null);

  // Check if we're in update mode
  useEffect(() => {
    if (params.mode === 'update' && params.post) {
      try {
        const postData = JSON.parse(params.post as string) as Post;
        setPostToUpdate(postData);
        setIsUpdateMode(true);
      } catch (error) {
        console.error('Error parsing post data:', error);
      }
    }
  }, [params.mode, params.post]);

  const {
    loading: createLoading,
    errors: createErrors,
    handlePickImage: createHandlePickImage,
    handleRemoveImage: createHandleRemoveImage,
    handleInputChange: createHandleInputChange,
    handleLocationChange: createHandleLocationChange,
    handleSubmit: createHandleSubmit
  } = usePostForm<RealEstateFormData>({
    postType: 'realestate',
    transformForm: transformRealEstateForm,
    validateForm: validateRealEstateForm,
    successMessage: 'Real estate post created successfully!'
  });

  const {
    loading: updateLoading,
    errors: updateErrors,
    initializeFormFromPost,
    handlePickImage: updateHandlePickImage,
    handleRemoveImage: updateHandleRemoveImage,
    handleInputChange: updateHandleInputChange,
    handleLocationChange: updateHandleLocationChange,
    handleUpdate
  } = usePostUpdate<RealEstateFormData>({
    postType: 'realestate',
    transformForm: transformRealEstateForm,
    validateForm: validateRealEstateForm,
    successMessage: 'Real estate post updated successfully!'
  });

  // Initialize form with post data if in update mode
  useEffect(() => {
    if (isUpdateMode && postToUpdate) {
      const initialFormData = initializeFormFromPost(postToUpdate);
      setFormState(initialFormData);
    }
  }, [isUpdateMode, postToUpdate]);

  // Use the appropriate handlers based on mode
  const loading = isUpdateMode ? updateLoading : createLoading;
  const errors = isUpdateMode ? updateErrors : createErrors;
  const handlePickImage = isUpdateMode ? updateHandlePickImage : createHandlePickImage;
  const handleRemoveImage = isUpdateMode ? updateHandleRemoveImage : createHandleRemoveImage;
  const handleInputChange = isUpdateMode ? updateHandleInputChange : createHandleInputChange;
  const handleLocationChange = isUpdateMode ? updateHandleLocationChange : createHandleLocationChange;

  const handleImagePick = () => {
    handlePickImage(formState.images, (images) => setFormState(prev => ({ ...prev, images })));
  };

  const handleImageRemove = (index: number) => {
    handleRemoveImage(index, formState.images, (images) => setFormState(prev => ({ ...prev, images })));
  };

  const handleFormInputChange = (field: keyof RealEstateFormData, value: string | string[]) => {
    handleInputChange(field, value, formState, setFormState);
  };

  const handleFormLocationChange = (field: keyof RealEstateFormData['location'], value: string) => {
    handleLocationChange(field, value, formState, setFormState);
  };

  const handleFormSubmit = () => {
    if (isUpdateMode && postToUpdate) {
      handleUpdate(formState, postToUpdate.id);
    } else {
      createHandleSubmit(formState);
    }
  };

  const renderPropertyFields = () => (
    <Card style={formStyles.card}>
      <Card.Content style={formStyles.formContainer}>
        <Text variant="titleMedium" style={formStyles.sectionTitle}>Property Details</Text>
        
        <DropdownComponent
          data={REAL_ESTATE_CATEGORIES.map(category => ({ label: category, value: category }))}
          value={formState.category}
          onChange={(value: string | null) => handleFormInputChange('category', value || '')}
          placeholder="Property Type"
          error={errors.category}
        />

        <TextInput
          label="Number of Rooms"
          value={formState.rooms}
          onChangeText={text => handleFormInputChange('rooms', text)}
          keyboardType="numeric"
          error={!!errors.rooms}
          style={formStyles.input}
        />

        <TextInput
          label="Number of Bathrooms"
          value={formState.bathrooms}
          onChangeText={text => handleFormInputChange('bathrooms', text)}
          keyboardType="numeric"
          error={!!errors.bathrooms}
          style={formStyles.input}
        />

        <TextInput
          label="Size (m²)"
          value={formState.size.value}
          onChangeText={text => setFormState(prev => ({
            ...prev,
            size: { ...prev.size, value: text }
          }))}
          keyboardType="numeric"
          error={!!errors.size}
          style={formStyles.input}
        />

        <DropdownComponent
          data={YEARS.map(year => ({ label: year, value: year }))}
          value={formState.constructionYear}
          onChange={(value: string | null) => handleFormInputChange('constructionYear', value || '')}
          placeholder="Construction Year"
          error={errors.constructionYear}
        />

        <DropdownComponent
          data={REAL_ESTATE_CONDITION.map(cond => ({ label: cond, value: cond }))}
          value={formState.condition}
          onChange={(value: string | null) => handleFormInputChange('condition', value || '')}
          placeholder="Condition"
          error={errors.condition}
        />

        <FeaturesSection
          features={PROPERTY_FEATURES}
          selectedFeatures={formState.features}
          onToggleFeature={(feature) => {
            const newFeatures = formState.features.includes(feature)
              ? formState.features.filter(f => f !== feature)
              : [...formState.features, feature];
            handleFormInputChange('features', newFeatures);
          }}
        />
      </Card.Content>
    </Card>
  );

  if (loading) {
    return <LoadingScreen message={isUpdateMode ? "Updating your post..." : "Creating your post..."} />;
  }

  return (
    <RequireAuth message="You need to be logged in to create a real estate listing.">
      <View style={[formStyles.container, { backgroundColor: theme.colors.background }]}>
        <Header title={isUpdateMode ? "Update Real Estate Post" : "Create Real Estate Post"} />
        <BasePostForm<RealEstateFormData>
          title={isUpdateMode ? "Update Real Estate Post" : "Create Real Estate Post"}
          formState={formState}
          errors={errors}
          onInputChange={handleFormInputChange}
          onLocationChange={handleFormLocationChange}
          onPickImage={handleImagePick}
          onRemoveImage={handleImageRemove}
          maxImages={VALIDATION_LIMITS.IMAGES_PER_POST}
        >
          {renderPropertyFields()}
        </BasePostForm>
        <Button
          mode="contained"
          onPress={handleFormSubmit}
          style={formStyles.submitButton}
        >
          {isUpdateMode ? "Update Post" : "Create Post"}
        </Button>
      </View>
    </RequireAuth>
  );
} 