import { StyleSheet } from 'react-native';
import { Card, Text, TextInput } from 'react-native-paper';
import React from 'react';
import DropdownComponent from '../ui/Dropdown';
import { CITIES } from '../../constants/FormOptions';

interface LocationSectionProps {
  location: {
    city: string;
    address?: string | null;
    country?: string;
  };
  errors: Record<string, string>;
  onLocationChange: (field: 'city' | 'address' | 'country', value: string) => void;
}

export default function LocationSection({
  location,
  errors,
  onLocationChange,
}: LocationSectionProps) {
  return (
    <Card style={styles.card}>
      <Card.Content style={styles.formContainer}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Location</Text>
        
        <DropdownComponent
          data={CITIES.map(city => ({ label: city, value: city }))}
          value={location.city}
          onChange={(value: string | null) => onLocationChange('city', value || '')}
          placeholder="City"
          error={errors['location.city']}
        />

        <TextInput
          label="Address (Optional)"
          value={location.address || ''}
          onChangeText={text => onLocationChange('address', text)}
          style={styles.input}
        />
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
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
}); 