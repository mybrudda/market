import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';

interface ImagePickerSectionProps {
  images: string[];
  onPickImage: () => void;
  onRemoveImage: (index: number) => void;
  maxImages?: number;
}

const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

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
                source={`data:image/jpeg;base64,${base64Image}`}
                style={styles.image}
                contentFit="cover"
                transition={200}
                placeholder={blurhash}
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
    marginVertical: 16,
  },
  imageText: {
    marginBottom: 8,
  },
  scrollView: {
    flexGrow: 0,
  },
  imageContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  imageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  addButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 