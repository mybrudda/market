import { View, ScrollView, StyleSheet, Alert, Pressable } from 'react-native';
import React, { useState } from 'react';
import { Button, Text, Card, useTheme, TextInput, HelperText, SegmentedButtons, Checkbox } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '../../../supabaseClient';
import { useAuthStore } from '../../../store/useAuthStore';
import * as ImagePicker from 'expo-image-picker';
import LoadingScreen from '../../../components/LoadingScreen';
import DropdownComponent from '../../../components/Dropdown';
import ImagePickerSection from '../../../components/ImagePickerSection';
import { uploadToCloudinary } from '../../../lib/cloudinary';
import Header from '../../../components/Header';
import { 
  MAKES, 
  YEARS, 
  FUEL_TYPES, 
  TRANSMISSIONS, 
  VEHICLE_CONDITION,
  VEHICLE_CATEGORIES,
  CITIES,
  VEHICLE_FEATURES
} from '../../../constants/FormOptions';

interface VehicleFormData {
  title: string;
  description: string;
  price: string;
  currency: string;
  location: {
    city: string;
    address?: string | null;
    country?: string;
  };
  images: string[];
  listingType: string;
  category: string;
  condition: string;
  make: string;
  model: string;
  year: string;
  mileage: string;
  fuelType: string;
  transmission: string;
  features: string[];
}

const initialFormState: VehicleFormData = {
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
  listingType: '',
  category: '',
  condition: '',
  make: '',
  model: '',
  year: '',
  mileage: '',
  fuelType: '',
  transmission: '',
  features: [],
};

export default function CreateVehiclePost() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formState, setFormState] = useState<VehicleFormData>(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handlePickImage = async () => {
    if (formState.images.length >= 3) {
      Alert.alert('Limit Reached', 'You can only select up to 3 images.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
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
    setFormState(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleInputChange = (field: keyof VehicleFormData, value: string | string[]) => {
    // Handle fields that can be null
    if (
      field === 'category' ||
      field === 'condition' ||
      field === 'make' ||
      field === 'year' ||
      field === 'fuelType' ||
      field === 'transmission'
    ) {
      setFormState(prev => ({ ...prev, [field]: value || null }));
    } else {
      setFormState(prev => ({ ...prev, [field]: value }));
    }
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleLocationChange = (field: keyof VehicleFormData['location'], value: string) => {
    setFormState(prev => ({
      ...prev,
      location: { ...prev.location, [field]: value || null }
    }));
    // Clear error when user starts typing
    if (errors[`location.${field}`]) {
      setErrors(prev => ({ ...prev, [`location.${field}`]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
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
      // Upload images to Cloudinary one by one
      const uploadedUrls = await Promise.all(
        formState.images.map(base64Image => 
          uploadToCloudinary(`data:image/jpeg;base64,${base64Image}`)
        )
      );

      // Create post in database
      const { data, error } = await supabase
        .from('posts')
        .insert([
          {
            user_id: user?.id,
            post_type: 'vehicle',
            title: formState.title,
            description: formState.description,
            price: parseFloat(formState.price),
            currency: formState.currency,
            listing_type: formState.listingType,
            category: formState.category,
            location: formState.location,
            images: uploadedUrls,
            details: {
              make: formState.make,
              model: formState.model,
              year: formState.year,
              mileage: {
                value: parseFloat(formState.mileage),
                unit: 'km',
              },
              condition: formState.condition,
              fuel_type: formState.fuelType,
              transmission: formState.transmission,
              features: formState.features,
            },
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      
      Alert.alert('Success', 'Vehicle post created successfully! You can submit again with the same data.');
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Creating your post..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.secondaryContainer }]}>
      <Header title="Create Vehicle Post" />

      {/* Scrollable Content */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <Card.Content style={styles.formContainer}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Basic Information</Text>
            
            <TextInput
              label="Title"
              value={formState.title}
              onChangeText={(text) => handleInputChange('title', text)}
              error={!!errors.title}
              style={styles.input}
            />
            {errors.title && (
              <HelperText type="error" visible={true}>
                {errors.title}
              </HelperText>
            )}

            <ImagePickerSection
              images={formState.images}
              onPickImage={handlePickImage}
              onRemoveImage={handleRemoveImage}
            />
            {errors.images && (
              <HelperText type="error" visible={true}>
                {errors.images}
              </HelperText>
            )}

            <SegmentedButtons
              value={formState.listingType}
              onValueChange={value => handleInputChange('listingType', value)}
              buttons={[
                { value: 'sale', label: 'For Sale' },
                { value: 'rent', label: 'For Rent' },
              ]}
              style={styles.segmentedButton}
            />
          </Card.Content>
        </Card>

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

            <Text variant="titleSmall" style={styles.featuresTitle}>Features</Text>
            <View style={styles.checkboxContainer}>
              {VEHICLE_FEATURES.map((feature, index) => (
                <View key={feature} style={styles.checkboxWrapper}>
                  <Pressable 
                    style={styles.checkboxRow}
                    onPress={() => {
                      const newFeatures = formState.features.includes(feature)
                        ? formState.features.filter(f => f !== feature)
                        : [...formState.features, feature];
                      handleInputChange('features', newFeatures);
                    }}
                  >
                    <Checkbox
                      status={formState.features.includes(feature) ? 'checked' : 'unchecked'}
                      onPress={() => {
                        const newFeatures = formState.features.includes(feature)
                          ? formState.features.filter(f => f !== feature)
                          : [...formState.features, feature];
                        handleInputChange('features', newFeatures);
                      }}
                    />
                    <Text style={styles.checkboxLabel}>{feature}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content style={styles.formContainer}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Location</Text>
            
            <DropdownComponent
              data={CITIES.map(city => ({ label: city, value: city }))}
              value={formState.location.city}
              onChange={(value: string | null) => handleLocationChange('city', value || '')}
              placeholder="City"
              error={errors['location.city']}
            />

            <TextInput
              label="Address (Optional)"
              value={formState.location.address || ''}
              onChangeText={text => handleLocationChange('address', text)}
              style={styles.input}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content style={styles.formContainer}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Price & Description</Text>
            
            <TextInput
              label="Price"
              value={formState.price}
              onChangeText={text => handleInputChange('price', text)}
              keyboardType="numeric"
              error={!!errors.price}
              style={styles.input}
            />

            <TextInput
              label="Description"
              value={formState.description}
              onChangeText={text => handleInputChange('description', text)}
              multiline
              numberOfLines={4}
              error={!!errors.description}
              style={styles.input}
            />
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.submitButton}
        >
          Create Post
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
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
    marginTop: 8,
    marginBottom: 32,
    height: 50,
    justifyContent: 'center',
  },
  segmentedButton: {
    marginVertical: 8,
  },
  featuresTitle: {
    marginTop: 8,
    marginBottom: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  checkboxWrapper: {
    width: '50%',
    paddingHorizontal: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  checkboxLabel: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
}); 