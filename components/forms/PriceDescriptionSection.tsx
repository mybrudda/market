import { StyleSheet } from 'react-native';
import { Card, Text, TextInput, HelperText } from 'react-native-paper';
import React from 'react';

interface PriceDescriptionSectionProps {
  price: string;
  description: string;
  errors: Record<string, string>;
  onInputChange: (field: 'price' | 'description', value: string) => void;
}

export default function PriceDescriptionSection({
  price,
  description,
  errors,
  onInputChange,
}: PriceDescriptionSectionProps) {
  return (
    <Card style={styles.card}>
      <Card.Content style={styles.formContainer}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Price & Description</Text>
        
        <TextInput
          label="Price"
          value={price}
          onChangeText={text => onInputChange('price', text)}
          keyboardType="numeric"
          error={!!errors.price}
          style={styles.input}
        />
        {errors.price && (
          <HelperText type="error" visible={true}>
            {errors.price}
          </HelperText>
        )}

        <TextInput
          label="Description"
          value={description}
          onChangeText={text => onInputChange('description', text)}
          multiline
          numberOfLines={4}
          error={!!errors.description}
          style={[styles.input, styles.descriptionInput]}
          textAlignVertical="top"
        />
        {errors.description && (
          <HelperText type="error" visible={true}>
            {errors.description}
          </HelperText>
        )}
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
  descriptionInput: {
    minHeight: 100,
  },
}); 