import { View, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';

interface ImagePickerSectionProps {
  images: string[];
  onPickImage: () => void;
  onRemoveImage: (index: number) => void;
  maxImages?: number;
}

export default function ImagePickerSection({
  images,
  onPickImage,
  onRemoveImage,
  maxImages = 3,
}: ImagePickerSectionProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.imageText, { color: theme.colors.onSurfaceVariant }]}>
        Images ({images.length}/{maxImages})
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.imageContainer}>
          {images.map((base64Image, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${base64Image}` }}
                style={styles.image}
              />
              <IconButton
                icon="close"
                size={20}
                onPress={() => onRemoveImage(index)}
                style={styles.removeButton}
              />
            </View>
          ))}
          {images.length < maxImages && (
            <TouchableOpacity 
              style={[
                styles.addButton,
                { backgroundColor: theme.colors.surfaceVariant }
              ]} 
              onPress={onPickImage}
            >
              <Text>Add Image</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  imageText: {
    marginBottom: 8,
    fontSize: 14,
  },
  scrollView: {
    flexGrow: 0,
  },
  imageContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    margin: 0,
  },
  addButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 