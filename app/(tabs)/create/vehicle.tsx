import { View, StyleSheet, Alert } from 'react-native';
import React, { useState } from 'react';
import { TextInput, Button, Card, Text, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuthStore } from '../../../store/useAuthStore';
import DropdownComponent from '../../../components/Dropdown';
import { uploadToCloudinary } from '../../../lib/cloudinary';
import Header from '../../../components/Header';
import BasePostForm from '../../../components/forms/BasePostForm';
import FeaturesSection from '../../../components/forms/FeaturesSection';
import { VehicleFormData, FormErrors, transformVehicleForm } from '../../../types/forms';
import * as ImagePicker from 'expo-image-picker';
import LoadingScreen from '../../../components/LoadingScreen';
import { supabase } from '../../../supabaseClient';
import {
  MAKES,
  YEARS,
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_FEATURES,
  VEHICLE_CONDITION,
  VEHICLE_CATEGORIES,
} from '../../../constants/FormOptions';

const initialState: VehicleFormData = {
  title: '',
  description: '',
  price: '',
  currency: 'USD',
  images: [],
  listingType: 'sale',
  category: '',
  location: {
    city: '',
    address: null,
    country: 'AF'
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
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formState, setFormState] = useState<VehicleFormData>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});

  const handlePickImage = async () => {
    if (formState.images.length >= 3) {
      Alert.alert('Limit Reached', 'You can only select up to 3 images.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.3,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]?.base64) {
        const base64Image = result.assets[0].base64;
        if (base64Image) {
          setFormState(prev => ({
            ...prev,
            images: [...prev.images, base64Image]
          }));
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormState((prev: VehicleFormData) => ({
      ...prev,
      images: prev.images.filter((_: string, i: number) => i !== index)
    }));
  };

  const handleInputChange = (field: keyof VehicleFormData, value: string | string[]) => {
    setFormState((prev: VehicleFormData) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev: FormErrors) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleLocationChange = (field: keyof VehicleFormData['location'], value: string) => {
    setFormState(prev => ({
      ...prev,
      location: { ...prev.location, [field]: value }
    }));
    if (errors[`location.${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`location.${field}`];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formState.title) newErrors.title = 'Title is required';
    if (!formState.description) newErrors.description = 'Description is required';
    if (!formState.price) newErrors.price = 'Price is required';
    if (!formState.location.city) newErrors['location.city'] = 'City is required';
    if (!formState.listingType) newErrors.listingType = 'Listing type is required';
    if (!formState.category) newErrors.category = 'Category is required';
    if (!formState.make) newErrors.make = 'Make is required';
    if (!formState.model) newErrors.model = 'Model is required';
    if (!formState.year) newErrors.year = 'Year is required';
    if (!formState.mileage) newErrors.mileage = 'Mileage is required';
    if (!formState.fuelType) newErrors.fuelType = 'Fuel type is required';
    if (!formState.transmission) newErrors.transmission = 'Transmission is required';
    if (!formState.condition) newErrors.condition = 'Condition is required';
    if (formState.images.length === 0) newErrors.images = 'At least one image is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // First test if we can connect to Supabase
      const testQuery = await supabase.from('posts').select('id').limit(1);
      if (testQuery.error) {
        throw new Error(`Supabase connection test failed: ${testQuery.error.message}`);
      }

      const uploadedUrls = await Promise.all(
        formState.images.map(base64Image => 
          uploadToCloudinary(`data:image/jpeg;base64,${base64Image}`)
        )
      );

      // Log the data we're about to send
      const postData = {
        user_id: user?.id,
        post_type: 'vehicle',
        title: formState.title,
        description: formState.description,
        price: parseFloat(formState.price),
        currency: formState.currency,
        listing_type: formState.listingType,
        category: formState.category,
        location: {
          city: formState.location.city,
          address: formState.location.address || undefined,
          country: formState.location.country || 'AF'
        },
        images: uploadedUrls,
        details: transformVehicleForm(formState),
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
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
      
      Alert.alert('Success', 'Vehicle post created successfully!');
      router.back();
    } catch (error) {
      console.error('Error creating post:', error);
      // More detailed error message
      Alert.alert(
        'Error', 
        `Failed to create post. ${error instanceof Error ? error.message : 'Please check your network connection and try again.'}`
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Creating your post..." />;
  }

  const renderVehicleFields = () => (
    <Card style={styles.card}>
      <Card.Content style={styles.formContainer}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Vehicle Details</Text>
        
        <DropdownComponent
          data={VEHICLE_CATEGORIES.map(category => ({ label: category, value: category }))}
          value={formState.category}
          onChange={(value: string | null) => handleInputChange('category', value || '')}
          placeholder="Vehicle Category"
          error={errors.category}
        />

        <DropdownComponent
          data={MAKES.map(make => ({ label: make, value: make }))}
          value={formState.make}
          onChange={(value: string | null) => handleInputChange('make', value || '')}
          placeholder="Make"
          error={errors.make}
        />

        <TextInput
          label="Model"
          value={formState.model}
          onChangeText={text => handleInputChange('model', text)}
          error={!!errors.model}
          style={styles.input}
        />

        <DropdownComponent
          data={YEARS.map(year => ({ label: year, value: year }))}
          value={formState.year}
          onChange={(value: string | null) => handleInputChange('year', value || '')}
          placeholder="Year"
          error={errors.year}
        />

        <TextInput
          label="Mileage (km)"
          value={formState.mileage}
          onChangeText={text => handleInputChange('mileage', text)}
          keyboardType="numeric"
          error={!!errors.mileage}
          style={styles.input}
        />

        <DropdownComponent
          data={FUEL_TYPES.map(type => ({ label: type, value: type }))}
          value={formState.fuelType}
          onChange={(value: string | null) => handleInputChange('fuelType', value || '')}
          placeholder="Fuel Type"
          error={errors.fuelType}
        />

        <DropdownComponent
          data={TRANSMISSIONS.map(trans => ({ label: trans, value: trans }))}
          value={formState.transmission}
          onChange={(value: string | null) => handleInputChange('transmission', value || '')}
          placeholder="Transmission"
          error={errors.transmission}
        />

        <DropdownComponent
          data={VEHICLE_CONDITION.map(cond => ({ label: cond, value: cond }))}
          value={formState.condition}
          onChange={(value: string | null) => handleInputChange('condition', value || '')}
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
            handleInputChange('features', newFeatures);
          }}
        />
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Create Vehicle Post" />
      <BasePostForm<VehicleFormData>
        title="Create Vehicle Post"
        formState={formState}
        errors={errors}
        onInputChange={handleInputChange}
        onLocationChange={handleLocationChange}
        onPickImage={handlePickImage}
        onRemoveImage={handleRemoveImage}
        maxImages={3}
      >
        {renderVehicleFields()}
      </BasePostForm>
      <Button
        mode="contained"
        onPress={handleSubmit}
        style={styles.submitButton}
      >
        Create Post
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    marginBottom: 16,
  },
  formContainer: {
    gap: 8,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  input: {
    marginBottom: 4,
  },
  submitButton: {
    margin: 16,
    height: 50,
    justifyContent: 'center',
  },
}); 