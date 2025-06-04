import { View, StyleSheet, ScrollView, Animated, Dimensions, Pressable } from 'react-native';
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
  PROPERTY_FEATURES,
} from '../constants/FormOptions';

type PostType = 'vehicle' | 'realestate';
type ListingType = 'rent' | 'sale';

export interface FilterOptions {
  postType: PostType;
  listingType: ListingType;
  city: string | null;
  category: string | null;
  make: string | null;
  model: string;
  fuelType: string | null;
  transmission: 'Manual' | 'Automatic' | '';
  yearRange: {
    min: number;
    max: number;
  };
  priceRange: {
    min: string;
    max: string;
  };
  features: string[];
  size?: {
    min: string;
    max: string;
  };
}

interface FilterSectionProps {
  onSearch?: (query: string) => void;
  onFilter?: (filters: FilterOptions) => void;
  onLogoPress?: () => void;
}

const currentYear = new Date().getFullYear();
const initialFilters: FilterOptions = {
  postType: 'vehicle',
  listingType: 'sale',
  city: null,
  category: null,
  make: null,
  model: '',
  fuelType: null,
  transmission: '',
  yearRange: {
    min: currentYear - 20,
    max: currentYear,
  },
  priceRange: {
    min: '',
    max: '',
  },
  features: [],
  size: {
    min: '',
    max: '',
  },
};

