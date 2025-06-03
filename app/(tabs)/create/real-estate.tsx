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
  YEARS, 
  REAL_ESTATE_CATEGORIES,
  REAL_ESTATE_CONDITION,
  PROPERTY_FEATURES,
  CITIES
} from '../../../constants/FormOptions';

interface RealEstateFormData {
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
  size: {
    value: string;
    unit: string;
  };
  rooms: string;
  bathrooms: string;
  constructionYear: string;
  features: string[];
}

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
  listingType: '',
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
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleInputChange = (field: keyof RealEstateFormData, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleLocationChange = (field: keyof RealEstateFormData['location'], value: string) => {
    setFormState(prev => ({
      ...prev,
      location: { ...prev.location, [field]: value }
    }));
    if (errors[`location.${field}`]) {
      setErrors(prev => ({ ...prev, [`location.${field}`]: '' }));
    }
  };

  const toggleFeature = (feature: string) => {
    setFormState(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

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

      const postData = {
        user_id: user?.id,
        post_type: 'realestate',
        title: formState.title,
        description: formState.description,
        price: parseFloat(formState.price),
        currency: formState.currency,
        listing_type: formState.listingType,
        category: formState.category,
        location: {
          city: formState.location.city,
          address: formState.location.address || null,
          country: formState.location.country || "AF",
        },
        images: uploadedUrls,
        details: {
          size: {
            value: parseFloat(formState.size.value),
            unit: formState.size.unit,
          },
          rooms: parseInt(formState.rooms),
          bathrooms: parseInt(formState.bathrooms),
          year: formState.constructionYear,
          condition: formState.condition,
          features: formState.features,
        },
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const { data, error } = await supabase
        .from('posts')
        .insert([postData])
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

  if (loading) {
    return <LoadingScreen message="Creating your post..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Create Real Estate Post" />

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
            <Text variant="titleMedium" style={styles.sectionTitle}>Property Details</Text>
            
            <DropdownComponent
              data={REAL_ESTATE_CATEGORIES.map(category => ({ label: category, value: category }))}
              value={formState.category}
              onChange={value => handleInputChange('category', value)}
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
              label="Size"
              value={formState.size.value}
              onChangeText={text => setFormState(prev => ({
                ...prev,
                size: { ...prev.size, value: text }
              }))}
              keyboardType="numeric"
              error={!!errors.size}
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
              label="Construction Year"
              value={formState.constructionYear}
              onChangeText={text => handleInputChange('constructionYear', text)}
              keyboardType="numeric"
              error={!!errors.constructionYear}
              style={styles.input}
            />

            <DropdownComponent
              data={REAL_ESTATE_CONDITION.map(cond => ({ label: cond, value: cond }))}
              value={formState.condition}
              onChange={value => handleInputChange('condition', value)}
              placeholder="Condition"
              error={errors.condition}
            />

            <Text variant="titleSmall" style={styles.featuresTitle}>Features</Text>
            <View style={styles.checkboxContainer}>
              {PROPERTY_FEATURES.map((feature, index) => (
                <View key={feature} style={styles.checkboxWrapper}>
                  <Pressable 
                    style={styles.checkboxRow}
                    onPress={() => toggleFeature(feature)}
                  >
                    <Checkbox
                      status={formState.features.includes(feature) ? 'checked' : 'unchecked'}
                      onPress={() => toggleFeature(feature)}
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
              onChange={value => handleLocationChange('city', value)}
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
  featuresTitle: {
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
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
  submitButton: {
    marginTop: 8,
    marginBottom: 32,
    height: 50,
    justifyContent: 'center',
  },
  segmentedButton: {
    marginVertical: 8,
  },
}); 