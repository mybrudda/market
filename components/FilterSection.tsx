import { View, StyleSheet, ScrollView, Animated, Dimensions } from 'react-native';
import React, { useState, useRef, useCallback } from 'react';
import { Text, Button, useTheme, Chip, TextInput, Divider, SegmentedButtons } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from 'rn-range-slider';
import Dropdown from './Dropdown';
import {
  CITIES,
  VEHICLE_CATEGORIES,
  REAL_ESTATE_CATEGORIES,
  MAKES,
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_CONDITION,
  PROPERTY_FEATURES,
  REAL_ESTATE_CONDITION,
} from '../constants/FormOptions';

type PostType = 'vehicle' | 'realestate';
type ListingType = 'rent' | 'sale';

interface FilterSectionProps {
  onSearch?: (query: string) => void;
}

export default function FilterSection({ onSearch }: FilterSectionProps) {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [postType, setPostType] = useState<PostType>('vehicle');
  const [listingType, setListingType] = useState<ListingType>('sale');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMake, setSelectedMake] = useState<string | null>(null);
  const [selectedFuelType, setSelectedFuelType] = useState<string | null>(null);
  const [transmission, setTransmission] = useState<'manual' | 'automatic' | ''>('');
  const [model, setModel] = useState('');
  const expandAnimation = useRef(new Animated.Value(0)).current;
  const { height: windowHeight } = Dimensions.get('window');

  const currentYear = new Date().getFullYear();
  const [lowYear, setLowYear] = useState(currentYear - 20);
  const [highYear, setHighYear] = useState(currentYear);

  const handleYearChange = useCallback((low: number, high: number) => {
    setLowYear(Math.floor(low));
    setHighYear(Math.floor(high));
  }, []);

  const handleSearch = useCallback(() => {
    onSearch?.(searchQuery);
  }, [searchQuery, onSearch]);

  const toggleExpand = () => {
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded(!isExpanded);
    
    Animated.spring(expandAnimation, {
      toValue,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  };

  const containerHeight = expandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [64, windowHeight * 0.7]
  });

  const rotateIcon = expandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const citiesData = CITIES.map(city => ({ label: city, value: city }));
  const vehicleCategoriesData = VEHICLE_CATEGORIES.map(category => ({ label: category, value: category }));
  const realEstateCategoriesData = REAL_ESTATE_CATEGORIES.map(category => ({ label: category, value: category }));
  const makesData = MAKES.map(make => ({ label: make, value: make }));
  const fuelTypesData = FUEL_TYPES.map(type => ({ label: type, value: type }));
  const transmissionsData = TRANSMISSIONS.map(transmission => ({ label: transmission, value: transmission }));

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      height: 64,
      gap: 8,
    },
    searchContainer: {
      flex: 1,
    },
    searchInput: {
      backgroundColor: 'transparent',
      height: 40,
      paddingLeft: 4,
    },
    expandButton: {
      borderRadius: 20,
      minWidth: 80,
      height: 36,
    },
    expandedContent: {
      flex: 1,
      paddingHorizontal: 16,
    },
    section: {
      marginVertical: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 8,
    },
    input: {
      flex: 1,
    },
    toText: {
      marginHorizontal: 4,
    },
    chipGroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 8,
      gap: 8,
    },
    chip: {
      marginRight: 8,
      marginBottom: 8,
    },
    divider: {
      marginVertical: 6,
    },
    segmentedButton: {
      marginTop: 4,
    },
    topGap: {
      marginTop: 8,
    },
    dropdownGroup: {
      gap: 8,
      marginTop: 8,
    },
    scrollContent: {
      paddingBottom: 24,
    },
    yearContainer: {
      marginTop: 16,
      marginHorizontal: 8,
    },
    yearLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    yearText: {
      textAlign: 'center',
      fontSize: 20,
      fontWeight: '600',
    },
    sliderContainer: {
      paddingHorizontal: 14,
    },
    slider: {
      height: 60,
    },
    thumb: {
      width: 28,
      height: 28,
      borderRadius: 14,
      elevation: 3,
    },
    rail: {
      flex: 1,
      height: 6,
      borderRadius: 3,
    },
    railSelected: {
      height: 6,
      borderRadius: 3,
    },
    transmissionContainer: {
      marginTop: 16,
    },
    transmissionLabel: {
      marginBottom: 8,
    },
  });

  const renderCommonInputs = () => (
    <>
      {/* Listing Type */}
      <View style={styles.section}>
        <Text variant="titleSmall">Listing Type</Text>
        <SegmentedButtons
          value={listingType}
          onValueChange={value => setListingType(value as ListingType)}
          buttons={[
            { value: 'sale', label: 'Sale' },
            { value: 'rent', label: 'Rent' },
          ]}
          style={styles.segmentedButton}
        />
      </View>

      <Divider style={styles.divider} />

      {/* Post Type */}
      <View style={styles.section}>
        <Text variant="titleSmall">Post Type</Text>
        <SegmentedButtons
          value={postType}
          onValueChange={value => setPostType(value as PostType)}
          buttons={[
            { value: 'vehicle', label: 'Vehicle' },
            { value: 'realestate', label: 'Real Estate' },
          ]}
          style={styles.segmentedButton}
        />
      </View>

      <Divider style={styles.divider} />

      {/* Location */}
      <View style={styles.section}>
        <Text variant="titleSmall">Location</Text>
        <Dropdown
          data={citiesData}
          value={selectedCity}
          onChange={setSelectedCity}
          placeholder="Select Location"
        />
      </View>

      <Divider style={styles.divider} />

      {/* Category */}
      <View style={styles.section}>
        <Text variant="titleSmall">Category</Text>
        <Dropdown
          data={postType === 'vehicle' ? vehicleCategoriesData : realEstateCategoriesData}
          value={selectedCategory}
          onChange={setSelectedCategory}
          placeholder="Select Category"
        />
      </View>

      <Divider style={styles.divider} />
    </>
  );

  const renderVehicleInputs = () => (
    <>
      {/* Make & Model */}
      <View style={styles.section}>
        <Text variant="titleSmall">Vehicle Details</Text>
        <View style={styles.dropdownGroup}>
          <Dropdown
            data={makesData}
            value={selectedMake}
            onChange={setSelectedMake}
            placeholder="Select Make"
          />
          <TextInput
            mode="outlined"
            label="Model"
            value={model}
            onChangeText={setModel}
            style={styles.input}
            dense
          />
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Fuel Type & Transmission */}
      <View style={styles.section}>
        <Text variant="titleSmall">Specifications</Text>
        <View style={styles.dropdownGroup}>
          <Dropdown
            data={fuelTypesData}
            value={selectedFuelType}
            onChange={setSelectedFuelType}
            placeholder="Select Fuel Type"
          />
        </View>
        <View style={styles.transmissionContainer}>
          <Text 
            variant="bodyMedium" 
            style={[styles.transmissionLabel, { color: theme.colors.onSurfaceVariant }]}
          >
            Transmission
          </Text>
          <SegmentedButtons
            value={transmission}
            onValueChange={value => setTransmission(value as 'manual' | 'automatic')}
            buttons={[
              { value: 'manual', label: 'Manual' },
              { value: 'automatic', label: 'Automatic' },
            ]}
            style={styles.segmentedButton}
          />
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Year Range Slider */}
      <View style={styles.section}>
        <Text variant="titleSmall">Year Range</Text>
        <View style={styles.yearContainer}>
          <View style={styles.yearLabels}>
            <Text style={[styles.yearText, { color: theme.colors.onSurfaceVariant }]}>
              {lowYear}
            </Text>
            <Text style={[styles.yearText, { color: theme.colors.onSurfaceVariant }]}>
              {highYear}
            </Text>
          </View>
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              min={1950}
              max={currentYear}
              step={1}
              floatingLabel
              renderThumb={() => (
                <View style={[styles.thumb, { backgroundColor: theme.colors.primary }]} />
              )}
              renderRail={() => (
                <View style={[styles.rail, { backgroundColor: theme.colors.outlineVariant }]} />
              )}
              renderRailSelected={() => (
                <View style={[styles.railSelected, { backgroundColor: theme.colors.primary }]} />
              )}
              onValueChanged={handleYearChange}
            />
          </View>
        </View>
      </View>
    </>
  );

  const renderRealEstateInputs = () => (
    <>
      {/* Size */}
      <View style={styles.section}>
        <Text variant="titleSmall">Size (sqm)</Text>
        <View style={styles.row}>
          <TextInput
            mode="outlined"
            label="Min"
            style={styles.input}
            keyboardType="numeric"
            dense
          />
          <Text style={styles.toText}>to</Text>
          <TextInput
            mode="outlined"
            label="Max"
            style={styles.input}
            keyboardType="numeric"
            dense
          />
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Features */}
      <View style={styles.section}>
        <Text variant="titleSmall">Features</Text>
        <View style={styles.chipGroup}>
          {PROPERTY_FEATURES.map((feature) => (
            <Chip
              key={feature}
              mode="outlined"
              style={styles.chip}
              onPress={() => {}}
            >
              {feature}
            </Chip>
          ))}
        </View>
      </View>
    </>
  );

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          height: containerHeight,
          backgroundColor: theme.colors.surface 
        }
      ]}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <TextInput
            mode="outlined"
            placeholder="Search posts by title..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            contentStyle={{ paddingLeft: 0 }}
            left={<TextInput.Icon icon="magnify" size={16} style={{ marginLeft: -4 }} />}
            right={searchQuery ? (
              <TextInput.Icon 
                icon="close" 
                size={14}
                onPress={() => {
                  setSearchQuery('');
                  onSearch?.('');
                }}
              />
            ) : null}
            dense
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
        <Button
          mode="contained-tonal"
          onPress={toggleExpand}
          style={styles.expandButton}
          labelStyle={{ fontSize: 13 }}
          contentStyle={{ flexDirection: 'row-reverse', height: 36 }}
          icon={({ size, color }) => (
            <MaterialCommunityIcons 
              name={isExpanded ? "chevron-up" : "chevron-right"} 
              size={16} 
              color={color} 
            />
          )}
        >
          Filter
        </Button>
      </View>

      {/* Expanded Content */}
      <ScrollView style={styles.expandedContent} contentContainerStyle={styles.scrollContent}>
        {/* Common Inputs */}
        {renderCommonInputs()}

        {/* Price Range (Common for both types) */}
        <View style={styles.section}>
          <Text variant="titleSmall">Price Range</Text>
          <View style={styles.row}>
            <TextInput
              mode="outlined"
              label="Min"
              style={styles.input}
              keyboardType="numeric"
              dense
            />
            <Text style={styles.toText}>to</Text>
            <TextInput
              mode="outlined"
              label="Max"
              style={styles.input}
              keyboardType="numeric"
              dense
            />
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Conditional Inputs */}
        {postType === 'vehicle' ? renderVehicleInputs() : renderRealEstateInputs()}
      </ScrollView>
    </Animated.View>
  );
} 