export default function FilterSection({ onSearch, onFilter, onLogoPress }: FilterSectionProps) {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const expandAnimation = useRef(new Animated.Value(0)).current;
  const searchWidthAnimation = useRef(new Animated.Value(0)).current;
  const { height: windowHeight } = Dimensions.get('window');

  const handleYearChange = useCallback((low: number, high: number) => {
    setFilters(prev => ({
      ...prev,
      yearRange: {
        min: Math.floor(low),
        max: Math.floor(high),
      },
    }));
  }, []);

  const handlePriceChange = useCallback((field: 'min' | 'max', value: string) => {
    setFilters(prev => ({
      ...prev,
      priceRange: {
        ...prev.priceRange,
        [field]: value,
      },
    }));
  }, []);

  const handleSizeChange = useCallback((field: 'min' | 'max', value: string) => {
    setFilters(prev => ({
      ...prev,
      size: {
        ...prev.size!,
        [field]: value,
      },
    }));
  }, []);

  const toggleFeature = useCallback((feature: string) => {
    setFilters(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature],
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const handleApplyFilters = useCallback(() => {
    if (onFilter) {
      onFilter(filters);
    }
    setIsExpanded(false);
    
    // Animate the filter section closed
    Animated.spring(expandAnimation, {
      toValue: 0,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  }, [filters, onFilter, expandAnimation]);

  const handleTransmissionChange = useCallback((value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      transmission: value as 'Manual' | 'Automatic' | '' 
    }));
  }, []);

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

  const animateSearchWidth = (focused: boolean) => {
    Animated.spring(searchWidthAnimation, {
      toValue: focused ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    animateSearchWidth(true);
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    animateSearchWidth(false);
  };

  const searchContainerWidth = searchWidthAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['100%', '100%']
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
      height: 64,
      paddingHorizontal: 16,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      height: '100%',
      gap: 12,
    },
    logo: {
      marginRight: 4,
    },
    searchContainer: {
      flex: 1,
    },
    searchContainerFocused: {
      position: 'absolute',
      left: 0,
      right: 0,
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
    filterActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 16,
      gap: 12,
    },
    actionButton: {
      flex: 1,
    },
  });

  const renderCommonInputs = () => (
    <>
      {/* Listing Type */}
      <View style={styles.section}>
        <Text variant="titleSmall">Listing Type</Text>
        <SegmentedButtons
          value={filters.listingType}
          onValueChange={value => setFilters(prev => ({ ...prev, listingType: value as ListingType }))}
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
          value={filters.postType}
          onValueChange={value => setFilters(prev => ({ ...prev, postType: value as PostType }))}
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
          value={filters.city}
          onChange={value => setFilters(prev => ({ ...prev, city: value }))}
          placeholder="Select Location"
        />
      </View>

      <Divider style={styles.divider} />

      {/* Category */}
      <View style={styles.section}>
        <Text variant="titleSmall">Category</Text>
        <Dropdown
          data={filters.postType === 'vehicle' ? vehicleCategoriesData : realEstateCategoriesData}
          value={filters.category}
          onChange={value => setFilters(prev => ({ ...prev, category: value }))}
          placeholder="Select Category"
        />
      </View>

      <Divider style={styles.divider} />

      {/* Price Range */}
      <View style={styles.section}>
        <Text variant="titleSmall">Price Range</Text>
        <View style={styles.row}>
          <TextInput
            mode="outlined"
            label="Min"
            value={filters.priceRange.min}
            onChangeText={value => handlePriceChange('min', value)}
            style={styles.input}
            keyboardType="numeric"
            dense
          />
          <Text style={styles.toText}>to</Text>
          <TextInput
            mode="outlined"
            label="Max"
            value={filters.priceRange.max}
            onChangeText={value => handlePriceChange('max', value)}
            style={styles.input}
            keyboardType="numeric"
            dense
          />
        </View>
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
            value={filters.make}
            onChange={value => setFilters(prev => ({ ...prev, make: value }))}
            placeholder="Select Make"
          />
          <TextInput
            mode="outlined"
            label="Model"
            value={filters.model}
            onChangeText={value => setFilters(prev => ({ ...prev, model: value }))}
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
            value={filters.fuelType}
            onChange={value => setFilters(prev => ({ ...prev, fuelType: value }))}
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
            value={filters.transmission}
            onValueChange={value => handleTransmissionChange(value as 'Manual' | 'Automatic' | '')}
            buttons={[
              { value: 'Manual', label: 'Manual' },
              { value: 'Automatic', label: 'Automatic' },
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
              {filters.yearRange.min}
            </Text>
            <Text style={[styles.yearText, { color: theme.colors.onSurfaceVariant }]}>
              {filters.yearRange.max}
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
            value={filters.size?.min}
            onChangeText={value => handleSizeChange('min', value)}
            style={styles.input}
            keyboardType="numeric"
            dense
          />
          <Text style={styles.toText}>to</Text>
          <TextInput
            mode="outlined"
            label="Max"
            value={filters.size?.max}
            onChangeText={value => handleSizeChange('max', value)}
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
              selected={filters.features.includes(feature)}
              style={styles.chip}
              onPress={() => toggleFeature(feature)}
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
        <Animated.View style={[
          styles.headerContent,
          {
            width: searchContainerWidth,
          }
        ]}>
          {!isSearchFocused && (
            <Pressable onPress={onLogoPress}>
              <MaterialCommunityIcons
                name="shopping"
                size={24}
                color={theme.colors.primary}
                style={styles.logo}
              />
            </Pressable>
          )}
          <View style={[styles.searchContainer, isSearchFocused && styles.searchContainerFocused]}>
            <TextInput
              mode="outlined"
              placeholder="Search for posts..."
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
                  }}
                />
              ) : null}
              dense
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              onSubmitEditing={() => onSearch?.(searchQuery)}
              returnKeyType="search"
            />
          </View>
          {!isSearchFocused && (
            <Button
              mode="contained-tonal"
              onPress={toggleExpand}
              style={styles.expandButton}
              labelStyle={{ fontSize: 13 }}
              contentStyle={{ flexDirection: 'row-reverse', height: 36 }}
              icon={({ color }) => (
                <MaterialCommunityIcons 
                  name={isExpanded ? "chevron-up" : "chevron-right"} 
                  size={16} 
                  color={color} 
                />
              )}
            >
              Filter
            </Button>
          )}
        </Animated.View>
      </View>

      {/* Expanded Content */}
      <ScrollView style={styles.expandedContent} contentContainerStyle={styles.scrollContent}>
        {renderCommonInputs()}
        {filters.postType === 'vehicle' ? renderVehicleInputs() : renderRealEstateInputs()}
        
        {/* Filter Action Buttons */}
        <View style={styles.filterActions}>
          <Button
            mode="outlined"
            onPress={handleClearFilters}
            style={styles.actionButton}
          >
            Clear Filters
          </Button>
          <Button
            mode="contained"
            onPress={handleApplyFilters}
            style={styles.actionButton}
          >
            Apply Filters
          </Button>
        </View>
      </ScrollView>
    </Animated.View>
  );
} 