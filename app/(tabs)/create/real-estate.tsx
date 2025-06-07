import { View, StyleSheet, Alert, } from 'react-native';
import React, { useState } from 'react';
import { Button, Text, Card, useTheme, TextInput, } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '../../../supabaseClient';
import { useAuthStore } from '../../../store/useAuthStore';
import * as ImagePicker from 'expo-image-picker';
import LoadingScreen from '../../../components/LoadingScreen';
import DropdownComponent from '../../../components/Dropdown';
import { uploadToCloudinary } from '../../../lib/cloudinary';
import Header from '../../../components/Header';
import FeaturesSection from '../../../components/forms/FeaturesSection';
import { RealEstateFormData, FormErrors, transformRealEstateForm } from '../../../types/forms';
import { 
  YEARS, 
  REAL_ESTATE_CATEGORIES,
  REAL_ESTATE_CONDITION,
  PROPERTY_FEATURES,
  CITIES
} from '../../../constants/FormOptions';
import BasePostForm from '../../../components/forms/BasePostForm';

const initialFormState: RealEstateFormData = {
  title: '',
  description: '',
  price: '',
  currency: 'USD',
  location: {
    city: '',
    address: null,
    country: 'AF',
  },
  images: [],
  listingType: 'sale',
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
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formState, setFormState] = useState<RealEstateFormData>(initialFormState);
  const [errors, setErrors] = useState<FormErrors>({});

  const handlePickImage = async () => {
    if (formState.images.length >= 5) {
      Alert.alert('Limit Reached', 'You can only select up to 5 images.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.1,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0] && result.assets[0].base64) {
        setFormState(prev => ({
          ...prev,
          images: [...prev.images, result.assets[0].base64 as string]
        }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormState(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleInputChange = (field: keyof RealEstateFormData, value: string | string[]) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleLocationChange = (field: keyof RealEstateFormData['location'], value: string) => {
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
    if (!formState.rooms) newErrors.rooms = 'Number of rooms is required';
    if (!formState.size.value) newErrors.size = 'Size is required';
    if (!formState.bathrooms) newErrors.bathrooms = 'Number of bathrooms is required';
    if (!formState.constructionYear) newErrors.constructionYear = 'Construction year is required';
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
      const uploadedUrls = await Promise.all(
        formState.images.map(base64Image => 
          uploadToCloudinary(`data:image/jpeg;base64,${base64Image}`)
        )
      );

      const { data, error } = await supabase
        .from('posts')
        .insert([{
          user_id: user?.id,
          post_type: 'realestate',
          title: formState.title,
          description: formState.description,
          price: parseFloat(formState.price),
          currency: formState.currency,
          listing_type: formState.listingType,
          category: formState.category,
          location: formState.location,
          images: uploadedUrls,
          details: transformRealEstateForm(formState),
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      
      Alert.alert('Success', 'Real estate post created successfully!');
      router.back();
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPropertyFields = () => (
    <Card style={styles.card}>
      <Card.Content style={styles.formContainer}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Property Details</Text>
        
        <DropdownComponent
          data={REAL_ESTATE_CATEGORIES.map(category => ({ label: category, value: category }))}
          value={formState.category}
          onChange={(value: string | null) => handleInputChange('category', value || '')}
          placeholder="Property Type"
          error={errors.category}
        />

        <TextInput
          label="Number of Rooms"
          value={formState.rooms}
          onChangeText={text => handleInputChange('rooms', text)}
          keyboardType="numeric"
          error={!!errors.rooms}
          style={styles.input}
        />

        <TextInput
          label="Number of Bathrooms"
          value={formState.bathrooms}
          onChangeText={text => handleInputChange('bathrooms', text)}
          keyboardType="numeric"
          error={!!errors.bathrooms}
          style={styles.input}
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
          style={styles.input}
        />

        <DropdownComponent
          data={YEARS.map(year => ({ label: year, value: year }))}
          value={formState.constructionYear}
          onChange={(value: string | null) => handleInputChange('constructionYear', value || '')}
          placeholder="Construction Year"
          error={errors.constructionYear}
        />

        <DropdownComponent
          data={REAL_ESTATE_CONDITION.map(cond => ({ label: cond, value: cond }))}
          value={formState.condition}
          onChange={(value: string | null) => handleInputChange('condition', value || '')}
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
            handleInputChange('features', newFeatures);
          }}
        />
      </Card.Content>
    </Card>
  );

  if (loading) {
    return <LoadingScreen message="Creating your post..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Create Real Estate Post" />
      <BasePostForm<RealEstateFormData>
        title="Create Real Estate Post"
        formState={formState}
        errors={errors}
        onInputChange={handleInputChange}
        onLocationChange={handleLocationChange}
        onPickImage={handlePickImage}
        onRemoveImage={handleRemoveImage}
        maxImages={3}
      >
        {renderPropertyFields()}
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
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
}); 