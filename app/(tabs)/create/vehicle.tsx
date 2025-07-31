import { View } from 'react-native';
import React, { useState, useEffect } from 'react';
import { TextInput, Button, Card, Text, useTheme } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import RequireAuth from '../../../components/auth/RequireAuth';
import DropdownComponent from '../../../components/ui/Dropdown';
import Header from '../../../components/layout/Header';
import BasePostForm from '../../../components/forms/BasePostForm';
import FeaturesSection from '../../../components/forms/FeaturesSection';
import { VehicleFormData, transformVehicleForm, validateVehicleForm, VALIDATION_LIMITS } from '../../../types/forms';
import LoadingScreen from '../../../components/ui/LoadingScreen';
import { usePostForm } from '../../../lib/hooks/usePostForm';
import { usePostUpdate } from '../../../lib/hooks/usePostUpdate';
import { useVehicleModels } from '../../../lib/hooks/useVehicleModels';
import { formStyles } from '../../../constants/formStyles';
import { Post } from '../../../types/database';
import {
  MAKES,
  YEARS,
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_FEATURES,
  VEHICLE_CONDITION,
  VEHICLE_CATEGORIES,
} from '../../../constants/FormOptions';

import { DEFAULT_FORM_VALUES } from '../../../types/forms';

const initialState: VehicleFormData = {
  title: '',
  description: '',
  price: '',
  currency: DEFAULT_FORM_VALUES.CURRENCY,
  images: [],
  listingType: DEFAULT_FORM_VALUES.LISTING_TYPE,
  category: '',
  location: {
    city: '',
    address: null,
    country: DEFAULT_FORM_VALUES.COUNTRY
  },
  make: '',
  model: '',
  year: '',
  mileage: '',
  condition: '',
  fuelType: '',
  transmission: '',
  features: []
};

export default function CreateVehiclePost() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const [formState, setFormState] = useState<VehicleFormData>(initialState);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [postToUpdate, setPostToUpdate] = useState<Post | null>(null);
  const { models, loadingModels } = useVehicleModels(formState.make);

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
  } = usePostForm<VehicleFormData>({
    postType: 'vehicle',
    transformForm: transformVehicleForm,
    validateForm: validateVehicleForm,
    successMessage: 'Vehicle post created successfully!'
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
  } = usePostUpdate<VehicleFormData>({
    postType: 'vehicle',
    transformForm: transformVehicleForm,
    validateForm: validateVehicleForm,
    successMessage: 'Vehicle post updated successfully!'
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

  const handleFormInputChange = (field: keyof VehicleFormData, value: string | string[]) => {
    handleInputChange(field, value, formState, setFormState);
    
    // Clear model when make changes
    if (field === 'make') {
      setFormState(prev => ({ ...prev, model: '' }));
    }
  };

  const handleFormLocationChange = (field: keyof VehicleFormData['location'], value: string) => {
    handleLocationChange(field, value, formState, setFormState);
  };

  const handleFormSubmit = () => {
    if (isUpdateMode && postToUpdate) {
      handleUpdate(formState, postToUpdate.id);
    } else {
      createHandleSubmit(formState);
    }
  };

  if (loading) {
    return <LoadingScreen message={isUpdateMode ? "Updating your post..." : "Creating your post..."} />;
  }

  const renderVehicleFields = () => (
    <Card style={formStyles.card}>
      <Card.Content style={formStyles.formContainer}>
        <Text variant="titleMedium" style={formStyles.sectionTitle}>Vehicle Details</Text>
        
        <DropdownComponent
          data={VEHICLE_CATEGORIES.map(category => ({ label: category, value: category }))}
          value={formState.category}
          onChange={(value: string | null) => handleFormInputChange('category', value || '')}
          placeholder="Vehicle Category"
          error={errors.category}
        />

        <DropdownComponent
          data={MAKES.map(make => ({ label: make, value: make }))}
          value={formState.make}
          onChange={(value: string | null) => handleFormInputChange('make', value || '')}
          placeholder="Make"
          error={errors.make}
        />

        {/* Model Dropdown - disabled until make is selected */}
        <DropdownComponent
          data={models.map(model => ({ label: model.name, value: model.name }))}
          value={formState.model}
          onChange={(value: string | null) => handleFormInputChange('model', value || '')}
          placeholder={!formState.make ? "Select make first" : loadingModels ? "Loading models..." : "Model"}
          error={errors.model}
          disabled={!formState.make || loadingModels}
        />

        <DropdownComponent
          data={YEARS.map(year => ({ label: year, value: year }))}
          value={formState.year}
          onChange={(value: string | null) => handleFormInputChange('year', value || '')}
          placeholder="Year"
          error={errors.year}
        />

        <TextInput
          label="Mileage (km)"
          value={formState.mileage}
          onChangeText={text => handleFormInputChange('mileage', text)}
          keyboardType="numeric"
          error={!!errors.mileage}
          style={formStyles.input}
        />

        <DropdownComponent
          data={FUEL_TYPES.map(type => ({ label: type, value: type }))}
          value={formState.fuelType}
          onChange={(value: string | null) => handleFormInputChange('fuelType', value || '')}
          placeholder="Fuel Type"
          error={errors.fuelType}
        />

        <DropdownComponent
          data={TRANSMISSIONS.map(trans => ({ label: trans, value: trans }))}
          value={formState.transmission}
          onChange={(value: string | null) => handleFormInputChange('transmission', value || '')}
          placeholder="Transmission"
          error={errors.transmission}
        />

        <DropdownComponent
          data={VEHICLE_CONDITION.map(cond => ({ label: cond, value: cond }))}
          value={formState.condition}
          onChange={(value: string | null) => handleFormInputChange('condition', value || '')}
          placeholder="Condition"
          error={errors.condition}
        />

        <FeaturesSection
          features={VEHICLE_FEATURES}
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

  return (
    <RequireAuth message="You need to be logged in to create a vehicle listing.">
      <View style={[formStyles.container, { backgroundColor: theme.colors.background }]}>
        <Header title={isUpdateMode ? "Update Vehicle Post" : "Create Vehicle Post"} />
        <BasePostForm<VehicleFormData>
          title={isUpdateMode ? "Update Vehicle Post" : "Create Vehicle Post"}
          formState={formState}
          errors={errors}
          onInputChange={handleFormInputChange}
          onLocationChange={handleFormLocationChange}
          onPickImage={handleImagePick}
          onRemoveImage={handleImageRemove}
          maxImages={VALIDATION_LIMITS.IMAGES_PER_POST}
        >
          {renderVehicleFields()}
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