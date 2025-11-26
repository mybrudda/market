import { View } from 'react-native';
import React, { useState, useEffect, useMemo } from 'react';
import { TextInput, Button, Card, Text, useTheme } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import RequireAuth from '../../../components/auth/RequireAuth';
import DropdownComponent from '../../../components/ui/Dropdown';
import Header from '../../../components/layout/Header';
import BasePostForm from '../../../components/forms/BasePostForm';
import { PostFormData, transformPostForm, validatePostForm, VALIDATION_LIMITS, DEFAULT_FORM_VALUES } from '../../../types/forms';
import LoadingScreen from '../../../components/ui/LoadingScreen';
import { usePostForm } from '../../../lib/hooks/usePostForm';
import { usePostUpdate } from '../../../lib/hooks/usePostUpdate';
import { useVehicleModels } from '../../../lib/hooks/useVehicleModels';
import { formStyles } from '../../../constants/formStyles';
import { Post } from '../../../types/database';
import {
  CATEGORY_OPTIONS,
  MAKES,
  YEARS,
  normalizeCategoryValue,
  getSubcategories,
  formatCategoryLabel,
} from '../../../constants/FormOptions';

const initialState: PostFormData = {
  title: '',
  description: '',
  price: '',
  currency: DEFAULT_FORM_VALUES.CURRENCY,
  images: [],
  listingType: DEFAULT_FORM_VALUES.LISTING_TYPE,
  category: 'vehicles',
  subcategory: '',
  location: {
    city: '',
    address: undefined,
    country: DEFAULT_FORM_VALUES.COUNTRY
  },
  make: '',
  model: '',
  year: '',
};

export default function CreatePostScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const [formState, setFormState] = useState<PostFormData>(initialState);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [postToUpdate, setPostToUpdate] = useState<Post | null>(null);
  const { models, loadingModels } = useVehicleModels(formState.category === 'vehicles' ? formState.make : '');

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

  useEffect(() => {
    if (isUpdateMode) return;
    if (typeof params.category !== 'string') return;

    const normalizedCategory = normalizeCategoryValue(params.category as string | undefined);
    setFormState(prev => {
      if (prev.category === normalizedCategory) {
        return prev;
      }
      return {
        ...prev,
        category: normalizedCategory,
        subcategory: '',
        make: '',
        model: '',
        year: '',
      };
    });
  }, [params.category, isUpdateMode]);

  const {
    loading: createLoading,
    errors: createErrors,
    handlePickImage: createHandlePickImage,
    handleRemoveImage: createHandleRemoveImage,
    handleInputChange: createHandleInputChange,
    handleLocationChange: createHandleLocationChange,
    handleSubmit: createHandleSubmit
  } = usePostForm<PostFormData>({
    postType: 'post',
    transformForm: transformPostForm,
    validateForm: validatePostForm,
    successMessage: 'Post created successfully!'
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
  } = usePostUpdate<PostFormData>({
    postType: 'post',
    transformForm: transformPostForm,
    validateForm: validatePostForm,
    successMessage: 'Post updated successfully!'
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

  const handleFormInputChange = (field: keyof PostFormData, value: string | string[]) => {
    handleInputChange(field, value, formState, setFormState);
    
    // Clear model when make changes
    if (field === 'make') {
      setFormState(prev => ({ ...prev, model: '' }));
    }

    if (field === 'category') {
      setFormState(prev => ({
        ...prev,
        subcategory: '',
        make: '',
        model: '',
        year: '',
      }));
    }
  };

  const handleFormLocationChange = (field: keyof PostFormData['location'], value: string) => {
    handleLocationChange(field, value, formState, setFormState);
  };

  const handleFormSubmit = () => {
    if (isUpdateMode && postToUpdate) {
      handleUpdate(formState, postToUpdate.id);
    } else {
      createHandleSubmit(formState);
    }
  };

  const isVehicleCategory = formState.category === 'vehicles';
  const pageTitle = isUpdateMode ? "Update Post" : "Create Post";
  const subcategoryOptions = useMemo(
    () => getSubcategories(formState.category).map(value => ({ label: formatCategoryLabel(value), value })),
    [formState.category]
  );
  const yearOptions = useMemo(
    () => [
      { label: 'Not Specified', value: '' },
      ...YEARS.map(year => ({ label: year, value: year }))
    ],
    []
  );

  if (loading) {
    return <LoadingScreen message={isUpdateMode ? "Updating your post..." : "Creating your post..."} />;
  }

  const renderCategoryFields = () => (
    <Card style={formStyles.card}>
      <Card.Content style={formStyles.formContainer}>
        <Text variant="titleMedium" style={formStyles.sectionTitle}>Category & Item Details</Text>

        <DropdownComponent
          data={CATEGORY_OPTIONS}
          value={formState.category}
          onChange={(value: string | null) =>
            handleFormInputChange('category', normalizeCategoryValue(value || undefined))
          }
          placeholder="Select category"
          error={errors.category}
        />

        <DropdownComponent
          data={subcategoryOptions}
          value={formState.subcategory}
          onChange={(value: string | null) => handleFormInputChange('subcategory', value || '')}
          placeholder={isVehicleCategory ? 'Vehicle Subcategory' : 'Item Subcategory'}
          error={errors.subcategory}
        />

        {isVehicleCategory ? (
          <>
            <DropdownComponent
              data={MAKES.map(make => ({ label: make, value: make }))}
              value={formState.make}
              onChange={(value: string | null) => handleFormInputChange('make', value || '')}
              placeholder="Make"
              error={errors.make}
            />

            <DropdownComponent
              data={models.map(model => ({ label: model.name, value: model.name }))}
              value={formState.model}
              onChange={(value: string | null) => handleFormInputChange('model', value || '')}
              placeholder={
                !formState.make
                  ? "Select make first"
                  : loadingModels
                    ? "Loading models..."
                    : "Model"
              }
              error={errors.model}
              disabled={!formState.make || loadingModels}
            />
          </>
        ) : (
          <>
            <TextInput
              label="Make / Brand"
              value={formState.make}
              onChangeText={(text) => handleFormInputChange('make', text)}
              error={!!errors.make}
              style={formStyles.input}
            />
            <TextInput
              label="Model / Variant"
              value={formState.model}
              onChangeText={(text) => handleFormInputChange('model', text)}
              error={!!errors.model}
              style={formStyles.input}
            />
          </>
        )}

        <DropdownComponent
          data={yearOptions}
          value={formState.year}
          onChange={(value: string | null) => handleFormInputChange('year', value || '')}
          placeholder="Year (optional)"
          error={errors.year}
        />

      </Card.Content>
    </Card>
  );

  return (
    <RequireAuth message="You need to be logged in to create a post.">
      <View style={[formStyles.container, { backgroundColor: theme.colors.background }]}>
        <Header title={pageTitle} />
        <BasePostForm<PostFormData>
          title={pageTitle}
          formState={formState}
          errors={errors}
          onInputChange={handleFormInputChange}
          onLocationChange={handleFormLocationChange}
          onPickImage={handleImagePick}
          onRemoveImage={handleImageRemove}
          maxImages={VALIDATION_LIMITS.IMAGES_PER_POST}
        >
          {renderCategoryFields()}
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