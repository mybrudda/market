import { View, StyleSheet, ScrollView, Animated, Dimensions, Pressable } from 'react-native';
import React, { useState, useRef, useCallback } from 'react';
import { Text, Button, useTheme, Chip, TextInput, Divider, SegmentedButtons } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from 'rn-range-slider';
import Dropdown from '../ui/Dropdown';
import { useVehicleModels } from '../../lib/hooks/useVehicleModels';
import {
  CITIES,
  CATEGORY_OPTIONS,
  MAKES,
  VEHICLE_FUEL_TYPES,
  VEHICLE_TRANSMISSION,
} from '../../constants/FormOptions';

type ListingType = 'rent' | 'sale';

export interface FilterOptions {
  listingType: ListingType;
  city: string | null;
  category: string | null;
  make: string | null;
  model: string | null;
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
}

interface FilterSectionProps {
  onSearch?: (query: string) => void;
  onFilter?: (filters: FilterOptions) => void;
  onLogoPress?: () => void;
}

const currentYear = new Date().getFullYear();
const initialFilters: FilterOptions = {
  listingType: 'sale',
  city: null,
  category: null,
  make: null,
  model: null,
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
  
  // Use the vehicle models hook for dynamic model fetching
  const { models, loadingModels } = useVehicleModels(filters.make || '');

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

  const handleFilterChange = useCallback((field: keyof FilterOptions, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleFeatureToggle = useCallback((feature: string) => {
    setFilters(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature],
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const applyFilters = useCallback(() => {
    onFilter?.(filters);
    setIsExpanded(false);
  }, [filters, onFilter]);

  const handleSearch = useCallback(() => {
    onSearch?.(searchQuery);
  }, [searchQuery, onSearch]);

  const toggleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    
    Animated.timing(expandAnimation, {
      toValue: newExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const animateSearchWidth = (focused: boolean) => {
    Animated.timing(searchWidthAnimation, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
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

  const maxHeight = expandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, windowHeight * 0.7],
  });

  const searchWidth = searchWidthAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['80%', '100%'],
  });

  const renderCommonInputs = () => (
    <View style={styles.inputSection}>
      <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        Basic Filters
      </Text>
      
      {/* Listing Type */}
      <View style={styles.inputGroup}>
        <Text variant="bodySmall" style={[styles.inputLabel, { color: theme.colors.onSurfaceVariant }]}>
          Listing Type
        </Text>
        <SegmentedButtons
          value={filters.listingType}
          onValueChange={(value) => handleFilterChange('listingType', value)}
          buttons={[
            { value: 'sale', label: 'Sale' },
            { value: 'rent', label: 'Rent' },
          ]}
          style={styles.segmentedButton}
        />
      </View>

      {/* City */}
      <View style={styles.inputGroup}>
        <Text variant="bodySmall" style={[styles.inputLabel, { color: theme.colors.onSurfaceVariant }]}>
          City
        </Text>
        <Dropdown
          data={CITIES.map(city => ({ label: city, value: city }))}
          value={filters.city}
          onChange={(value) => handleFilterChange('city', value)}
          placeholder="Select city"
        />
      </View>

      {/* Category */}
      <View style={styles.inputGroup}>
        <Text variant="bodySmall" style={[styles.inputLabel, { color: theme.colors.onSurfaceVariant }]}>
          Category
        </Text>
        <Dropdown
          data={CATEGORY_OPTIONS}
          value={filters.category}
          onChange={(value) => handleFilterChange('category', value)}
          placeholder="Select category"
        />
      </View>

      {/* Price Range */}
      <View style={styles.inputGroup}>
        <Text variant="bodySmall" style={[styles.inputLabel, { color: theme.colors.onSurfaceVariant }]}>
          Price Range
        </Text>
        <View style={styles.priceInputs}>
          <TextInput
            mode="outlined"
            label="Min"
            value={filters.priceRange.min}
            onChangeText={(value) => handlePriceChange('min', value)}
            keyboardType="numeric"
            style={styles.priceInput}
            dense
          />
          <TextInput
            mode="outlined"
            label="Max"
            value={filters.priceRange.max}
            onChangeText={(value) => handlePriceChange('max', value)}
            keyboardType="numeric"
            style={styles.priceInput}
            dense
          />
        </View>
      </View>
    </View>
  );

  const renderVehicleInputs = () => (
    <View style={styles.inputSection}>
      <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        Vehicle Details
      </Text>
      
      {/* Make */}
      <View style={styles.inputGroup}>
        <Text variant="bodySmall" style={[styles.inputLabel, { color: theme.colors.onSurfaceVariant }]}>
          Make
        </Text>
        <Dropdown
          data={MAKES.map(make => ({ label: make, value: make }))}
          value={filters.make}
          onChange={(value) => {
            handleFilterChange('make', value);
            handleFilterChange('model', null); // Reset model when make changes
          }}
          placeholder="Select make"
        />
      </View>

      {/* Model */}
      <View style={styles.inputGroup}>
        <Text variant="bodySmall" style={[styles.inputLabel, { color: theme.colors.onSurfaceVariant }]}>
          Model
        </Text>
        <Dropdown
          data={models.map(model => ({ label: model.toString(), value: model.toString() }))}
          value={filters.model}
          onChange={(value) => handleFilterChange('model', value)}
          placeholder={loadingModels ? "Loading..." : "Select model"}
          disabled={!filters.make || loadingModels}
        />
      </View>

      {/* Fuel Type */}
      <View style={styles.inputGroup}>
        <Text variant="bodySmall" style={[styles.inputLabel, { color: theme.colors.onSurfaceVariant }]}>
          Fuel Type
        </Text>
        <Dropdown
          data={VEHICLE_FUEL_TYPES.map(fuelType => ({ label: fuelType, value: fuelType }))}
          value={filters.fuelType}
          onChange={(value) => handleFilterChange('fuelType', value)}
          placeholder="Select fuel type"
        />
      </View>

      {/* Transmission */}
      <View style={styles.inputGroup}>
        <Text variant="bodySmall" style={[styles.inputLabel, { color: theme.colors.onSurfaceVariant }]}>
          Transmission
        </Text>
        <SegmentedButtons
          value={filters.transmission}
          onValueChange={(value) => handleFilterChange('transmission', value)}
          buttons={[
            { value: 'Manual', label: 'Manual' },
            { value: 'Automatic', label: 'Automatic' },
          ]}
          style={styles.segmentedButton}
        />
      </View>

      {/* Year Range */}
      <View style={styles.inputGroup}>
        <Text variant="bodySmall" style={[styles.inputLabel, { color: theme.colors.onSurfaceVariant }]}>
          Year Range: {filters.yearRange.min} - {filters.yearRange.max}
        </Text>
        <View style={styles.sliderContainer}>
          <Slider
            min={currentYear - 50}
            max={currentYear}
            low={filters.yearRange.min}
            high={filters.yearRange.max}
            step={1}
            onValueChanged={handleYearChange}
            renderThumb={() => <View style={[styles.thumb, { backgroundColor: theme.colors.primary }]} />}
            renderRail={() => <View style={[styles.rail, { backgroundColor: theme.colors.outlineVariant }]} />}
            renderRailSelected={() => <View style={[styles.railSelected, { backgroundColor: theme.colors.primary }]} />}
          />
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Animated.View style={[styles.searchInputContainer, { width: searchWidth }]}>
          <TextInput
            mode="outlined"
            placeholder="Search vehicles..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            onSubmitEditing={handleSearch}
            left={<TextInput.Icon icon="magnify" />}
            right={
              searchQuery.length > 0 ? (
                <TextInput.Icon icon="close" onPress={() => setSearchQuery('')} />
              ) : undefined
            }
            style={styles.searchInput}
            dense
          />
        </Animated.View>
        
        <Button
          mode="contained"
          onPress={toggleExpand}
          icon={isExpanded ? "chevron-up" : "chevron-down"}
          style={styles.filterButton}
        >
          Filters
        </Button>
      </View>

      {/* Expandable Filter Section */}
      <Animated.View style={[styles.expandableContent, { maxHeight }]}>
        <ScrollView 
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {renderCommonInputs()}
          <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
          {renderVehicleInputs()}
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              onPress={clearFilters}
              style={styles.clearButton}
            >
              Clear All
            </Button>
            <Button
              mode="contained"
              onPress={applyFilters}
              style={styles.applyButton}
            >
              Apply Filters
            </Button>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
  },
  searchInput: {
    backgroundColor: 'transparent',
  },
  filterButton: {
    borderRadius: 8,
  },
  expandableContent: {
    overflow: 'hidden',
  },
  scrollContent: {
    paddingTop: 16,
  },
  inputSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 6,
    fontWeight: '500',
  },
  dropdown: {
    backgroundColor: 'transparent',
  },
  segmentedButton: {
    marginTop: 4,
  },
  priceInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  priceInput: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sliderContainer: {
    marginTop: 8,
    paddingHorizontal: 8,
  },
  slider: {
    height: 40,
  },
  divider: {
    marginVertical: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 24,
  },
  clearButton: {
    flex: 1,
  },
  applyButton: {
    flex: 1,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
  },
  rail: {
    height: 6,
    borderRadius: 3,
  },
  railSelected: {
    height: 6,
    borderRadius: 3,
  },
}); 